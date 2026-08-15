import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { createConsumer, ensureTopicExists, disconnectProducer } from '../lib/kafka';
import { addWebhookJob, createWebhookWorker } from '../lib/queue';
import { Consumer } from 'kafkajs';
import { Worker } from 'bullmq';
import { canRequest, recordFailure, recordSuccess } from '../lib/circuitBreaker';
import { getSubscribedEndpoints, getEndpointMetadata } from '../lib/endpointCache';

let activeConsumer: Consumer | null = null;
let activeWorker: Worker | null = null;

interface DeliveryRecord {
  id: string;
  endpointId: string;
  eventId: string;
}

/**
 * Re-computes and synchronizes an Event's aggregate status, deliveredCount, and failedCount
 * from its source-of-truth EventDeliveryWebhook records.
 */
export async function syncEventState(eventId: string): Promise<void> {
  try {
    const deliveries = await prisma.eventDeliveryWebhook.findMany({
      where: { eventId },
      select: { status: true },
    });

    const totalDeliveries = deliveries.length;
    const deliveredCount = deliveries.filter((d) => d.status === 'DELIVERED').length;
    const deadCount = deliveries.filter((d) => d.status === 'DEAD').length;
    const inFlightCount = deliveries.filter(
      (d) => d.status === 'PENDING' || d.status === 'PROCESSING' || d.status === 'FAILED'
    ).length;

    let status: 'PENDING' | 'QUEUED' | 'PROCESSING' | 'DELIVERED' | 'PARTIAL_SUCCESS' | 'FAILED' = 'PROCESSING';

    if (totalDeliveries === 0) {
      status = 'DELIVERED';
    } else if (inFlightCount > 0) {
      status = 'PROCESSING';
    } else if (deliveredCount === totalDeliveries) {
      status = 'DELIVERED';
    } else if (deadCount === totalDeliveries) {
      status = 'FAILED';
    } else {
      // Mixed finished state: at least 1 delivered and at least 1 dead
      status = 'PARTIAL_SUCCESS';
    }

    await prisma.event.update({
      where: { id: eventId },
      data: {
        totalDeliveries,
        deliveredCount,
        failedCount: deadCount,
        status,
      },
    });
  } catch (error) {
    console.error(`Failed to sync event state for event [${eventId}]:`, error);
  }
}

export async function startBackgroundServices() {
  
  console.log('📡 Initializing background event processing services...');

  await ensureTopicExists('webhook-events');

  activeConsumer = createConsumer('hydra-delivery-group');

  try {
    await activeConsumer.connect();
    
    await activeConsumer.subscribe({ topic: 'webhook-events', fromBeginning: true });
    
    console.log('✅ Kafka Consumer connected and subscribed to [webhook-events].');

    await activeConsumer.run({
      autoCommit: false,
      eachMessage: async ({ topic, partition, message }) => {
        if (!message.value) return;

        try {
          const rawData = JSON.parse(message.value.toString());

          const { eventId, organizationId, eventType, payload } = rawData;
          
          console.log(`📥 Kafka Consumer: Processing event [${eventId}] (${eventType}) for org [${organizationId}]...`);

          const endpointIds = await getSubscribedEndpoints(organizationId, eventType);

          if (endpointIds.length > 0) {
            console.log(`🎯 Matched ${endpointIds.length} subscribed endpoint(s). Creating delivery webhooks...`);

            // Set totalDeliveries count & status = PROCESSING on parent Event
            await prisma.event.update({
              where: { id: eventId },
              data: { 
                status: 'PROCESSING',
                totalDeliveries: endpointIds.length,
              },
            });

            // 1. Blindly attempt to insert delivery records (ON CONFLICT DO NOTHING handles duplicates)
            await prisma.$queryRaw`
              INSERT INTO "EventDeliveryWebhook" (
                "id",
                "eventId",
                "endpointId",
                "status",
                "createdAt",
                "updatedAt"
              )
              VALUES ${Prisma.join(
                endpointIds.map(
                  (endpointId) => Prisma.sql`
                  (
                    ${'del_' + crypto.randomUUID().replace(/-/g, '')},
                    ${eventId},
                    ${endpointId},
                    'PENDING'::"DeliveryStatus",
                    NOW(),
                    NOW()
                  )
                `
                )
              )}
              ON CONFLICT ("eventId", "endpointId") DO NOTHING;
            `;

            // 2. Smart Re-fetch: Retrieve ALL PENDING delivery records for this event + endpoints.
            const pendingDeliveries = await prisma.eventDeliveryWebhook.findMany({
              where: {
                eventId,
                endpointId: { in: endpointIds },
                status: 'PENDING',
              },
              select: {
                id: true,
                endpointId: true,
                eventId: true,
              },
            });

            // 3. Enqueue all pending deliveries into BullMQ (deduplicated by delivery.id)
            for (const delivery of pendingDeliveries) {
              await addWebhookJob(delivery.id, {
                deliveryId: delivery.id,
                endpointId: delivery.endpointId,
                organizationId,
                payload,
                eventType,
              });
            }

            console.log(`✅ Fan-out complete: Queued ${pendingDeliveries.length} BullMQ webhook job(s).`);
          } else {
            console.log(`ℹ️ Kafka Consumer: 0 endpoints subscribed to event [${eventType}] for org [${organizationId}].`);
            await prisma.event.update({
              where: { id: eventId },
              data: {
                status: 'DELIVERED',
                totalDeliveries: 0,
                deliveredCount: 0,
                failedCount: 0,
              },
            });
          }

          if (activeConsumer) {
            await activeConsumer.commitOffsets([
              { topic, partition, offset: (BigInt(message.offset) + 1n).toString() },
            ]);
          }

        } catch (parseError) {
          console.error('❌ Failed to process Kafka message:', parseError);
        }
      },
    });

  } catch (kafkaError) {
    console.error('❌ Failed to start Kafka consumer:', kafkaError);
  }

  // BullMQ Worker to dispatch HTTP webhooks
  activeWorker = createWebhookWorker(async (job) => {

    const { deliveryId, endpointId, payload, eventType } = job.data;

    if (!deliveryId || !endpointId) return;

    // Atomically claim delivery if it is in DEAD or FAILED status (Manual Retry flow)
    const currentDelivery = await prisma.eventDeliveryWebhook.findUnique({
      where: { id: deliveryId },
      select: { status: true, eventId: true },
    });

    if (currentDelivery && (currentDelivery.status === 'DEAD' || currentDelivery.status === 'FAILED')) {
      const claimResult = await prisma.$executeRaw`
        UPDATE "EventDeliveryWebhook"
        SET "status" = 'PENDING'::"DeliveryStatus",
            "errorMessage" = NULL
        WHERE id = ${deliveryId}
          AND status IN ('DEAD'::"DeliveryStatus", 'FAILED'::"DeliveryStatus");
      `;

      if (claimResult === 0) {
        console.log(`ℹ️ Delivery [${deliveryId}] was already claimed or processed by another worker.`);
        return;
      }

      await syncEventState(currentDelivery.eventId);
    }

    const endpoint = await getEndpointMetadata(endpointId);

    if (!endpoint) {
      console.error(`❌ BullMQ: Endpoint metadata [${endpointId}] not found.`);
      return;
    }

    if (endpoint.isPaused || endpoint.status !== 'ACTIVE') {
      console.log(`ℹ️ Webhook delivery skipped. Endpoint [${endpointId}] is paused or disabled.`);
      return;
    }

    const allowed = await canRequest(endpointId);

    if (!allowed) {
      console.log(`⚡ Circuit Breaker OPEN for endpoint [${endpointId}]. Delivery request blocked until cooldown finishes.`);
      throw new Error(`Circuit Breaker is OPEN for endpoint [${endpointId}]. Request paused.`);
    }

    const timestamp = Date.now();
    const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
    
    const signature = crypto
      .createHmac('sha256', endpoint.secret)
      .update(signaturePayload)
      .digest('hex');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Hydra-Signature': `t=${timestamp},v1=${signature}`,
      'User-Agent': 'Hydra-Webhook-Dispatcher/1.0',
    };

    let httpStatusCode: number | null = null;
    let startedAt: Date | null = null;
    let completedAt: Date | null = null;
    let latencyMs: number | null = null;

    try {
      console.log(`🚀 Dispatching webhook event [${eventType}] to: ${endpoint.url}`);

      startedAt = new Date();
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });
      completedAt = new Date();
      latencyMs = completedAt.getTime() - startedAt.getTime();

      if (response.ok) {
        await recordSuccess(endpointId);

        const updatedDelivery = await prisma.eventDeliveryWebhook.update({
          where: { id: deliveryId },
          data: {
            status: 'DELIVERED',
            statusCode: response.status,
            attemptCount: { increment: 1 },
            deliveredAt: new Date(),
            startedAt,
            completedAt,
            latencyMs,
          },
          select: { eventId: true },
        });

        console.log(`✅ Webhook delivered successfully to ${endpoint.url}. Status: ${response.status}`);
        
        await syncEventState(updatedDelivery.eventId);

      } else {
        httpStatusCode = response.status;
        throw new Error(`Endpoint returned status code: ${response.status}`);
      }

    } catch (networkError: any) {
      if (!completedAt && startedAt) {
        completedAt = new Date();
        latencyMs = completedAt.getTime() - startedAt.getTime();
      }

      await recordFailure(endpointId);

      console.error(`❌ Webhook delivery attempt failed for ${endpoint.url}:`, networkError.message);
      
      const attemptsMade = job.attemptsMade + 1;
      const maxAttempts = job.opts.attempts || 5;
      
      // Non-retriable: 4xx Client Errors (e.g. 400, 401, 404) should fail permanently immediately
      const isNonRetriable = httpStatusCode !== null && httpStatusCode >= 400 && httpStatusCode < 500;
      const isFinalAttempt = isNonRetriable || (attemptsMade >= maxAttempts);
      const newDeliveryStatus = isFinalAttempt ? 'DEAD' : 'FAILED';

      const updatedDelivery = await prisma.eventDeliveryWebhook.update({
        where: { id: deliveryId },
        data: {
          status: newDeliveryStatus,
          statusCode: httpStatusCode,
          attemptCount: attemptsMade,
          errorMessage: networkError.message,
          startedAt,
          completedAt,
          latencyMs,
        },
        select: { eventId: true },
      });

      if (isFinalAttempt) {
        const reason = isNonRetriable 
          ? `Non-retriable 4xx response (${httpStatusCode})`
          : `exhausted all ${maxAttempts} attempts`;
        console.warn(`☠️ Delivery [${deliveryId}] ${reason}. Marked as DEAD in PostgreSQL.`);
      }

      await syncEventState(updatedDelivery.eventId);

      // Re-throw to trigger BullMQ retry ONLY if it is a retriable failure (5xx or network error) and attempts remain
      if (!isNonRetriable) {
        throw networkError;
      }
    }
  });
}

export async function stopBackgroundServices(): Promise<void> {
  console.log('🛑 Stopping background webhook worker services...');

  if (activeWorker) {
    console.log('⏳ Closing BullMQ worker...');
    try {
      await activeWorker.close();
      console.log('✅ BullMQ worker closed successfully.');
    } catch (err) {
      console.error('❌ Error closing BullMQ worker:', err);
    } finally {
      activeWorker = null;
    }
  }

  if (activeConsumer) {
    console.log('⏳ Disconnecting Kafka consumer...');
    try {
      await activeConsumer.disconnect();
      console.log('✅ Kafka consumer disconnected successfully.');
    } catch (err) {
      console.error('❌ Error disconnecting Kafka consumer:', err);
    } finally {
      activeConsumer = null;
    }
  }

  await disconnectProducer();
}



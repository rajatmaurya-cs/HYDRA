import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { createConsumer, ensureTopicExists } from '../lib/kafka';
import { addWebhookJob, createWebhookWorker } from '../lib/queue';
import { canRequest, recordFailure, recordSuccess } from '../lib/circuitBreaker';
import { getSubscribedEndpoints, getEndpointMetadata } from '../lib/endpointCache';

interface DeliveryRecord {
  id: string;
  endpointId: string;
  eventId: string;
}

// 1. Atomic SQL Increment for Successful Webhook Delivery
export async function incrementDeliveredCount(eventId: string): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE "Event"
      SET 
        "deliveredCount" = "deliveredCount" + 1,
        "status" = CASE 
          WHEN ("deliveredCount" + 1) = "totalDeliveries" THEN 'DELIVERED'::"EventStatus"
          WHEN ("deliveredCount" + 1 + "failedCount") = "totalDeliveries" THEN 'FAILED'::"EventStatus"
          ELSE 'PROCESSING'::"EventStatus"
        END
      WHERE id = ${eventId};
    `;
  } catch (error) {
    console.error(`Failed to increment deliveredCount for Event [${eventId}]:`, error);
  }
}

// 2. Atomic SQL Increment for Failed Webhook Delivery
export async function incrementFailedCount(eventId: string): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE "Event"
      SET 
        "failedCount" = "failedCount" + 1,
        "status" = CASE 
          WHEN ("deliveredCount" + "failedCount" + 1) = "totalDeliveries" 
               AND ("deliveredCount") = 0 THEN 'FAILED'::"EventStatus"
          WHEN ("deliveredCount" + "failedCount" + 1) = "totalDeliveries" THEN 'FAILED'::"EventStatus"
          ELSE 'PROCESSING'::"EventStatus"
        END
      WHERE id = ${eventId};
    `;
  } catch (error) {
    console.error(`Failed to increment failedCount for Event [${eventId}]:`, error);
  }
}

export async function startBackgroundServices() {
  
  console.log('📡 Initializing background event processing services...');

  await ensureTopicExists('webhook-events');

  const consumer = createConsumer('hydra-delivery-group');

  try {
    await consumer.connect();
    
    await consumer.subscribe({ topic: 'webhook-events', fromBeginning: true });
    
    console.log('✅ Kafka Consumer connected and subscribed to [webhook-events].');

    await consumer.run({
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

            // Atomic UPSERT + RETURNING delivery records
            const deliveryRecords = await prisma.$queryRaw<DeliveryRecord[]>`
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
              ON CONFLICT ("eventId", "endpointId") DO NOTHING
              RETURNING id, "endpointId", "eventId";
            `;

            for (const delivery of deliveryRecords) {
              await addWebhookJob(delivery.id, {
                deliveryId: delivery.id,
                endpointId: delivery.endpointId,
                organizationId,
                payload,
                eventType,
              });
            }

            console.log(`✅ Fan-out complete: Queued ${deliveryRecords.length} BullMQ webhook job(s).`);
          } else {
            console.log(`⚠️ Kafka Consumer: 0 endpoints subscribed to event [${eventType}] for org [${organizationId}].`);
          }

          await consumer.commitOffsets([
            { topic, partition, offset: (BigInt(message.offset) + 1n).toString() },
          ]);

        } catch (parseError) {
          console.error('❌ Failed to process Kafka message:', parseError);
        }
      },
    });

  } catch (kafkaError) {
    console.error('❌ Failed to start Kafka consumer:', kafkaError);
  }

  // BullMQ Worker to dispatch HTTP webhooks
  createWebhookWorker(async (job) => {
    const { deliveryId, endpointId, payload, eventType } = job.data;
    if (!deliveryId || !endpointId) return;

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
        
        // Atomic SQL counter increment for success
        await incrementDeliveredCount(updatedDelivery.eventId);

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
      const isFinalAttempt = attemptsMade >= maxAttempts;
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
        console.warn(`☠️ Delivery [${deliveryId}] exhausted all ${maxAttempts} attempts. Marked as DEAD in PostgreSQL.`);
        await incrementFailedCount(updatedDelivery.eventId);
      }

      throw networkError;
    }
  });
}

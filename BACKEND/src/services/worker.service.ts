import crypto from 'crypto';
import prisma from '../lib/prisma';
import { createConsumer, ensureTopicExists } from '../lib/kafka';
import { addWebhookJob, createWebhookWorker } from '../lib/queue';
import { canRequest, recordFailure, recordSuccess } from '../lib/circuitBreaker';
import { getSubscribedEndpoints, getEndpointMetadata } from '../lib/endpointCache';

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

          const endpointIds = await getSubscribedEndpoints(organizationId, eventType);

          if (endpointIds.length > 0) {
            await prisma.eventDeliveryWebhook.createMany({
              data: endpointIds.map((endpointId) => ({
                eventId,
                endpointId,
                status: 'PENDING',
              })),
              skipDuplicates: true,
            });

            const deliveryRecords = await prisma.eventDeliveryWebhook.findMany({
              where: {
                eventId,
                endpointId: { in: endpointIds },
              },
              select: {
                id: true,
                endpointId: true,
              },
            });

            for (const delivery of deliveryRecords) {
              await addWebhookJob(delivery.id, {
                deliveryId: delivery.id,
                endpointId: delivery.endpointId,
                organizationId,
                payload,
                eventType,
              });
            }
          }

          // Explicitly commit offset to Kafka ONLY AFTER bulk DB insert and BullMQ job creation succeed
          await consumer.commitOffsets([
            { topic, partition, offset: (BigInt(message.offset) + 1n).toString() },
          ]);

        } catch (parseError) {
          console.error('❌ Failed to process Kafka message:', parseError);
        }
      },
    });

  } catch (kafkaError) {
    console.error('❌ Failed to bootstrap Kafka consumer:', kafkaError);
  }

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

    try {
      console.log(`🚀 Dispatching webhook event [${eventType}] to: ${endpoint.url}`);

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await recordSuccess(endpointId);

        await prisma.eventDeliveryWebhook.update({
          where: { id: deliveryId },
          data: {
            status: 'DELIVERED',
            statusCode: response.status,
            attemptCount: { increment: 1 },
            deliveredAt: new Date(),
          },
        });
        console.log(`✅ Webhook delivered successfully to ${endpoint.url}. Status: ${response.status}`);
      } else {
        await recordFailure(endpointId);

        await prisma.eventDeliveryWebhook.update({
          where: { id: deliveryId },
          data: {
            status: 'FAILED',
            statusCode: response.status,
            attemptCount: { increment: 1 },
            errorMessage: `HTTP Status ${response.status}`,
          },
        });
        throw new Error(`Endpoint returned status code: ${response.status}`);
      }

    } catch (networkError: any) {
      await recordFailure(endpointId);

      console.error(`❌ Webhook delivery attempt failed for ${endpoint.url}:`, networkError.message);
      await prisma.eventDeliveryWebhook.update({
        where: { id: deliveryId },
        data: {
          status: 'FAILED',
          attemptCount: { increment: 1 },
          errorMessage: networkError.message,
        },
      });
      throw networkError;
    }
  });
}

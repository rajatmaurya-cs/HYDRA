import crypto from 'crypto';
import prisma from '../lib/prisma';
import { createConsumer, ensureTopicExists } from '../lib/kafka';
import { addWebhookJob, createWebhookWorker } from '../lib/queue';
import { canRequest, recordFailure, recordSuccess } from '../lib/circuitBreaker';

export async function startBackgroundServices() {
  console.log('📡 Initializing background event processing services...');

  await ensureTopicExists('webhook-events');

  const consumer = createConsumer('hydra-delivery-group');

  try {
    await consumer.connect();
    
    await consumer.subscribe({ topic: 'webhook-events', fromBeginning: true });
    
    console.log('✅ Kafka Consumer connected and subscribed to [webhook-events].');

    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;

        try {
          const rawData = JSON.parse(message.value.toString());
          
          const { eventId, organizationId, eventType, payload, idempotencyKey, clientTimestamp } = rawData;

          const endpoints = await prisma.endpoint.findMany({
            where: {
              organizationId,
              status: 'ACTIVE',
              isPaused: false,
              subscribedEvents: {
                has: eventType,
              }
            }
          });

          if (endpoints.length === 0) {
            console.log(`ℹ️ Event [${eventType}] has no active subscriptions for org [${organizationId}].`);
            return;
          }

          for (const endpoint of endpoints) {
            const dbEvent = await prisma.event.create({
              data: {
                id: `${eventId}_${endpoint.id}`,
                organizationId,
                endpointId: endpoint.id,
                eventType,
                payload,
                idempotencyKey: idempotencyKey || undefined,
                status: 'PENDING',
                metadata: clientTimestamp ? { clientTimestamp } : undefined,
              }
            });

            await addWebhookJob(dbEvent.id, { eventId: dbEvent.id });
          }

        } catch (parseError) {
          console.error('❌ Failed to process Kafka message:', parseError);
        }
      },
    });

  } catch (kafkaError) {
    console.error('❌ Failed to bootstrap Kafka consumer:', kafkaError);
  }

  createWebhookWorker(async (job) => {
    const { eventId } = job.data;
    if (!eventId) return;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { endpoint: true },
    });

    if (!event) {
      console.error(`❌ BullMQ: Event [${eventId}] not found in database.`);
      return;
    }

    if (event.endpoint.isPaused || event.endpoint.status !== 'ACTIVE') {
      console.log(`ℹ️ Webhook delivery skipped. Endpoint [${event.endpointId}] is paused or disabled.`);
      return;
    }

    const allowed = await canRequest(event.endpointId);
    if (!allowed) {
      console.log(`⚡ Circuit Breaker OPEN for endpoint [${event.endpointId}]. Delivery request blocked until cooldown finishes.`);
      throw new Error(`Circuit Breaker is OPEN for endpoint [${event.endpointId}]. Request paused.`);
    }

    await prisma.event.update({
      where: { id: event.id },
      data: { status: 'PROCESSING' },
    });

    const timestamp = Date.now();
    const signaturePayload = `${timestamp}.${JSON.stringify(event.payload)}`;
    
    const signature = crypto
      .createHmac('sha256', event.endpoint.secret)
      .update(signaturePayload)
      .digest('hex');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Hydra-Signature': `t=${timestamp},v1=${signature}`,
      'User-Agent': 'Hydra-Webhook-Dispatcher/1.0',
    };

    if (event.idempotencyKey) {
      headers['Idempotency-Key'] = event.idempotencyKey;
    }

    try {
      console.log(`🚀 Dispatching webhook event [${event.eventType}] to: ${event.endpoint.url}`);

      const response = await fetch(event.endpoint.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(event.payload),
      });

      if (response.ok) {
        await recordSuccess(event.endpointId);

        await prisma.event.update({
          where: { id: event.id },
          data: { status: 'DELIVERED' },
        });
        console.log(`✅ Webhook delivered successfully to ${event.endpoint.url}. Status: ${response.status}`);
      } else {
        await recordFailure(event.endpointId);

        await prisma.event.update({
          where: { id: event.id },
          data: { status: 'FAILED' },
        });
        throw new Error(`Endpoint returned status code: ${response.status}`);
      }

    } catch (networkError: any) {
      await recordFailure(event.endpointId);

      console.error(`❌ Webhook delivery attempt failed for ${event.endpoint.url}:`, networkError.message);
      await prisma.event.update({
        where: { id: event.id },
        data: { status: 'FAILED' },
      });
      throw networkError;
    }
  });
}

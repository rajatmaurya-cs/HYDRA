import crypto from 'crypto';
import prisma from '../lib/prisma';
import { createConsumer, ensureTopicExists } from '../lib/kafka';
import { addWebhookJob, createWebhookWorker } from '../lib/queue';

export async function startBackgroundServices() {
  console.log('📡 Initializing background event processing services...');

  // Ensure topic exists in Kafka before Consumer subscribes
  await ensureTopicExists('webhook-events');

  // 1. Initialize Kafka Consumer
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

          // Find all active endpoints subscribed to this event type
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

          // Process each endpoint subscription
          for (const endpoint of endpoints) {
            // Double-protection idempotency check at the DB level
            if (idempotencyKey) {
              const existingEvent = await prisma.event.findFirst({
                where: {
                  organizationId,
                  endpointId: endpoint.id,
                  idempotencyKey,
                }
              });

              if (existingEvent) {
                console.log(`⚠️ Event skipped. Idempotency duplicate found in DB for endpoint [${endpoint.id}].`);
                continue;
              }
            }

            // Create Event record in Postgres
            const dbEvent = await prisma.event.create({
              data: {
                id: `${eventId}_${endpoint.id}`, // Unique ID per target endpoint delivery
                organizationId,
                endpointId: endpoint.id,
                eventType,
                payload,
                idempotencyKey: idempotencyKey || undefined,
                status: 'PENDING',
                metadata: clientTimestamp ? { clientTimestamp } : undefined,
              }
            });

            // Enqueue delivery job in BullMQ
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

  // 2. Initialize BullMQ Worker
  createWebhookWorker(async (job) => {
    const { eventId } = job.data;
    if (!eventId) return;

    // Fetch event from Postgres
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

    // Mark event as processing
    await prisma.event.update({
      where: { id: event.id },
      data: { status: 'PROCESSING' },
    });

    // Prepare HTTP request webhook headers
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
        // Success
        await prisma.event.update({
          where: { id: event.id },
          data: { status: 'DELIVERED' },
        });
        console.log(`✅ Webhook delivered successfully to ${event.endpoint.url}. Status: ${response.status}`);
      } else {
        // Retry scenario: Non-2xx status
        await prisma.event.update({
          where: { id: event.id },
          data: { status: 'FAILED' },
        });
        throw new Error(`Endpoint returned status code: ${response.status}`);
      }

    } catch (networkError: any) {
      console.error(`❌ Webhook delivery attempt failed for ${event.endpoint.url}:`, networkError.message);
      await prisma.event.update({
        where: { id: event.id },
        data: { status: 'FAILED' },
      });
      // Rethrow error to trigger BullMQ's automatic backoff retry mechanism
      throw networkError;
    }
  });
}

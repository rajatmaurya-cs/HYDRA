import prisma from '../lib/prisma';
import { produceMessage } from '../lib/kafka';

const BATCH_SIZE = 50;
const POLL_INTERVAL_MS = 3000;

let isRelayRunning = false;

export async function processOutboxEvents() {
  if (isRelayRunning) return;
  isRelayRunning = true;

  try {
    const pendingOutboxEntries = await prisma.outbox.findMany({
      where: {
        status: {
          in: ['PENDING', 'FAILED'],
        },
        retryCount: {
          lt: 5,
        },
      },
      include: {
        event: true,
      },
      take: BATCH_SIZE,
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (pendingOutboxEntries.length === 0) {
      isRelayRunning = false;
      return;
    }

    for (const entry of pendingOutboxEntries) {
      try {
        await prisma.outbox.update({
          where: { id: entry.id },
          data: { status: 'PROCESSING' },
        });

        const ingestPayload = {
          eventId: entry.event.id,
          organizationId: entry.event.organizationId,
          eventType: entry.event.eventType,
          payload: entry.event.payload,
          idempotencyKey: entry.event.idempotencyKey || undefined,
          createdAt: entry.event.createdAt.toISOString(),
        };

        await produceMessage('webhook-events', ingestPayload, entry.event.idempotencyKey || entry.event.id);

        await prisma.outbox.update({
          where: { id: entry.id },
          data: {
            status: 'SENT',
            publishedAt: new Date(),
          },
        });

        console.log(`📤 Outbox Relay: Published event [${entry.eventId}] to Kafka successfully.`);

      } catch (error: any) {
        console.error(`❌ Outbox Relay: Failed to publish event [${entry.eventId}]:`, error.message);

        await prisma.outbox.update({
          where: { id: entry.id },
          data: {
            status: 'FAILED',
            retryCount: { increment: 1 },
          },
        });
      }
    }
  } catch (error) {
    console.error('❌ Outbox Relay loop error:', error);
  } finally {
    isRelayRunning = false;
  }
}

export function startOutboxRelay() {
  console.log('🚀 Starting Transactional Outbox Relay Service...');
  setInterval(() => {
    processOutboxEvents().catch((err) => {
      console.error('❌ Unhandled error in outbox relay:', err);
    });
  }, POLL_INTERVAL_MS);
}

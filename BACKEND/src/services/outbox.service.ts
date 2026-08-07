import prisma from '../lib/prisma';
import { produceMessage } from '../lib/kafka';

const BATCH_SIZE = 50;
const POLL_INTERVAL_MS = 3000;
const MAX_OUTBOX_RETRIES = 5;

let isRelayRunning = false;

interface OutboxWithEvent {
  id: string;
  eventId: string;
  status: string;
  retryCount: number;
  nextAttemptAt: Date | null;
  createdAt: Date;
  event: {
    id: string;
    organizationId: string;
    eventType: string;
    payload: any;
    idempotencyKey: string | null;
    createdAt: Date;
  };
}

function calculateExponentialBackoff(retryCount: number): Date {
  const baseDelaySeconds = 5;
  const backoffSeconds = baseDelaySeconds * Math.pow(2, retryCount);
  return new Date(Date.now() + backoffSeconds * 1000);
}

export async function processOutboxEvents() {
  if (isRelayRunning) return;
  isRelayRunning = true;

  try {
    const pendingOutboxEntries = await prisma.$transaction(async (tx) => {
      const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Outbox"
        WHERE status IN ('PENDING', 'FAILED')
          AND "retryCount" < ${MAX_OUTBOX_RETRIES}
          AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= NOW())
        ORDER BY "createdAt" ASC
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED;
      `;

      if (lockedRows.length === 0) return [];

      const ids = lockedRows.map((r) => r.id);

      await tx.outbox.updateMany({
        where: { id: { in: ids } },
        data: { status: 'PROCESSING' },
      });

      const entries = await tx.outbox.findMany({
        where: { id: { in: ids } },
        include: { event: true },
      });

      return entries as unknown as OutboxWithEvent[];
    });

    if (pendingOutboxEntries.length === 0) {
      isRelayRunning = false;
      return;
    }

    for (const entry of pendingOutboxEntries) {
      try {
        const ingestPayload = {
          eventId: entry.event.id,
          organizationId: entry.event.organizationId,
          eventType: entry.event.eventType,
          payload: entry.event.payload,
          idempotencyKey: entry.event.idempotencyKey || undefined,
          createdAt: entry.event.createdAt.toISOString(),
        };

        await produceMessage('webhook-events', ingestPayload, entry.event.idempotencyKey || entry.event.id);

        await prisma.$transaction([
          prisma.outbox.update({
            where: { id: entry.id },
            data: {
              status: 'SENT',
              publishedAt: new Date(),
            },
          }),
          prisma.event.update({
            where: { id: entry.event.id },
            data: {
              status: 'QUEUED',
            },
          }),
        ]);

        console.log(`📤 Outbox Relay: Published event [${entry.eventId}] to Kafka successfully.`);

      } catch (error: any) {
        const nextRetryCount = entry.retryCount + 1;
        const isMaxRetriesExhausted = nextRetryCount >= MAX_OUTBOX_RETRIES;

        if (isMaxRetriesExhausted) {
          console.error(
            `🚨 CRITICAL OUTBOX ALERT: Outbox record [${entry.id}] for event [${entry.eventId}] exhausted all ${MAX_OUTBOX_RETRIES} attempts. Moving to DEAD status.`
          );

          await prisma.outbox.update({
            where: { id: entry.id },
            data: {
              status: 'DEAD',
              retryCount: nextRetryCount,
              nextAttemptAt: null,
            },
          });
        } else {
          const nextAttemptAt = calculateExponentialBackoff(nextRetryCount);

          console.error(
            `❌ Outbox Relay: Failed to publish event [${entry.eventId}] (Attempt ${nextRetryCount}/${MAX_OUTBOX_RETRIES}). Retrying at ${nextAttemptAt.toISOString()}:`,
            error.message
          );

          await prisma.outbox.update({
            where: { id: entry.id },
            data: {
              status: 'FAILED',
              retryCount: nextRetryCount,
              nextAttemptAt,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error('❌ Outbox Relay loop error:', error);
  } finally {
    isRelayRunning = false;
  }
}

export async function replayDeadOutboxEvents(eventId?: string) {
  const filter = eventId ? { eventId, status: 'DEAD' as const } : { status: 'DEAD' as const };
  const updated = await prisma.outbox.updateMany({
    where: filter,
    data: {
      status: 'PENDING',
      retryCount: 0,
      nextAttemptAt: null,
    },
  });
  console.log(`🔄 Replayed ${updated.count} dead outbox entries back to PENDING.`);
  return updated.count;
}

export function startOutboxRelay() {
  console.log('🚀 Starting Transactional Outbox Relay Service...');
  setInterval(() => {
    processOutboxEvents().catch((err) => {
      console.error('❌ Unhandled error in outbox relay:', err);
    });
  }, POLL_INTERVAL_MS);
}

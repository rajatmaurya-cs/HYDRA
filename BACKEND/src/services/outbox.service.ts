import prisma from '../lib/prisma';
import { produceMessage } from '../lib/kafka';

const BATCH_SIZE = 1000;
const POLL_INTERVAL_MS = 250;
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

    const CHUNK_SIZE = 50;
    for (let i = 0; i < pendingOutboxEntries.length; i += CHUNK_SIZE) {
      const chunk = pendingOutboxEntries.slice(i, i + CHUNK_SIZE);

      const results = await Promise.allSettled(
        chunk.map(async (entry) => {
          const ingestPayload = {
            eventId: entry.event.id,
            organizationId: entry.event.organizationId,
            eventType: entry.event.eventType,
            payload: entry.event.payload,
            idempotencyKey: entry.event.idempotencyKey || undefined,
            createdAt: entry.event.createdAt.toISOString(),
          };

          await produceMessage(
            'webhook-events',
            ingestPayload,
            entry.event.idempotencyKey || entry.event.id
          );

          return entry;
        })
      );

      const successfulEntries: OutboxWithEvent[] = [];
      const failedEntries: { entry: OutboxWithEvent; error: any }[] = [];

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          successfulEntries.push(result.value);
        } else {
          failedEntries.push({
            entry: chunk[idx],
            error: result.reason,
          });
        }
      });

      // 🟢 Bulk update for successful sends in the chunk
      if (successfulEntries.length > 0) {
        const outboxIds = successfulEntries.map((e) => e.id);
        const eventIds = successfulEntries.map((e) => e.event.id);

        await prisma.$transaction([
          prisma.outbox.updateMany({
            where: { id: { in: outboxIds } },
            data: {
              status: 'SENT',
              publishedAt: new Date(),
            },
          }),
          prisma.event.updateMany({
            where: { id: { in: eventIds } },
            data: {
              status: 'QUEUED',
            },
          }),
        ]);

        console.log(
          `📤 Outbox Relay: Parallel published ${successfulEntries.length} event(s) to Kafka successfully.`
        );
      }

      // 🔴 Targeted handling for failed sends in the chunk
      for (const { entry, error } of failedEntries) {
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
            error?.message || error
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

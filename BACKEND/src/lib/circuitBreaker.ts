import { redisConnection } from './redis';

const FAILURE_THRESHOLD = 5;
const OPEN_TIMEOUT = 60000;
const SEVEN_DAYS_IN_SECONDS = 604800;

export async function canRequest(endpointId: string): Promise<boolean> {
  const key = `circuit:${endpointId}`;

  const circuit = await redisConnection.hgetall(key);

  if (!circuit || !circuit.state) {
    return true;
  }

  if (circuit.state === 'OPEN') {
    const now = Date.now();
    const openedAt = Number(circuit.openedAt || circuit.lastFailure || 0);

    if (now - openedAt > OPEN_TIMEOUT) {
      await redisConnection.hset(key, {
        state: 'HALF_OPEN',
      });
      console.log(`🟡 Circuit transitioned to HALF_OPEN for endpoint [${endpointId}]`);
      return true;
    }

    return false;
  }

  return true;
}

export async function recordFailure(endpointId: string): Promise<void> {
  const key = `circuit:${endpointId}`;

  const circuitExists = await redisConnection.exists(key);

  if (!circuitExists) {
    await redisConnection.hset(key, {
      state: 'CLOSED',
      failures: 1,
      lastFailure: Date.now().toString(),
    });
  } else {
    const failures = await redisConnection.hincrby(key, 'failures', 1);

    await redisConnection.hset(key, {
      lastFailure: Date.now().toString(),
    });

    if (failures >= FAILURE_THRESHOLD) {
      const now = Date.now().toString();
      await redisConnection.hset(key, {
        state: 'OPEN',
        openedAt: now,
      });

      await redisConnection.expire(key, SEVEN_DAYS_IN_SECONDS);

      console.log(`🔴 Circuit OPENED for endpoint [${endpointId}] (Failures: ${failures}, TTL: 7 days)`);
    }
  }
}

export async function recordSuccess(endpointId: string): Promise<void> {
  const key = `circuit:${endpointId}`;

  await redisConnection.del(key);
}

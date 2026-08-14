import { appRedis } from './redis';

const FAILURE_THRESHOLD = 5;
const OPEN_TIMEOUT = 60000; // 60 seconds cooldown before moving to HALF_OPEN
const HALF_OPEN_LEASE = 15000; // 15 seconds probe lease timeout

const canRequestLua = `
local state = redis.call("HGET", KEYS[1], "state")

-- No circuit exists -> CLOSED
if not state then
    return 1
end

-- Someone is testing in HALF_OPEN state
if state == "HALF_OPEN" then
    local halfOpenAt = tonumber(redis.call("HGET", KEYS[1], "halfOpenAt") or "0")
    local now = tonumber(ARGV[1])
    local halfOpenLease = tonumber(ARGV[3])

    -- If probe lease expired (worker crashed/hung), allow another worker to probe
    if (now - halfOpenAt) > halfOpenLease then
        redis.call("HSET", KEYS[1], "halfOpenAt", ARGV[1])
        return 1
    end

    return 0
end

-- CLOSED
if state == "CLOSED" then
    return 1
end

-- state == OPEN
local openedAt = tonumber(redis.call("HGET", KEYS[1], "openedAt") or "0")
local now = tonumber(ARGV[1])
local timeout = tonumber(ARGV[2])

if (now - openedAt) > timeout then
    redis.call("HSET", KEYS[1], "state", "HALF_OPEN")
    redis.call("HSET", KEYS[1], "halfOpenAt", ARGV[1])
    return 1
end

return 0
`;

export async function canRequest(endpointId: string): Promise<boolean> {
  const key = `circuit:${endpointId}`;
  const now = Date.now();

  const result = await appRedis.eval(
    canRequestLua,
    1,
    key,
    now.toString(),
    OPEN_TIMEOUT.toString(),
    HALF_OPEN_LEASE.toString()
  );

  return result === 1;
}

export async function recordFailure(endpointId: string): Promise<void> {
  const key = `circuit:${endpointId}`;

  const circuitExists = await appRedis.exists(key);

  if (!circuitExists) {
    await appRedis.hset(key, {
      state: 'CLOSED',
      failures: 1,
      lastFailure: Date.now().toString(),
    });
  } else {
    const failures = await appRedis.hincrby(key, 'failures', 1);

    await appRedis.hset(key, {
      lastFailure: Date.now().toString(),
    });

    if (failures >= FAILURE_THRESHOLD) {
      const now = Date.now().toString();
      await appRedis.hset(key, {
        state: 'OPEN',
        openedAt: now,
      });

      await appRedis.expire(key, 604800);

      console.log(`🔴 Circuit OPENED for endpoint [${endpointId}] (Failures: ${failures}, TTL: 7 days)`);
    }
  }
}

export async function recordSuccess(endpointId: string): Promise<void> {
  const key = `circuit:${endpointId}`;

  await appRedis.del(key);
}

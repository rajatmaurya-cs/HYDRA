import Redis from "ioredis";

export const queueRedis = new Redis(process.env.QUEUE_REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const appRedis = new Redis(process.env.APP_REDIS_URL!);

queueRedis.on('connect', () => {
  console.log('✅ Queue Redis connected successfully.');
});

queueRedis.on('error', (err) => {
  console.error('❌ Queue Redis connection error:', err);
});

appRedis.on('connect', () => {
  console.log('✅ App Redis connected successfully.');
});

appRedis.on('error', (err) => {
  console.error('❌ App Redis connection error:', err);
});

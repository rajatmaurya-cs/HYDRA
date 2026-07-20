import Redis from 'ioredis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379;
const redisPassword = process.env.REDIS_PASSWORD || undefined;

export const redisConnection = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null, // Critical requirement for BullMQ
});

redisConnection.on('connect', () => {
  console.log('✅ Redis connected successfully.');
});

redisConnection.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

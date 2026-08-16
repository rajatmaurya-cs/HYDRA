import Redis from "ioredis";

export const queueRedis = new Redis(process.env.QUEUE_REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const appRedis = new Redis(process.env.APP_REDIS_URL!);

queueRedis.on("connect", () => {
  console.log("✅ Queue Redis (Upstash Cloud) connected successfully.");
});

queueRedis.on("error", (err) => {
  console.error("❌ Queue Redis connection error:", err);
});

appRedis.on("connect", () => {
  console.log("✅ App Redis (Upstash Cloud) connected successfully.");
});

appRedis.on("error", (err) => {
  console.error("❌ App Redis connection error:", err);
});

export async function disconnectRedis(): Promise<void> {
  try {
    await Promise.all([queueRedis.quit(), appRedis.quit()]);
    console.log("✅ Redis connections closed successfully.");
  } catch (error) {
    console.error("❌ Failed to close Redis connections:", error);
  }
}

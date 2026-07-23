import { Queue, Worker, Job } from 'bullmq';
import { redisConnection } from './redis';

// Name of our webhook delivery queue
export const WEBHOOK_QUEUE_NAME = 'webhook-delivery-queue';

// 1. Initialize BullMQ Queue
export const webhookQueue = new Queue(WEBHOOK_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000, // Wait 5s, 10s, 20s...
    },
    removeOnComplete: true, // Auto clean successfully completed jobs
    removeOnFail: false,   // Keep failed jobs in DB for debug/history analysis
  },
});

// Helper utility to add jobs to the queue
export async function addWebhookJob(jobName: string, data: any) {
  try {
    const job = await webhookQueue.add(jobName, data);
    console.log(`✉️ Added job [${jobName}] to BullMQ with ID: ${job.id}`);
    return job;
  } catch (error) {
    console.error(`❌ Failed to add job to BullMQ queue:`, error);
    throw error;
  }
}

// 2. Initialize a base Worker template (to be implemented/registered by services)
export function createWebhookWorker(processor: (job: Job) => Promise<void>): Worker {
  
  const worker = new Worker(WEBHOOK_QUEUE_NAME, processor, {
    connection: redisConnection,
    concurrency: 10, // Process up to 10 jobs concurrently
  });

  worker.on('completed', (job: Job) => {
    console.log(`✅ BullMQ Worker: Job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`❌ BullMQ Worker: Job ${job?.id} failed with error:`, err.message);
  });

  return worker;
}

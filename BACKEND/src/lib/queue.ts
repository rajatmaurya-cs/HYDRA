import { Queue, Worker, Job } from 'bullmq';
import { queueRedis } from './redis';

export const WEBHOOK_QUEUE_NAME = 'webhook-delivery-queue';

export const webhookQueue = new Queue(WEBHOOK_QUEUE_NAME, {
  connection: queueRedis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

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

export function createWebhookWorker(processor: (job: Job) => Promise<void>): Worker {
  const worker = new Worker(WEBHOOK_QUEUE_NAME, processor, {
    connection: queueRedis,
    concurrency: 10,
  });

  worker.on('completed', (job: Job) => {
    console.log(`✅ BullMQ Worker: Job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`❌ BullMQ Worker: Job ${job?.id} failed (Attempt ${job?.attemptsMade}/${job?.opts.attempts || 5}):`, err.message);
  });

  return worker;
}

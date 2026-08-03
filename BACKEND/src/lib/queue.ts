import { Queue, Worker, Job } from 'bullmq';
import { queueRedis } from './redis';

export const WEBHOOK_QUEUE_NAME = 'webhook-delivery-queue';
export const DEAD_LETTER_QUEUE_NAME = 'webhook-dead-letter-queue';

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

export const deadLetterQueue = new Queue(DEAD_LETTER_QUEUE_NAME, {
  connection: queueRedis,
  defaultJobOptions: {
    removeOnComplete: false,
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

export async function moveToDeadLetterQueue(job: Job, failedReason: string) {
  try {
    const deadJob = await deadLetterQueue.add(
      `dead_${job.name}`,
      {
        originalJobId: job.id,
        name: job.name,
        data: job.data,
        opts: job.opts,
        failedReason,
        failedAt: new Date().toISOString(),
        attemptsMade: job.attemptsMade,
      },
      {
        jobId: `dead_${job.id}`,
      }
    );
    console.log(`☠️ Moved job [${job.id}] to Dead Letter Queue with ID: ${deadJob.id}`);
    return deadJob;
  } catch (error) {
    console.error(`❌ Failed to move job [${job.id}] to Dead Letter Queue:`, error);
    throw error;
  }
}

export async function retryDeadJob(deadJobId: string) {
  try {
    const deadJob = await deadLetterQueue.getJob(deadJobId);
    
    if (!deadJob) {
      throw new Error(`Dead letter job [${deadJobId}] not found.`);
    }

    const originalData = deadJob.data;

    const newJob = await webhookQueue.add(
      originalData.name || 'retry_job',
      originalData.data,
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    await deadJob.remove();
    console.log(`🔄 Retried dead job [${deadJobId}]. Created new active job ID: ${newJob.id}`);
    return newJob;
  } catch (error) {
    console.error(`❌ Failed to retry dead job [${deadJobId}]:`, error);
    throw error;
  }
}

export async function retryAllDeadJobs() {
  try {
    const deadJobs = await deadLetterQueue.getJobs(['completed', 'failed', 'waiting', 'delayed']);
    console.log(`🔄 Retrying ${deadJobs.length} dead letter jobs...`);
    
    const retriedJobs = [];
    for (const deadJob of deadJobs) {
      if (deadJob && deadJob.id) {
        const retried = await retryDeadJob(deadJob.id);
        retriedJobs.push(retried);
      }
    }
    return retriedJobs;
  } catch (error) {
    console.error(`❌ Failed to retry all dead jobs:`, error);
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

  worker.on('failed', async (job: Job | undefined, err: Error) => {
    console.error(`❌ BullMQ Worker: Job ${job?.id} failed with error:`, err.message);
    if (job) {
      const maxAttempts = job.opts.attempts || 1;
      if (job.attemptsMade >= maxAttempts) {
        console.log(`⚠️ Job ${job.id} exhausted all ${maxAttempts} attempts. Moving to Dead Letter Queue...`);
        await moveToDeadLetterQueue(job, err.message).catch((dlqErr) => {
          console.error(`❌ Error moving job ${job.id} to DLQ:`, dlqErr);
        });
      }
    }
  });

  return worker;
}

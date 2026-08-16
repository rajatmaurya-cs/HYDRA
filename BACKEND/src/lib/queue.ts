import { Queue, Worker, Job } from 'bullmq';
import prisma from './prisma';
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

export async function addWebhookJob(jobName: string, data: any, jobId?: string) {
  try {
    const job = await webhookQueue.add(

      jobName,

      data, {
      jobId: jobId || data?.deliveryId || undefined,

    });
    
    console.log(`✉️ Added job [${jobName}] to BullMQ with ID: ${job.id}`);
    return job;
  } catch (error) {
    console.error(`❌ Failed to add job to BullMQ queue:`, error);
    throw error;
  }
}


export async function reEnqueueDeadDelivery(deliveryId: string, organizationId?: string) {
  try {
    
    const delivery = await prisma.eventDeliveryWebhook.findUnique({
      where: { id: deliveryId },
      include: {
        event: {
          select: {
            organizationId: true,
            eventType: true,
            payload: true,
          },
        },
      },
    });

    if (!delivery) {
      throw new Error(`Delivery record [${deliveryId}] not found.`);
    }

    if (delivery.status !== 'DEAD' && delivery.status !== 'FAILED') {
      throw new Error(`Delivery record [${deliveryId}] is not in DEAD or FAILED status (Current: ${delivery.status}).`);
    }

    if (organizationId && delivery.event.organizationId !== organizationId) {
      throw new Error(`Forbidden: Delivery [${deliveryId}] does not belong to organization [${organizationId}].`);
    }

    
    const job = await addWebhookJob(delivery.id, {
      deliveryId: delivery.id,
      endpointId: delivery.endpointId,
      organizationId: delivery.event.organizationId,
      payload: delivery.event.payload,
      eventType: delivery.event.eventType,
      isRetry: true,
    });

    console.log(`🔄 Successfully enqueued Retry Job for Delivery [${deliveryId}] into BullMQ. Job ID: ${job.id}`);
    return job;

  } catch (error) {
    console.error(`❌ Failed to re-enqueue Dead Delivery [${deliveryId}]:`, error);
    throw error;
  }
}


export async function reEnqueueAllDeadDeliveries(organizationId: string) {
  try {
    
    const deadDeliveries = await prisma.eventDeliveryWebhook.findMany({
      where: {
        event: {
          organizationId,
        },
        status: 'DEAD',
      },
      select: {
        id: true,
      },
    });

    console.log(`🔄 Found ${deadDeliveries.length} DEAD deliveries for organization [${organizationId}]. Re-enqueuing...`);

    const reEnqueuedJobs = [];
    for (const d of deadDeliveries) {
      const job = await reEnqueueDeadDelivery(d.id, organizationId);
      reEnqueuedJobs.push(job);
    }

    return reEnqueuedJobs;
  } catch (error) {
    console.error(`❌ Failed to re-enqueue all Dead Deliveries for organization [${organizationId}]:`, error);
    throw error;
  }
}

const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '50', 10);

export function createWebhookWorker(processor: (job: Job) => Promise<void>): Worker {
  const worker = new Worker(WEBHOOK_QUEUE_NAME, processor, {
    connection: queueRedis,
    concurrency: WORKER_CONCURRENCY, 
  });

  worker.on('completed', (job: Job) => {
    console.log(`✅ BullMQ Worker: Job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    if (!job) return;
    const maxAttempts = job.opts.attempts || 5;
    console.error(`❌ BullMQ Worker: Job ${job.id} failed (Attempt ${job.attemptsMade}/${maxAttempts}): ${err.message}`);
  });

  return worker;
}

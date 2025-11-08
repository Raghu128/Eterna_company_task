import { Queue, QueueEvents } from 'bullmq';
import { redisConnection } from './redis';
import { config } from '../config';
import { Order } from '../types';
import { logger } from '../utils/logger';

export interface OrderJobData {
  order: Order;
}

// Create the order queue
export const orderQueue = new Queue<OrderJobData>('order-execution', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: config.retry.maxRetries,
    backoff: {
      type: 'exponential',
      delay: config.retry.initialDelay,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs
      age: 7 * 24 * 3600, // Keep for 7 days
    },
  },
});

// Queue events for monitoring
export const queueEvents = new QueueEvents('order-execution', {
  connection: redisConnection,
});

queueEvents.on('completed', ({ jobId }) => {
  logger.info({ jobId }, 'Job completed');
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error({ jobId, failedReason }, 'Job failed');
});

queueEvents.on('progress', ({ jobId, data }) => {
  logger.debug({ jobId, data }, 'Job progress');
});

// Add order to queue
export async function addOrderToQueue(order: Order): Promise<string> {
  const job = await orderQueue.add(
    'execute-order',
    { order },
    {
      jobId: order.orderId, // Use orderId as jobId for easy tracking
    }
  );

  logger.info(
    { orderId: order.orderId, jobId: job.id },
    'Order added to queue'
  );

  return job.id || order.orderId;
}

// Get queue metrics
export async function getQueueMetrics() {
  const [waiting, active, completed, failed] = await Promise.all([
    orderQueue.getWaitingCount(),
    orderQueue.getActiveCount(),
    orderQueue.getCompletedCount(),
    orderQueue.getFailedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    total: waiting + active + completed + failed,
  };
}

// Clean up old jobs
export async function cleanQueue() {
  await orderQueue.clean(24 * 3600 * 1000, 100, 'completed');
  await orderQueue.clean(7 * 24 * 3600 * 1000, 500, 'failed');
  logger.info('Queue cleaned');
}


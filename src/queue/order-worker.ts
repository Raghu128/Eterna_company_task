import { Worker, Job } from 'bullmq';
import { redisConnection, redisPubSub } from './redis';
import { OrderJobData } from './order-queue';
import { config } from '../config';
import { logger } from '../utils/logger';
import { OrderModel } from '../database/models/order.model';
import { ExecutionModel } from '../database/models/execution.model';
import { MockDexRouter } from '../dex/mock-dex-router';
import { OrderStatus, StatusUpdate } from '../types';
import { calculateExponentialBackoff } from '../utils/helpers';

const dexRouter = new MockDexRouter();

// Broadcast status update via Redis pub/sub
async function broadcastStatus(update: StatusUpdate) {
  await redisPubSub.publish(
    `order:${update.orderId}`,
    JSON.stringify(update)
  );
  logger.debug({ orderId: update.orderId, status: update.status }, 'Status broadcast');
}

// Create status update helper
function createStatusUpdate(
  orderId: string,
  status: OrderStatus,
  message?: string,
  data?: Record<string, any>
): StatusUpdate {
  return {
    orderId,
    status,
    message,
    data,
    timestamp: new Date(),
  };
}

// Process order job
async function processOrder(job: Job<OrderJobData>): Promise<void> {
  const { order } = job.data;
  const attemptNumber = job.attemptsMade + 1;

  logger.info(
    {
      orderId: order.orderId,
      attempt: attemptNumber,
      maxAttempts: config.retry.maxRetries,
    },
    'Processing order'
  );

  try {
    // Update progress to 10%
    await job.updateProgress(10);

    // Step 1: Mark as routing
    await OrderModel.updateStatus(order.orderId, OrderStatus.ROUTING);
    await broadcastStatus(
      createStatusUpdate(
        order.orderId,
        OrderStatus.ROUTING,
        'Comparing prices from Raydium and Meteora'
      )
    );

    // Get best quote from DEXs
    const { bestQuote, allQuotes } = await dexRouter.getBestQuote(
      order.tokenIn,
      order.tokenOut,
      order.amountIn
    );

    // Save all quotes to database
    for (const quote of allQuotes) {
      await ExecutionModel.saveQuote(order.orderId, quote);
    }

    await job.updateProgress(40);

    // Step 2: Mark as building
    await OrderModel.updateStatus(order.orderId, OrderStatus.BUILDING);
    await broadcastStatus(
      createStatusUpdate(
        order.orderId,
        OrderStatus.BUILDING,
        `Building transaction for ${bestQuote.dex}`,
        {
          selectedDex: bestQuote.dex,
          estimatedOutput: bestQuote.estimatedOutput,
          fee: bestQuote.fee,
        }
      )
    );

    await job.updateProgress(60);

    // Step 3: Mark as submitted
    await OrderModel.updateStatus(order.orderId, OrderStatus.SUBMITTED);
    await broadcastStatus(
      createStatusUpdate(
        order.orderId,
        OrderStatus.SUBMITTED,
        'Transaction submitted to blockchain'
      )
    );

    // Execute the swap
    const result = await dexRouter.executeSwap(bestQuote.dex, order, bestQuote);

    await job.updateProgress(90);

    // Step 4: Mark as confirmed
    await OrderModel.updateStatus(order.orderId, OrderStatus.CONFIRMED);
    await ExecutionModel.createExecution(result);

    await broadcastStatus(
      createStatusUpdate(
        order.orderId,
        OrderStatus.CONFIRMED,
        'Transaction confirmed successfully',
        {
          txHash: result.txHash,
          executedPrice: result.executedPrice,
          amountOut: result.amountOut,
          dex: result.dex,
        }
      )
    );

    await job.updateProgress(100);

    logger.info(
      {
        orderId: order.orderId,
        txHash: result.txHash.substring(0, 16) + '...',
        dex: result.dex,
      },
      'Order executed successfully'
    );
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error occurred';

    logger.error(
      {
        orderId: order.orderId,
        attempt: attemptNumber,
        error: errorMessage,
      },
      'Order execution failed'
    );

    // Check if we should retry
    if (attemptNumber < config.retry.maxRetries) {
      const nextDelay = calculateExponentialBackoff(
        attemptNumber,
        config.retry.initialDelay
      );
      const retryAt = new Date(Date.now() + nextDelay);

      await ExecutionModel.logRetry(
        order.orderId,
        attemptNumber,
        errorMessage,
        retryAt
      );

      await broadcastStatus(
        createStatusUpdate(
          order.orderId,
          OrderStatus.PENDING,
          `Retry attempt ${attemptNumber}/${config.retry.maxRetries} scheduled`,
          {
            error: errorMessage,
            retryAt: retryAt.toISOString(),
            nextDelay,
          }
        )
      );

      // Re-throw to trigger BullMQ retry
      throw error;
    } else {
      // Max retries reached, mark as failed
      await OrderModel.updateStatus(order.orderId, OrderStatus.FAILED);
      await ExecutionModel.createFailedExecution(order.orderId, errorMessage);

      await broadcastStatus(
        createStatusUpdate(
          order.orderId,
          OrderStatus.FAILED,
          'Order failed after maximum retry attempts',
          {
            error: errorMessage,
            attempts: attemptNumber,
          }
        )
      );

      logger.error(
        { orderId: order.orderId, attempts: attemptNumber },
        'Order permanently failed'
      );
    }
  }
}

// Create worker
export const orderWorker = new Worker<OrderJobData>(
  'order-execution',
  processOrder,
  {
    connection: redisConnection,
    concurrency: config.queue.maxConcurrentOrders,
    limiter: {
      max: config.queue.ordersPerMinute,
      duration: 60000, // per minute
    },
  }
);

orderWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Worker completed job');
});

orderWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Worker failed job');
});

orderWorker.on('error', (err) => {
  logger.error({ error: err.message }, 'Worker error');
});

logger.info(
  {
    concurrency: config.queue.maxConcurrentOrders,
    rateLimit: `${config.queue.ordersPerMinute}/min`,
  },
  'Order worker started'
);


import { addOrderToQueue, getQueueMetrics } from '../order-queue';
import { OrderType, OrderStatus } from '../../types';

// Mock Redis for testing
jest.mock('../redis', () => ({
  redisConnection: {
    on: jest.fn(),
    duplicate: jest.fn(() => ({
      on: jest.fn(),
    })),
  },
  redisPubSub: {
    on: jest.fn(),
    duplicate: jest.fn(() => ({
      subscribe: jest.fn(),
      on: jest.fn(),
      unsubscribe: jest.fn(),
      quit: jest.fn(),
    })),
    publish: jest.fn(),
  },
}));

describe('Order Queue', () => {
  describe('addOrderToQueue', () => {
    it('should add order to queue with correct structure', async () => {
      const order = {
        orderId: 'TEST-123',
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 100,
        orderType: OrderType.MARKET,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const jobId = await addOrderToQueue(order);
      expect(jobId).toBeTruthy();
    });
  });

  describe('getQueueMetrics', () => {
    it('should return queue metrics', async () => {
      const metrics = await getQueueMetrics();

      expect(metrics).toHaveProperty('waiting');
      expect(metrics).toHaveProperty('active');
      expect(metrics).toHaveProperty('completed');
      expect(metrics).toHaveProperty('failed');
      expect(metrics).toHaveProperty('total');

      expect(typeof metrics.waiting).toBe('number');
      expect(typeof metrics.active).toBe('number');
      expect(typeof metrics.completed).toBe('number');
      expect(typeof metrics.failed).toBe('number');
      expect(typeof metrics.total).toBe('number');
    });
  });
});


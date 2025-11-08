import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { OrderModel } from '../database/models/order.model';
import { addOrderToQueue, getQueueMetrics } from '../queue/order-queue';
import { OrderType, OrderStatus } from '../types';
import { generateOrderId } from '../utils/helpers';
import { logger } from '../utils/logger';
import { WebSocketService } from '../services/websocket.service';

// Validation schema
const orderSubmissionSchema = z.object({
  tokenIn: z.string().min(1, 'Token in is required'),
  tokenOut: z.string().min(1, 'Token out is required'),
  amountIn: z.number().positive('Amount must be positive'),
  orderType: z.nativeEnum(OrderType).default(OrderType.MARKET),
  slippage: z.number().min(0).max(1).optional().default(0.01),
});

export async function registerOrderRoutes(
  fastify: FastifyInstance,
  wsService: WebSocketService
) {
  /**
   * POST /api/orders/execute
   * Submit a new order for execution
   */
  fastify.post('/api/orders/execute', async (request, reply) => {
    try {
      // Validate request body
      const validation = orderSubmissionSchema.safeParse(request.body);
      
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const orderData = validation.data;

      // Generate order ID
      const orderId = generateOrderId();

      logger.info(
        {
          orderId,
          tokenIn: orderData.tokenIn,
          tokenOut: orderData.tokenOut,
          amountIn: orderData.amountIn,
        },
        'New order submission'
      );

      // Create order in database
      const order = await OrderModel.create({
        orderId,
        tokenIn: orderData.tokenIn,
        tokenOut: orderData.tokenOut,
        amountIn: orderData.amountIn,
        orderType: orderData.orderType,
        status: OrderStatus.PENDING,
      });

      // Add to queue
      await addOrderToQueue(order);

      // Return order ID for WebSocket connection
      return reply.status(201).send({
        orderId: order.orderId,
        status: order.status,
        message: 'Order submitted successfully. Connect via WebSocket for updates.',
        websocketUrl: `/api/orders/${orderId}/stream`,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Order submission failed');
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/orders/:orderId/stream (WebSocket)
   * Stream order status updates via WebSocket
   */
  fastify.get(
    '/api/orders/:orderId/stream',
    { websocket: true },
    async (socket, request) => {
      const { orderId } = request.params as { orderId: string };

      logger.info({ orderId }, 'WebSocket connection established');

      // Verify order exists
      const order = await OrderModel.findById(orderId);
      
      if (!order) {
        socket.socket.send(
          JSON.stringify({
            error: 'Order not found',
            orderId,
          })
        );
        socket.socket.close();
        return;
      }

      // Send current order status immediately
      socket.socket.send(
        JSON.stringify({
          orderId: order.orderId,
          status: order.status,
          message: 'Current order status',
          data: {
            tokenIn: order.tokenIn,
            tokenOut: order.tokenOut,
            amountIn: order.amountIn,
            orderType: order.orderType,
          },
          timestamp: new Date(),
        })
      );

      // Subscribe to order updates
      await wsService.subscribeToOrder(orderId, socket);
    }
  );

  /**
   * GET /api/orders/:orderId
   * Get order details
   */
  fastify.get('/api/orders/:orderId', async (request, reply) => {
    const { orderId } = request.params as { orderId: string };

    const order = await OrderModel.findById(orderId);

    if (!order) {
      return reply.status(404).send({
        error: 'Order not found',
        orderId,
      });
    }

    return reply.send(order);
  });

  /**
   * GET /api/orders
   * Get recent orders
   */
  fastify.get('/api/orders', async (request, reply) => {
    const { limit = 50 } = request.query as { limit?: number };

    const orders = await OrderModel.findRecent(Number(limit));

    return reply.send({
      orders,
      count: orders.length,
    });
  });

  /**
   * GET /api/health
   * Health check endpoint
   */
  fastify.get('/api/health', async (request, reply) => {
    const queueMetrics = await getQueueMetrics();
    const wsStats = wsService.getStats();

    return reply.send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      queue: queueMetrics,
      websocket: wsStats,
    });
  });
}


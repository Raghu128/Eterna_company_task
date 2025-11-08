import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { config } from './config';
import { registerOrderRoutes } from './routes/order.routes';
import { WebSocketService } from './services/websocket.service';
import { orderWorker } from './queue/order-worker';
import { pool } from './database/pool';

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: config.server.nodeEnv === 'development' ? 'debug' : 'info',
  },
  requestIdLogLabel: 'reqId',
  disableRequestLogging: false,
  trustProxy: true,
});

// Register WebSocket plugin
fastify.register(websocket, {
  options: {
    maxPayload: 1048576, // 1MB
    verifyClient: (info: any, next: any) => {
      // Add custom verification logic here if needed
      next(true);
    },
  },
});

// Initialize WebSocket service
let wsService: WebSocketService;

// Register routes after server is ready
fastify.register(async (instance) => {
  wsService = new WebSocketService(instance);
  await registerOrderRoutes(instance, wsService);
});

// Root endpoint
fastify.get('/', async (request, reply) => {
  return {
    service: 'Order Execution Engine',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      submitOrder: 'POST /api/orders/execute',
      orderStream: 'WS /api/orders/:orderId/stream',
      orderDetails: 'GET /api/orders/:orderId',
      recentOrders: 'GET /api/orders',
      health: 'GET /api/health',
    },
  };
});

// Graceful shutdown handler
async function closeGracefully(signal: string) {
  fastify.log.info(`Received ${signal}, closing gracefully...`);

  try {
    // Close worker
    await orderWorker.close();
    fastify.log.info('Worker closed');

    // Close database pool
    await pool.end();
    fastify.log.info('Database pool closed');

    // Close Fastify
    await fastify.close();
    fastify.log.info('Fastify closed');

    process.exit(0);
  } catch (error) {
    fastify.log.error({ error }, 'Error during graceful shutdown');
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => closeGracefully('SIGTERM'));
process.on('SIGINT', () => closeGracefully('SIGINT'));

// Start server
async function start() {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    fastify.log.info('Database connection established');

    // Start server
    await fastify.listen({
      port: config.server.port,
      host: '0.0.0.0',
    });

    fastify.log.info(
      `🚀 Server running at http://localhost:${config.server.port}`
    );
    fastify.log.info(`📊 WebSocket endpoint: ws://localhost:${config.server.port}`);
  } catch (error) {
    fastify.log.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Start the server
start();

export { fastify };


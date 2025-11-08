import { FastifyInstance } from 'fastify';
import { redisPubSub } from '../queue/redis';
import { logger } from '../utils/logger';
import { StatusUpdate } from '../types';

// WebSocket connection type
type WebSocketConnection = any;

export class WebSocketService {
  private connections: Map<string, Set<WebSocketConnection>> = new Map();
  private redisSubscribers: Map<string, any> = new Map();

  constructor(private fastify: FastifyInstance) {}

  /**
   * Subscribe to order status updates for a specific order
   */
  async subscribeToOrder(orderId: string, socket: WebSocketConnection) {
    // Add connection to tracking map
    if (!this.connections.has(orderId)) {
      this.connections.set(orderId, new Set());
    }
    this.connections.get(orderId)!.add(socket);

    logger.info({ orderId }, 'WebSocket client subscribed to order');

    // Create Redis subscriber if not exists
    if (!this.redisSubscribers.has(orderId)) {
      const subscriber = redisPubSub.duplicate();
      
      await subscriber.subscribe(`order:${orderId}`);

      subscriber.on('message', (channel, message) => {
        const update: StatusUpdate = JSON.parse(message);
        this.broadcastToOrder(orderId, update);
      });

      this.redisSubscribers.set(orderId, subscriber);
      logger.debug({ orderId }, 'Redis subscriber created for order');
    }

    // Handle disconnection
    socket.socket.on('close', () => {
      this.unsubscribe(orderId, socket);
    });

    socket.socket.on('error', (error: any) => {
      logger.error({ orderId, error }, 'WebSocket error');
      this.unsubscribe(orderId, socket);
    });

    // Send initial connection confirmation
    const initialMessage: StatusUpdate = {
      orderId,
      status: 'pending' as any,
      message: 'Connected to order status updates',
      timestamp: new Date(),
    };
    
    socket.socket.send(JSON.stringify(initialMessage));
  }

  /**
   * Broadcast status update to all clients subscribed to an order
   */
  private broadcastToOrder(orderId: string, update: StatusUpdate) {
    const connections = this.connections.get(orderId);
    
    if (!connections || connections.size === 0) {
      return;
    }

    const message = JSON.stringify(update);
    const deadConnections: WebSocketConnection[] = [];

    connections.forEach((socket) => {
      try {
        if (socket.socket.readyState === 1) {
          // 1 = OPEN
          socket.socket.send(message);
        } else {
          deadConnections.push(socket);
        }
      } catch (error) {
        logger.error({ orderId, error }, 'Failed to send message to client');
        deadConnections.push(socket);
      }
    });

    // Clean up dead connections
    deadConnections.forEach((socket) => {
      connections.delete(socket);
    });

    logger.debug(
      { orderId, status: update.status, activeConnections: connections.size },
      'Status update broadcast'
    );
  }

  /**
   * Unsubscribe a socket from order updates
   */
  private async unsubscribe(orderId: string, socket: WebSocketConnection) {
    const connections = this.connections.get(orderId);
    
    if (connections) {
      connections.delete(socket);
      logger.debug(
        { orderId, remainingConnections: connections.size },
        'WebSocket client unsubscribed'
      );

      // If no more connections, clean up Redis subscriber
      if (connections.size === 0) {
        this.connections.delete(orderId);
        
        const subscriber = this.redisSubscribers.get(orderId);
        if (subscriber) {
          await subscriber.unsubscribe(`order:${orderId}`);
          await subscriber.quit();
          this.redisSubscribers.delete(orderId);
          logger.debug({ orderId }, 'Redis subscriber removed');
        }
      }
    }
  }

  /**
   * Get current connection stats
   */
  getStats() {
    const totalConnections = Array.from(this.connections.values()).reduce(
      (sum, set) => sum + set.size,
      0
    );

    return {
      activeOrders: this.connections.size,
      totalConnections,
    };
  }
}


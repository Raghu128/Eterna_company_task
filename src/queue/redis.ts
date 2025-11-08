import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

// Create Redis connection for BullMQ
export const redisConnection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null,
});

redisConnection.on('connect', () => {
  logger.info('Redis connected successfully');
});

redisConnection.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

// Create separate Redis instance for pub/sub (WebSocket broadcasting)
export const redisPubSub = new Redis({
  host: config.redis.host,
  port: config.redis.port,
});


import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

// Create Redis connection for BullMQ
const redisConfig: any = {
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null,
};

// Add password only if provided
if (config.redis.password) {
  redisConfig.password = config.redis.password;
}

export const redisConnection = new Redis(redisConfig);

redisConnection.on('connect', () => {
  logger.info('Redis connected successfully');
});

redisConnection.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

// Create separate Redis instance for pub/sub (WebSocket broadcasting)
const redisPubSubConfig: any = {
  host: config.redis.host,
  port: config.redis.port,
};

// Add password only if provided
if (config.redis.password) {
  redisPubSubConfig.password = config.redis.password;
}

export const redisPubSub = new Redis(redisPubSubConfig);


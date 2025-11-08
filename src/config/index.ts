import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'order_execution_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  queue: {
    maxConcurrentOrders: parseInt(process.env.MAX_CONCURRENT_ORDERS || '10', 10),
    ordersPerMinute: parseInt(process.env.ORDERS_PER_MINUTE || '100', 10),
  },
  retry: {
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    initialDelay: parseInt(process.env.INITIAL_RETRY_DELAY || '1000', 10),
  },
  dex: {
    mockExecutionDelay: parseInt(process.env.MOCK_EXECUTION_DELAY || '2500', 10),
    priceVariance: parseFloat(process.env.PRICE_VARIANCE || '0.05'),
  },
};


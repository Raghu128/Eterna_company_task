import { pool, query } from './pool';
import { logger } from '../utils/logger';

const migrations = [
  {
    name: 'create_orders_table',
    sql: `
      CREATE TABLE IF NOT EXISTS orders (
        order_id VARCHAR(50) PRIMARY KEY,
        token_in VARCHAR(100) NOT NULL,
        token_out VARCHAR(100) NOT NULL,
        amount_in NUMERIC NOT NULL,
        order_type VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    `,
  },
  {
    name: 'create_execution_history_table',
    sql: `
      CREATE TABLE IF NOT EXISTS execution_history (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) REFERENCES orders(order_id),
        dex VARCHAR(20) NOT NULL,
        tx_hash VARCHAR(100),
        executed_price NUMERIC,
        amount_out NUMERIC,
        fee NUMERIC,
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_execution_order_id ON execution_history(order_id);
      CREATE INDEX IF NOT EXISTS idx_execution_status ON execution_history(status);
    `,
  },
  {
    name: 'create_dex_quotes_table',
    sql: `
      CREATE TABLE IF NOT EXISTS dex_quotes (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) REFERENCES orders(order_id),
        dex VARCHAR(20) NOT NULL,
        price NUMERIC NOT NULL,
        fee NUMERIC NOT NULL,
        estimated_output NUMERIC NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_quotes_order_id ON dex_quotes(order_id);
    `,
  },
  {
    name: 'create_retry_log_table',
    sql: `
      CREATE TABLE IF NOT EXISTS retry_log (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) REFERENCES orders(order_id),
        attempt INTEGER NOT NULL,
        error_message TEXT,
        retry_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_retry_order_id ON retry_log(order_id);
    `,
  },
];

async function runMigrations() {
  logger.info('Starting database migrations...');

  try {
    for (const migration of migrations) {
      logger.info(`Running migration: ${migration.name}`);
      await query(migration.sql);
      logger.info(`✓ Completed migration: ${migration.name}`);
    }

    logger.info('All migrations completed successfully!');
  } catch (error) {
    logger.error({ error }, 'Migration failed');
    throw error;
  } finally {
    // Only close pool if running as standalone script
    if (require.main === module) {
      await pool.end();
    }
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { runMigrations };


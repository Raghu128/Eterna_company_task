import { query } from '../pool';
import { ExecutionResult, DexType, OrderStatus, DexQuote } from '../../types';

export class ExecutionModel {
  static async createExecution(execution: ExecutionResult): Promise<void> {
    const sql = `
      INSERT INTO execution_history 
        (order_id, dex, tx_hash, executed_price, amount_out, fee, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await query(sql, [
      execution.orderId,
      execution.dex,
      execution.txHash,
      execution.executedPrice,
      execution.amountOut,
      execution.fee,
      OrderStatus.CONFIRMED,
    ]);
  }

  static async createFailedExecution(
    orderId: string,
    errorMessage: string
  ): Promise<void> {
    const sql = `
      INSERT INTO execution_history (order_id, dex, status, error_message)
      VALUES ($1, $2, $3, $4)
    `;
    
    await query(sql, [orderId, 'unknown', OrderStatus.FAILED, errorMessage]);
  }

  static async saveQuote(orderId: string, quote: DexQuote): Promise<void> {
    const sql = `
      INSERT INTO dex_quotes (order_id, dex, price, fee, estimated_output)
      VALUES ($1, $2, $3, $4, $5)
    `;
    
    await query(sql, [
      orderId,
      quote.dex,
      quote.price,
      quote.fee,
      quote.estimatedOutput,
    ]);
  }

  static async getExecutionHistory(orderId: string): Promise<any[]> {
    const sql = `
      SELECT * FROM execution_history 
      WHERE order_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await query(sql, [orderId]);
    return result.rows;
  }

  static async logRetry(
    orderId: string,
    attempt: number,
    errorMessage: string,
    retryAt: Date
  ): Promise<void> {
    const sql = `
      INSERT INTO retry_log (order_id, attempt, error_message, retry_at)
      VALUES ($1, $2, $3, $4)
    `;
    
    await query(sql, [orderId, attempt, errorMessage, retryAt]);
  }
}


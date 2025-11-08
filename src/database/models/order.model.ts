import { query } from '../pool';
import { Order, OrderStatus, OrderType } from '../../types';

export class OrderModel {
  static async create(order: Omit<Order, 'createdAt' | 'updatedAt'>): Promise<Order> {
    const sql = `
      INSERT INTO orders (order_id, token_in, token_out, amount_in, order_type, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await query(sql, [
      order.orderId,
      order.tokenIn,
      order.tokenOut,
      order.amountIn,
      order.orderType,
      order.status,
    ]);

    return this.mapRow(result.rows[0]);
  }

  static async findById(orderId: string): Promise<Order | null> {
    const sql = 'SELECT * FROM orders WHERE order_id = $1';
    const result = await query(sql, [orderId]);
    
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  static async updateStatus(orderId: string, status: OrderStatus): Promise<void> {
    const sql = `
      UPDATE orders 
      SET status = $1, updated_at = NOW() 
      WHERE order_id = $2
    `;
    await query(sql, [status, orderId]);
  }

  static async findByStatus(status: OrderStatus): Promise<Order[]> {
    const sql = 'SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC';
    const result = await query(sql, [status]);
    return result.rows.map(this.mapRow);
  }

  static async findRecent(limit: number = 50): Promise<Order[]> {
    const sql = 'SELECT * FROM orders ORDER BY created_at DESC LIMIT $1';
    const result = await query(sql, [limit]);
    return result.rows.map(this.mapRow);
  }

  private static mapRow(row: any): Order {
    return {
      orderId: row.order_id,
      tokenIn: row.token_in,
      tokenOut: row.token_out,
      amountIn: parseFloat(row.amount_in),
      orderType: row.order_type as OrderType,
      status: row.status as OrderStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}


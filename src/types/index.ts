export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  SNIPER = 'sniper',
}

export enum OrderStatus {
  PENDING = 'pending',
  ROUTING = 'routing',
  BUILDING = 'building',
  SUBMITTED = 'submitted',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

export enum DexType {
  RAYDIUM = 'raydium',
  METEORA = 'meteora',
}

export interface Order {
  orderId: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  orderType: OrderType;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DexQuote {
  dex: DexType;
  price: number;
  fee: number;
  estimatedOutput: number;
  timestamp: Date;
}

export interface ExecutionResult {
  orderId: string;
  dex: DexType;
  txHash: string;
  executedPrice: number;
  amountOut: number;
  fee: number;
  timestamp: Date;
}

export interface OrderSubmission {
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  orderType: OrderType;
  slippage?: number;
}

export interface StatusUpdate {
  orderId: string;
  status: OrderStatus;
  message?: string;
  data?: Record<string, any>;
  timestamp: Date;
}

export interface RetryContext {
  attempt: number;
  lastError?: string;
  nextRetryAt?: Date;
}


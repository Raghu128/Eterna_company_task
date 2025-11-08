import { DexQuote, DexType, ExecutionResult, Order } from '../types';
import { config } from '../config';
import { sleep, generateTxHash, formatPrice } from '../utils/helpers';
import { logger } from '../utils/logger';

export class MockDexRouter {
  private basePrice: number = 0.01; // Base price for token swaps

  /**
   * Get a quote from Raydium DEX
   * Simulates network delay and returns price with variance
   */
  async getRaydiumQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<DexQuote> {
    // Simulate network delay (200-300ms)
    await sleep(200 + Math.random() * 100);

    // Calculate price with slight variance (typically slightly lower than Meteora)
    const priceVariance = 0.98 + Math.random() * 0.04; // 0.98 to 1.02
    const price = this.basePrice * priceVariance;
    const fee = 0.003; // 0.3% fee for Raydium
    const estimatedOutput = amountIn * price * (1 - fee);

    logger.debug(
      {
        dex: 'Raydium',
        tokenIn,
        tokenOut,
        amountIn,
        price: formatPrice(price),
        fee,
        estimatedOutput: formatPrice(estimatedOutput),
      },
      'Raydium quote received'
    );

    return {
      dex: DexType.RAYDIUM,
      price,
      fee,
      estimatedOutput,
      timestamp: new Date(),
    };
  }

  /**
   * Get a quote from Meteora DEX
   * Simulates network delay and returns price with variance
   */
  async getMeteorQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<DexQuote> {
    // Simulate network delay (200-300ms)
    await sleep(200 + Math.random() * 100);

    // Calculate price with variance (typically slightly higher than Raydium)
    const priceVariance = 0.97 + Math.random() * 0.05; // 0.97 to 1.02
    const price = this.basePrice * priceVariance;
    const fee = 0.002; // 0.2% fee for Meteora (lower fee)
    const estimatedOutput = amountIn * price * (1 - fee);

    logger.debug(
      {
        dex: 'Meteora',
        tokenIn,
        tokenOut,
        amountIn,
        price: formatPrice(price),
        fee,
        estimatedOutput: formatPrice(estimatedOutput),
      },
      'Meteora quote received'
    );

    return {
      dex: DexType.METEORA,
      price,
      fee,
      estimatedOutput,
      timestamp: new Date(),
    };
  }

  /**
   * Compare quotes from both DEXs and select the best one
   */
  async getBestQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<{ bestQuote: DexQuote; allQuotes: DexQuote[] }> {
    logger.info(
      { tokenIn, tokenOut, amountIn },
      'Fetching quotes from both DEXs'
    );

    // Fetch quotes from both DEXs in parallel
    const [raydiumQuote, meteoraQuote] = await Promise.all([
      this.getRaydiumQuote(tokenIn, tokenOut, amountIn),
      this.getMeteorQuote(tokenIn, tokenOut, amountIn),
    ]);

    const allQuotes = [raydiumQuote, meteoraQuote];

    // Select the quote with highest estimated output
    const bestQuote =
      raydiumQuote.estimatedOutput > meteoraQuote.estimatedOutput
        ? raydiumQuote
        : meteoraQuote;

    const priceDiff = Math.abs(
      ((raydiumQuote.price - meteoraQuote.price) / raydiumQuote.price) * 100
    );

    logger.info(
      {
        raydium: {
          price: formatPrice(raydiumQuote.price),
          output: formatPrice(raydiumQuote.estimatedOutput),
        },
        meteora: {
          price: formatPrice(meteoraQuote.price),
          output: formatPrice(meteoraQuote.estimatedOutput),
        },
        selected: bestQuote.dex,
        priceDifference: `${priceDiff.toFixed(2)}%`,
      },
      'DEX routing decision'
    );

    return { bestQuote, allQuotes };
  }

  /**
   * Execute swap on the selected DEX
   * Simulates transaction submission and confirmation
   */
  async executeSwap(
    dex: DexType,
    order: Order,
    quote: DexQuote
  ): Promise<ExecutionResult> {
    logger.info(
      { orderId: order.orderId, dex, tokenIn: order.tokenIn, tokenOut: order.tokenOut },
      'Executing swap on DEX'
    );

    // Simulate transaction building and submission delay (2-3 seconds)
    const executionDelay =
      config.dex.mockExecutionDelay + Math.random() * 1000;
    await sleep(executionDelay);

    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
      throw new Error('Transaction simulation failed: Network timeout');
    }

    // Calculate final execution price (slight variance from quote)
    const priceSlippage = 0.995 + Math.random() * 0.01; // 0.5-1.5% slippage
    const executedPrice = quote.price * priceSlippage;
    const amountOut = order.amountIn * executedPrice * (1 - quote.fee);

    const result: ExecutionResult = {
      orderId: order.orderId,
      dex,
      txHash: generateTxHash(),
      executedPrice,
      amountOut,
      fee: quote.fee,
      timestamp: new Date(),
    };

    logger.info(
      {
        orderId: order.orderId,
        dex,
        txHash: result.txHash.substring(0, 16) + '...',
        executedPrice: formatPrice(executedPrice),
        amountOut: formatPrice(amountOut),
      },
      'Swap executed successfully'
    );

    return result;
  }

  /**
   * Main routing and execution function
   */
  async routeAndExecute(order: Order): Promise<ExecutionResult> {
    // Step 1: Get quotes from both DEXs
    const { bestQuote, allQuotes } = await this.getBestQuote(
      order.tokenIn,
      order.tokenOut,
      order.amountIn
    );

    // Step 2: Execute on the best DEX
    const result = await this.executeSwap(bestQuote.dex, order, bestQuote);

    return result;
  }
}


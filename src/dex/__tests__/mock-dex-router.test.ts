import { MockDexRouter } from '../mock-dex-router';
import { DexType, OrderType, OrderStatus } from '../../types';

describe('MockDexRouter', () => {
  let router: MockDexRouter;

  beforeEach(() => {
    router = new MockDexRouter();
  });

  describe('getRaydiumQuote', () => {
    it('should return a valid Raydium quote', async () => {
      const quote = await router.getRaydiumQuote('SOL', 'USDC', 100);

      expect(quote.dex).toBe(DexType.RAYDIUM);
      expect(quote.price).toBeGreaterThan(0);
      expect(quote.fee).toBe(0.003);
      expect(quote.estimatedOutput).toBeGreaterThan(0);
      expect(quote.timestamp).toBeInstanceOf(Date);
    });

    it('should simulate network delay', async () => {
      const startTime = Date.now();
      await router.getRaydiumQuote('SOL', 'USDC', 100);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(200);
    });
  });

  describe('getMeteorQuote', () => {
    it('should return a valid Meteora quote', async () => {
      const quote = await router.getMeteorQuote('SOL', 'USDC', 100);

      expect(quote.dex).toBe(DexType.METEORA);
      expect(quote.price).toBeGreaterThan(0);
      expect(quote.fee).toBe(0.002);
      expect(quote.estimatedOutput).toBeGreaterThan(0);
      expect(quote.timestamp).toBeInstanceOf(Date);
    });

    it('should have lower fee than Raydium', async () => {
      const meteoraQuote = await router.getMeteorQuote('SOL', 'USDC', 100);
      const raydiumQuote = await router.getRaydiumQuote('SOL', 'USDC', 100);

      expect(meteoraQuote.fee).toBeLessThan(raydiumQuote.fee);
    });
  });

  describe('getBestQuote', () => {
    it('should fetch quotes from both DEXs', async () => {
      const result = await router.getBestQuote('SOL', 'USDC', 100);

      expect(result.allQuotes).toHaveLength(2);
      expect(result.allQuotes[0].dex).toBe(DexType.RAYDIUM);
      expect(result.allQuotes[1].dex).toBe(DexType.METEORA);
    });

    it('should select the quote with better output', async () => {
      const result = await router.getBestQuote('SOL', 'USDC', 100);

      const bestOutput = Math.max(
        ...result.allQuotes.map((q) => q.estimatedOutput)
      );

      expect(result.bestQuote.estimatedOutput).toBe(bestOutput);
    });

    it('should select best quote consistently', async () => {
      const result = await router.getBestQuote('SOL', 'USDC', 100);

      expect([DexType.RAYDIUM, DexType.METEORA]).toContain(
        result.bestQuote.dex
      );
    });
  });

  describe('executeSwap', () => {
    it('should execute swap successfully', async () => {
      const order = {
        orderId: 'TEST-123',
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 100,
        orderType: OrderType.MARKET,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const quote = await router.getRaydiumQuote('SOL', 'USDC', 100);
      const result = await router.executeSwap(DexType.RAYDIUM, order, quote);

      expect(result.orderId).toBe(order.orderId);
      expect(result.dex).toBe(DexType.RAYDIUM);
      expect(result.txHash).toBeTruthy();
      expect(result.txHash.length).toBeGreaterThan(50);
      expect(result.executedPrice).toBeGreaterThan(0);
      expect(result.amountOut).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should simulate execution delay', async () => {
      const order = {
        orderId: 'TEST-123',
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 100,
        orderType: OrderType.MARKET,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const quote = await router.getRaydiumQuote('SOL', 'USDC', 100);
      const startTime = Date.now();
      await router.executeSwap(DexType.RAYDIUM, order, quote);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(2000);
    });

    it('should apply slippage to execution price', async () => {
      const order = {
        orderId: 'TEST-123',
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 100,
        orderType: OrderType.MARKET,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const quote = await router.getRaydiumQuote('SOL', 'USDC', 100);
      const result = await router.executeSwap(DexType.RAYDIUM, order, quote);

      // Executed price should be within reasonable slippage range
      const priceDiff = Math.abs(result.executedPrice - quote.price) / quote.price;
      expect(priceDiff).toBeLessThan(0.02); // Less than 2% slippage
    });
  });

  describe('routeAndExecute', () => {
    it('should complete full routing and execution flow', async () => {
      const order = {
        orderId: 'TEST-123',
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 100,
        orderType: OrderType.MARKET,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await router.routeAndExecute(order);

      expect(result.orderId).toBe(order.orderId);
      expect([DexType.RAYDIUM, DexType.METEORA]).toContain(result.dex);
      expect(result.txHash).toBeTruthy();
      expect(result.executedPrice).toBeGreaterThan(0);
      expect(result.amountOut).toBeGreaterThan(0);
    });
  });
});


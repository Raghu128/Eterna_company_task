import {
  generateOrderId,
  generateTxHash,
  sleep,
  calculateExponentialBackoff,
  formatPrice,
} from '../helpers';

describe('Helper Functions', () => {
  describe('generateOrderId', () => {
    it('should generate a unique order ID', () => {
      const id1 = generateOrderId();
      const id2 = generateOrderId();

      expect(id1).toMatch(/^ORD-[A-Za-z0-9_-]{12}$/);
      expect(id2).toMatch(/^ORD-[A-Za-z0-9_-]{12}$/);
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with correct prefix', () => {
      const id = generateOrderId();
      expect(id.startsWith('ORD-')).toBe(true);
    });
  });

  describe('generateTxHash', () => {
    it('should generate a transaction hash', () => {
      const hash = generateTxHash();

      expect(hash).toBeTruthy();
      expect(hash.length).toBe(88);
    });

    it('should generate unique hashes', () => {
      const hash1 = generateTxHash();
      const hash2 = generateTxHash();

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('sleep', () => {
    it('should sleep for specified duration', async () => {
      const startTime = Date.now();
      await sleep(100);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(95); // Allow small tolerance
      expect(elapsed).toBeLessThan(150);
    });
  });

  describe('calculateExponentialBackoff', () => {
    it('should calculate correct backoff for attempt 1', () => {
      const backoff = calculateExponentialBackoff(1, 1000);
      expect(backoff).toBe(1000);
    });

    it('should calculate correct backoff for attempt 2', () => {
      const backoff = calculateExponentialBackoff(2, 1000);
      expect(backoff).toBe(2000);
    });

    it('should calculate correct backoff for attempt 3', () => {
      const backoff = calculateExponentialBackoff(3, 1000);
      expect(backoff).toBe(4000);
    });

    it('should double with each attempt', () => {
      const backoff1 = calculateExponentialBackoff(1, 500);
      const backoff2 = calculateExponentialBackoff(2, 500);
      const backoff3 = calculateExponentialBackoff(3, 500);

      expect(backoff2).toBe(backoff1 * 2);
      expect(backoff3).toBe(backoff2 * 2);
    });
  });

  describe('formatPrice', () => {
    it('should format price with default decimals', () => {
      const formatted = formatPrice(123.456789);
      expect(formatted).toBe('123.456789');
    });

    it('should format price with custom decimals', () => {
      const formatted = formatPrice(123.456789, 2);
      expect(formatted).toBe('123.46');
    });

    it('should handle zero', () => {
      const formatted = formatPrice(0, 6);
      expect(formatted).toBe('0.000000');
    });

    it('should handle large numbers', () => {
      const formatted = formatPrice(1234567.89, 2);
      expect(formatted).toBe('1234567.89');
    });
  });
});


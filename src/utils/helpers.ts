import { nanoid } from 'nanoid';

export const generateOrderId = (): string => {
  return `ORD-${nanoid(12)}`;
};

export const generateTxHash = (): string => {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let hash = '';
  for (let i = 0; i < 88; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const calculateExponentialBackoff = (
  attempt: number,
  initialDelay: number
): number => {
  return initialDelay * Math.pow(2, attempt - 1);
};

export const formatPrice = (price: number, decimals: number = 6): string => {
  return price.toFixed(decimals);
};


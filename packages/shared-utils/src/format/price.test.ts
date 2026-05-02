import { describe, it, expect } from 'vitest';
import { formatPrice, priceToCents, centsToPrice } from './price.js';

describe('formatPrice', () => {
  it('formats a decimal string as USD by default', () => {
    expect(formatPrice('19.99')).toBe('$19.99');
  });

  it('formats a number', () => {
    expect(formatPrice(42.5)).toBe('$42.50');
  });

  it('formats zero', () => {
    expect(formatPrice('0')).toBe('$0.00');
  });

  it('supports custom currency', () => {
    expect(formatPrice('100', 'EUR')).toBe('€100.00');
  });

  it('supports custom locale', () => {
    expect(formatPrice('1234.56', 'USD', 'de-DE')).toBe('1.234,56 $');
  });

  it('handles large values', () => {
    expect(formatPrice('999999.99')).toBe('$999,999.99');
  });
});

describe('priceToCents', () => {
  it('converts decimal string to cents', () => {
    expect(priceToCents('19.99')).toBe(1999);
  });

  it('converts integer string to cents', () => {
    expect(priceToCents('5')).toBe(500);
  });

  it('converts number to cents', () => {
    expect(priceToCents(10.5)).toBe(1050);
  });

  it('rounds to nearest cent', () => {
    expect(priceToCents('1.005')).toBe(100);
  });
});

describe('centsToPrice', () => {
  it('converts cents to decimal string', () => {
    expect(centsToPrice(1999)).toBe('19.99');
  });

  it('pads single cents', () => {
    expect(centsToPrice(5)).toBe('0.05');
  });

  it('handles zero', () => {
    expect(centsToPrice(0)).toBe('0.00');
  });

  it('handles whole dollars', () => {
    expect(centsToPrice(500)).toBe('5.00');
  });
});

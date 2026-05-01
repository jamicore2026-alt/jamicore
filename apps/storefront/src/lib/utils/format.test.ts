import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  parseImages,
  parseTags,
  calcDiscountedPrice,
  discountLabel,
  getOptimizedUrl,
  getSrcset,
} from './format.js';

describe('formatPrice', () => {
  it('formats a decimal string with currency prefix', () => {
    expect(formatPrice('19.99')).toBe('$19.99');
  });

  it('formats a number with currency prefix', () => {
    expect(formatPrice(19.99)).toBe('$19.99');
  });

  it('handles integer values', () => {
    expect(formatPrice('42')).toBe('$42.00');
  });

  it('handles zero', () => {
    expect(formatPrice('0')).toBe('$0.00');
  });

  it('returns zero for NaN input', () => {
    expect(formatPrice('abc')).toBe('$0.00');
  });

  it('supports custom currency', () => {
    expect(formatPrice('99.99', '₹')).toBe('₹99.99');
  });

  it('handles large values', () => {
    expect(formatPrice('1234567.89')).toBe('$1234567.89');
  });
});

describe('parseImages', () => {
  it('returns empty array for null', () => {
    expect(parseImages(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(parseImages(undefined)).toEqual([]);
  });

  it('returns array as-is if already array', () => {
    expect(parseImages(['a.jpg', 'b.jpg'])).toEqual(['a.jpg', 'b.jpg']);
  });

  it('filters empty strings from array', () => {
    expect(parseImages(['a.jpg', '', 'b.jpg'])).toEqual(['a.jpg', 'b.jpg']);
  });

  it('splits comma-separated string', () => {
    expect(parseImages('a.jpg,b.jpg,c.jpg')).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
  });

  it('trims whitespace from comma-separated values', () => {
    expect(parseImages('a.jpg, b.jpg , c.jpg')).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
  });

  it('filters empty from comma-separated string', () => {
    expect(parseImages('a.jpg, ,b.jpg')).toEqual(['a.jpg', 'b.jpg']);
  });
});

describe('parseTags', () => {
  it('returns empty array for null', () => {
    expect(parseTags(null)).toEqual([]);
  });

  it('returns array as-is if already array', () => {
    expect(parseTags(['sale', 'new'])).toEqual(['sale', 'new']);
  });

  it('splits comma-separated string', () => {
    expect(parseTags('sale,new,featured')).toEqual(['sale', 'new', 'featured']);
  });
});

describe('calcDiscountedPrice', () => {
  it('returns original price when no discount', () => {
    expect(calcDiscountedPrice('100', 'Percent', '0')).toBe(100);
  });

  it('applies percent discount', () => {
    expect(calcDiscountedPrice('100', 'Percent', '20')).toBe(80);
  });

  it('applies fixed discount', () => {
    expect(calcDiscountedPrice('100', 'Fixed', '25')).toBe(75);
  });

  it('does not go below zero for fixed discount', () => {
    expect(calcDiscountedPrice('10', 'Fixed', '50')).toBe(0);
  });

  it('handles 100% discount', () => {
    expect(calcDiscountedPrice('50', 'Percent', '100')).toBe(0);
  });

  it('handles invalid salePrice', () => {
    expect(calcDiscountedPrice('abc', 'Percent', '10')).toBeNaN();
  });

  it('handles discount of 0.5 percent', () => {
    const result = calcDiscountedPrice('200', 'Percent', '0.5');
    expect(result).toBeCloseTo(199, 0);
  });
});

describe('discountLabel', () => {
  it('returns percent label', () => {
    expect(discountLabel('Percent', '20')).toBe('-20%');
  });

  it('returns fixed label with currency', () => {
    expect(discountLabel('Fixed', '5')).toBe('-$5.00');
  });

  it('returns empty for zero discount', () => {
    expect(discountLabel('Percent', '0')).toBe('');
  });

  it('returns empty for negative discount', () => {
    expect(discountLabel('Fixed', '-1')).toBe('');
  });

  it('returns empty for NaN', () => {
    expect(discountLabel('Percent', 'abc')).toBe('');
  });
});

describe('getOptimizedUrl', () => {
  it('replaces extension with size and format', () => {
    expect(getOptimizedUrl('https://cdn.example.com/photo.jpg', 'webp', 1024))
      .toBe('https://cdn.example.com/photo-1024w.webp');
  });

  it('handles avif format', () => {
    expect(getOptimizedUrl('https://cdn.example.com/photo.png', 'avif', 640))
      .toBe('https://cdn.example.com/photo-640w.avif');
  });

  it('handles default size', () => {
    const result = getOptimizedUrl('https://cdn.example.com/photo.jpg', 'webp');
    expect(result).toBe('https://cdn.example.com/photo-1024w.webp');
  });
});

describe('getSrcset', () => {
  it('builds srcset with multiple sizes', () => {
    const srcset = getSrcset('https://cdn.example.com/photo.jpg', 'webp');
    expect(srcset).toContain('320w');
    expect(srcset).toContain('640w');
    expect(srcset).toContain('1024w');
    expect(srcset).toContain('1920w');
    expect(srcset).toContain('webp');
  });
});

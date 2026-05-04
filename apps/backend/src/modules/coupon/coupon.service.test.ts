/* eslint-disable @typescript-eslint/no-explicit-any */
// Unit tests for couponService — business logic with mocked dependencies
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock couponRepo ───
vi.mock('./coupon.repo.js', () => ({
  couponRepo: {
    findManyByStoreId: vi.fn(),
    countByStoreId: vi.fn(),
    findById: vi.fn(),
    findByCode: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteById: vi.fn(),
    countCustomerUsages: vi.fn(),
  },
}));
import { couponRepo } from './coupon.repo.js';
const mockRepo = couponRepo as any;

// ─── Mock decimal helpers ───
vi.mock('../../lib/decimal.js', () => ({
  minDecimal: vi.fn((a: string, b: string) => {
    const aNum = parseFloat(a);
    const bNum = parseFloat(b);
    return aNum <= bNum ? a : b;
  }),
  toCents: vi.fn((value: string) => {
    const parts = value.split('.');
    const whole = parts[0] || '0';
    const fractional = (parts[1] || '').padEnd(2, '0').slice(0, 2);
    return Math.round(Number(whole) * 100 + Number(fractional));
  }),
  fromCents: vi.fn((cents: number) => {
    const isNegative = cents < 0;
    const absCents = Math.abs(cents);
    const whole = Math.floor(absCents / 100);
    const frac = absCents % 100;
    const sign = isNegative ? '-' : '';
    return `${sign}${whole}.${frac.toString().padStart(2, '0')}`;
  }),
}));

import { couponService } from './coupon.service.js';
import { ErrorCodes } from '../../errors/codes.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════
// findByStoreId
// ═══════════════════════════════════════════
describe('couponService.findByStoreId', () => {
  it('returns paginated coupons with default pagination', async () => {
    const rows = [{ id: 'c1' }, { id: 'c2' }];
    mockRepo.findManyByStoreId.mockResolvedValueOnce(rows);
    mockRepo.countByStoreId.mockResolvedValueOnce([{ count: 2 }]);

    const result = await couponService.findByStoreId('s1');

    expect(result).toEqual({
      data: rows,
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    });
    expect(mockRepo.findManyByStoreId).toHaveBeenCalledWith('s1', { limit: 20, offset: 0 });
    expect(mockRepo.countByStoreId).toHaveBeenCalledWith('s1');
  });

  it('supports custom page and limit', async () => {
    mockRepo.findManyByStoreId.mockResolvedValueOnce([]);
    mockRepo.countByStoreId.mockResolvedValueOnce([{ count: 50 }]);

    const result = await couponService.findByStoreId('s1', { page: 3, limit: 10 });

    expect(result.pagination).toEqual({ page: 3, limit: 10, total: 50, totalPages: 5 });
    expect(mockRepo.findManyByStoreId).toHaveBeenCalledWith('s1', { limit: 10, offset: 20 });
  });

  it('defaults page to 1 when page is 0 or negative', async () => {
    mockRepo.findManyByStoreId.mockResolvedValueOnce([]);
    mockRepo.countByStoreId.mockResolvedValueOnce([{ count: 0 }]);

    const result = await couponService.findByStoreId('s1', { page: 0, limit: 5 });

    expect(result.pagination.page).toBe(1);
    expect(mockRepo.findManyByStoreId).toHaveBeenCalledWith('s1', { limit: 5, offset: 0 });
  });

  it('defaults limit to 1 when limit is 0 or negative', async () => {
    mockRepo.findManyByStoreId.mockResolvedValueOnce([]);
    mockRepo.countByStoreId.mockResolvedValueOnce([{ count: 0 }]);

    const result = await couponService.findByStoreId('s1', { page: 1, limit: 0 });

    expect(result.pagination.limit).toBe(1);
  });

  it('handles empty count result gracefully', async () => {
    mockRepo.findManyByStoreId.mockResolvedValueOnce([]);
    mockRepo.countByStoreId.mockResolvedValueOnce([]);

    const result = await couponService.findByStoreId('s1');

    expect(result.pagination.total).toBe(0);
  });
});

// ═══════════════════════════════════════════
// findById
// ═══════════════════════════════════════════
describe('couponService.findById', () => {
  it('returns coupon when found', async () => {
    const coupon = { id: 'c1', storeId: 's1', code: 'SAVE10' };
    mockRepo.findById.mockResolvedValueOnce(coupon);

    const result = await couponService.findById('c1', 's1');
    expect(result).toEqual(coupon);
    expect(mockRepo.findById).toHaveBeenCalledWith('c1', 's1');
  });

  it('throws INVALID_COUPON when not found', async () => {
    mockRepo.findById.mockResolvedValueOnce(null);

    await expect(couponService.findById('nonexistent', 's1'))
      .rejects.toMatchObject({ code: ErrorCodes.INVALID_COUPON });
  });
});

// ═══════════════════════════════════════════
// findByCode
// ═══════════════════════════════════════════
describe('couponService.findByCode', () => {
  it('returns coupon when found', async () => {
    const coupon = { id: 'c1', code: 'SAVE10', storeId: 's1' };
    mockRepo.findByCode.mockResolvedValueOnce(coupon);

    const result = await couponService.findByCode('SAVE10', 's1');
    expect(result).toEqual(coupon);
    expect(mockRepo.findByCode).toHaveBeenCalledWith('SAVE10', 's1');
  });

  it('returns null when not found', async () => {
    mockRepo.findByCode.mockResolvedValueOnce(null);

    const result = await couponService.findByCode('NONEXISTENT', 's1');
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════
// validateCoupon
// ═══════════════════════════════════════════
describe('couponService.validateCoupon', () => {
  const baseCoupon = {
    id: 'c1',
    code: 'SAVE10',
    storeId: 's1',
    isActive: true,
    startsAt: null,
    expiresAt: null,
    usageLimit: null,
    usageCount: 0,
    usageLimitPerCustomer: 1,
    minOrderAmount: null,
  };

  it('returns coupon when valid', async () => {
    mockRepo.findByCode.mockResolvedValueOnce(baseCoupon);

    const result = await couponService.validateCoupon('SAVE10', 's1');
    expect(result).toEqual(baseCoupon);
  });

  it('throws INVALID_COUPON when code not found', async () => {
    mockRepo.findByCode.mockResolvedValueOnce(null);

    await expect(couponService.validateCoupon('INVALID', 's1'))
      .rejects.toMatchObject({ code: ErrorCodes.INVALID_COUPON });
  });

  it('throws INVALID_COUPON when coupon is inactive', async () => {
    mockRepo.findByCode.mockResolvedValueOnce({ ...baseCoupon, isActive: false });

    await expect(couponService.validateCoupon('SAVE10', 's1'))
      .rejects.toMatchObject({ code: ErrorCodes.INVALID_COUPON });
  });

  it('throws COUPON_EXPIRED when startsAt is in the future', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    mockRepo.findByCode.mockResolvedValueOnce({ ...baseCoupon, startsAt: futureDate });

    await expect(couponService.validateCoupon('SAVE10', 's1'))
      .rejects.toMatchObject({ code: ErrorCodes.COUPON_EXPIRED });
  });

  it('throws COUPON_EXPIRED when expiresAt is in the past', async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    mockRepo.findByCode.mockResolvedValueOnce({ ...baseCoupon, expiresAt: pastDate });

    await expect(couponService.validateCoupon('SAVE10', 's1'))
      .rejects.toMatchObject({ code: ErrorCodes.COUPON_EXPIRED });
  });

  it('throws COUPON_USAGE_EXCEEDED when usage limit reached', async () => {
    mockRepo.findByCode.mockResolvedValueOnce({ ...baseCoupon, usageLimit: 100, usageCount: 100 });

    await expect(couponService.validateCoupon('SAVE10', 's1'))
      .rejects.toMatchObject({ code: ErrorCodes.COUPON_USAGE_EXCEEDED });
  });

  it('throws COUPON_USAGE_EXCEEDED when usage limit is 0', async () => {
    mockRepo.findByCode.mockResolvedValueOnce({ ...baseCoupon, usageLimit: 0, usageCount: 0 });

    await expect(couponService.validateCoupon('SAVE10', 's1'))
      .rejects.toMatchObject({ code: ErrorCodes.COUPON_USAGE_EXCEEDED });
  });

  it('passes when usage is under limit', async () => {
    mockRepo.findByCode.mockResolvedValueOnce({ ...baseCoupon, usageLimit: 100, usageCount: 50 });

    const result = await couponService.validateCoupon('SAVE10', 's1');
    expect(result).toBeDefined();
  });

  it('throws COUPON_USAGE_EXCEEDED when per-customer limit reached', async () => {
    mockRepo.findByCode.mockResolvedValueOnce({ ...baseCoupon, usageLimitPerCustomer: 2 });
    mockRepo.countCustomerUsages.mockResolvedValueOnce(2);

    await expect(couponService.validateCoupon('SAVE10', 's1', undefined, 'cust1'))
      .rejects.toMatchObject({ code: ErrorCodes.COUPON_USAGE_EXCEEDED });
  });

  it('passes per-customer check when under limit', async () => {
    mockRepo.findByCode.mockResolvedValueOnce({ ...baseCoupon, usageLimitPerCustomer: 2 });
    mockRepo.countCustomerUsages.mockResolvedValueOnce(1);

    const result = await couponService.validateCoupon('SAVE10', 's1', undefined, 'cust1');
    expect(result).toBeDefined();
  });

  it('skips per-customer check when customerId not provided', async () => {
    mockRepo.findByCode.mockResolvedValueOnce({ ...baseCoupon, usageLimitPerCustomer: 1 });

    const result = await couponService.validateCoupon('SAVE10', 's1');
    expect(result).toBeDefined();
    expect(mockRepo.countCustomerUsages).not.toHaveBeenCalled();
  });

  it('throws INVALID_COUPON when order amount below minOrderAmount', async () => {
    mockRepo.findByCode.mockResolvedValueOnce({ ...baseCoupon, minOrderAmount: '50.00' });

    await expect(couponService.validateCoupon('SAVE10', 's1', '25.00'))
      .rejects.toMatchObject({ code: ErrorCodes.INVALID_COUPON });
  });

  it('passes when order amount meets minOrderAmount', async () => {
    mockRepo.findByCode.mockResolvedValueOnce({ ...baseCoupon, minOrderAmount: '50.00' });

    const result = await couponService.validateCoupon('SAVE10', 's1', '50.00');
    expect(result).toBeDefined();
  });

  it('passes when minOrderAmount is set but no orderAmount provided', async () => {
    mockRepo.findByCode.mockResolvedValueOnce({ ...baseCoupon, minOrderAmount: '50.00' });

    // No orderAmount passed — the check is skipped
    const result = await couponService.validateCoupon('SAVE10', 's1');
    expect(result).toBeDefined();
  });
});

// ═══════════════════════════════════════════
// calculateDiscount
// ═══════════════════════════════════════════
describe('couponService.calculateDiscount', () => {
  const baseCoupon = {
    id: 'c1',
    type: 'percentage',
    value: '10',
    maxDiscountAmount: null,
    freeShipping: false,
    appliesTo: 'all',
    productIds: null,
  } as any;

  it('calculates percentage discount correctly', async () => {
    const result = await couponService.calculateDiscount({ ...baseCoupon }, '100.00');
    expect(result.discountAmount).toBe('10.00');
    expect(result.freeShipping).toBe(false);
  });

  it('caps percentage discount at maxDiscountAmount', async () => {
    const coupon = { ...baseCoupon, maxDiscountAmount: '5.00' };
    const result = await couponService.calculateDiscount(coupon, '100.00');
    expect(result.discountAmount).toBe('5.00');
  });

  it('calculates 0% discount as 0.00', async () => {
    const coupon = { ...baseCoupon, value: '0' };
    const result = await couponService.calculateDiscount(coupon, '100.00');
    expect(result.discountAmount).toBe('0.00');
  });

  it('calculates 100% percentage discount', async () => {
    const coupon = { ...baseCoupon, value: '100' };
    const result = await couponService.calculateDiscount(coupon, '50.00');
    expect(result.discountAmount).toBe('50.00');
  });

  it('calculates fixed discount using minDecimal', async () => {
    const { minDecimal } = await import('../../lib/decimal.js');
    const coupon = { ...baseCoupon, type: 'fixed', value: '10.00' };
    const result = await couponService.calculateDiscount(coupon, '50.00');
    // minDecimal returns the smaller value: min("10.00", "50.00") = "10.00"
    expect(result.discountAmount).toBe('10.00');
    expect(minDecimal).toHaveBeenCalledWith('10.00', '50.00');
  });

  it('caps fixed discount at subtotal via minDecimal', async () => {
    const coupon = { ...baseCoupon, type: 'fixed', value: '100.00' };
    const result = await couponService.calculateDiscount(coupon, '50.00');
    // minDecimal("100.00", "50.00") = "50.00"
    expect(result.discountAmount).toBe('50.00');
  });

  it('returns freeShipping: true for free_shipping type', async () => {
    const coupon = { ...baseCoupon, type: 'free_shipping', value: '0', freeShipping: false };
    const result = await couponService.calculateDiscount(coupon, '100.00');
    expect(result.discountAmount).toBe('0.00');
    expect(result.freeShipping).toBe(true);
  });

  it('returns freeShipping: true when coupon.freeShipping is true', async () => {
    const coupon = { ...baseCoupon, freeShipping: true };
    const result = await couponService.calculateDiscount(coupon, '100.00');
    expect(result.freeShipping).toBe(true);
  });

  it('throws COUPON_NOT_APPLICABLE when appliesTo is products and no matching productIds', async () => {
    const coupon = { ...baseCoupon, appliesTo: 'products', productIds: 'p1,p2' };

    await expect(couponService.calculateDiscount(coupon, '100.00', ['p3', 'p4']))
      .rejects.toMatchObject({ code: ErrorCodes.COUPON_NOT_APPLICABLE });
  });

  it('allows discount when appliesTo products and productIds match', async () => {
    const coupon = { ...baseCoupon, appliesTo: 'products', productIds: 'p1,p2' };
    const result = await couponService.calculateDiscount(coupon, '100.00', ['p1', 'p3']);
    expect(result.discountAmount).toBe('10.00');
  });

  it('passes when appliesTo is products but no productIds provided in cart', async () => {
    const coupon = { ...baseCoupon, appliesTo: 'products', productIds: 'p1,p2' };
    // productIds in cart is empty array → does not throw
    const result = await couponService.calculateDiscount(coupon, '100.00', []);
    // No applicable products in cart, but empty array skips the check
    expect(result.discountAmount).toBe('10.00');
  });
});

// ═══════════════════════════════════════════
// create
// ═══════════════════════════════════════════
describe('couponService.create', () => {
  const createData = {
    storeId: 's1',
    code: 'save10',
    type: 'percentage',
    value: '10',
  };

  it('creates a coupon with uppercase code and defaults', async () => {
    mockRepo.findByCode.mockResolvedValueOnce(null);
    const createdCoupon = { id: 'c1', code: 'SAVE10', storeId: 's1' };
    mockRepo.create.mockResolvedValueOnce([createdCoupon]);

    const result = await couponService.create(createData);

    expect(result).toEqual(createdCoupon);
    expect(mockRepo.findByCode).toHaveBeenCalledWith('save10', 's1');
    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      code: 'SAVE10',
      freeShipping: false,
      usageLimitPerCustomer: 1,
      appliesTo: 'all',
    }));
  });

  it('throws INVALID_COUPON when code already exists in store', async () => {
    mockRepo.findByCode.mockResolvedValueOnce({ id: 'existing', code: 'SAVE10' });

    await expect(couponService.create(createData))
      .rejects.toMatchObject({ code: ErrorCodes.INVALID_COUPON });
  });

  it('passes through all optional fields', async () => {
    mockRepo.findByCode.mockResolvedValueOnce(null);
    const fullData = {
      storeId: 's1',
      code: 'BIGSAVE',
      description: 'Big savings',
      type: 'fixed',
      value: '25.00',
      minOrderAmount: '100.00',
      maxDiscountAmount: '25.00',
      freeShipping: true,
      usageLimit: 500,
      usageLimitPerCustomer: 3,
      startsAt: new Date('2025-01-01'),
      expiresAt: new Date('2025-12-31'),
      appliesTo: 'categories',
      productIds: 'p1,p2',
      categoryIds: 'cat1',
    };
    mockRepo.create.mockResolvedValueOnce([{ id: 'c2' }]);

    await couponService.create(fullData);

    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      description: 'Big savings',
      minOrderAmount: '100.00',
      maxDiscountAmount: '25.00',
      freeShipping: true,
      usageLimit: 500,
      usageLimitPerCustomer: 3,
      categoryIds: 'cat1',
    }));
  });
});

// ═══════════════════════════════════════════
// update
// ═══════════════════════════════════════════
describe('couponService.update', () => {
  it('updates coupon successfully', async () => {
    const existing = { id: 'c1', storeId: 's1', code: 'SAVE10' };
    mockRepo.findById.mockResolvedValueOnce(existing);
    const updated = { ...existing, description: 'Updated' };
    mockRepo.update.mockResolvedValueOnce([updated]);

    const result = await couponService.update('c1', 's1', { description: 'Updated' });

    expect(result).toEqual(updated);
    expect(mockRepo.update).toHaveBeenCalledWith('c1', 's1', { description: 'Updated' });
  });

  it('throws INVALID_COUPON when coupon not found', async () => {
    mockRepo.findById.mockResolvedValueOnce(null);

    await expect(couponService.update('nonexistent', 's1', { description: 'Updated' }))
      .rejects.toMatchObject({ code: ErrorCodes.INVALID_COUPON });
  });

  it('uppercases code on update and checks for duplicates', async () => {
    const existing = { id: 'c1', storeId: 's1', code: 'SAVE10' };
    mockRepo.findById.mockResolvedValueOnce(existing);
    mockRepo.findByCode.mockResolvedValueOnce(null); // no duplicate
    mockRepo.update.mockResolvedValueOnce([{ ...existing, code: 'NEWSAVE' }]);

    await couponService.update('c1', 's1', { code: 'newsave' });

    expect(mockRepo.findByCode).toHaveBeenCalledWith('newsave', 's1');
    expect(mockRepo.update).toHaveBeenCalledWith('c1', 's1', expect.objectContaining({ code: 'NEWSAVE' }));
  });

  it('throws INVALID_COUPON when updated code conflicts with existing code', async () => {
    const existing = { id: 'c1', storeId: 's1', code: 'SAVE10' };
    mockRepo.findById.mockResolvedValueOnce(existing);
    mockRepo.findByCode.mockResolvedValueOnce({ id: 'c2', code: 'OTHER' }); // duplicate

    await expect(couponService.update('c1', 's1', { code: 'OTHER' }))
      .rejects.toMatchObject({ code: ErrorCodes.INVALID_COUPON });
  });

  it('skips duplicate check when code unchanged (case-insensitive)', async () => {
    const existing = { id: 'c1', storeId: 's1', code: 'SAVE10' };
    mockRepo.findById.mockResolvedValueOnce(existing);
    mockRepo.update.mockResolvedValueOnce([existing]);

    await couponService.update('c1', 's1', { code: 'save10' });

    expect(mockRepo.findByCode).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════
// delete
// ═══════════════════════════════════════════
describe('couponService.delete', () => {
  it('deletes coupon and returns confirmation', async () => {
    mockRepo.findById.mockResolvedValueOnce({ id: 'c1', storeId: 's1' });
    mockRepo.deleteById.mockResolvedValueOnce(undefined);

    const result = await couponService.delete('c1', 's1');

    expect(result).toEqual({ id: 'c1', deleted: true });
    expect(mockRepo.deleteById).toHaveBeenCalledWith('c1', 's1');
  });

  it('throws INVALID_COUPON when coupon not found', async () => {
    mockRepo.findById.mockResolvedValueOnce(null);

    await expect(couponService.delete('nonexistent', 's1'))
      .rejects.toMatchObject({ code: ErrorCodes.INVALID_COUPON });
  });
});

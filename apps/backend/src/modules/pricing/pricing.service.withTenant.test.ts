// Verifies pricingService wraps catalog DB work in withTenant(storeId, fn)
// (RLS Phase 1). withTenant + pricingRepo + cross-module services are mocked.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  // Run fn with a sentinel tx so we can assert pricingRepo received it.
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    const sentinelTx = { __sentinel: 'tx' };
    return fn(sentinelTx);
  },
}));

const { pricingRepo } = vi.hoisted(() => ({
  pricingRepo: {
    findProductById: vi.fn().mockResolvedValue({
      id: 'p1', storeId: 's1', salePrice: '10.00', currentQuantity: 100,
      isPublished: true, discount: '0', discountType: 'Percent',
      titleEn: 'P', images: [], discount: '0',
    }),
    findVariantOptionsByIds: vi.fn().mockResolvedValue([]),
    findVariantsByIds: vi.fn().mockResolvedValue([]),
    findCombination: vi.fn().mockResolvedValue(undefined),
    findModifierOptionsByIds: vi.fn().mockResolvedValue([]),
    findModifierGroupsByIds: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('./pricing.repo.js', () => ({ pricingRepo }));

vi.mock('../bundle/bundle.repo.js', () => ({
  bundleRepo: { findById: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../coupon/coupon.service.js', () => ({
  couponService: { validateCoupon: vi.fn(), calculateDiscount: vi.fn().mockResolvedValue({ discountAmount: '0', freeShipping: false }) },
}));
vi.mock('../shipping/shipping.service.js', () => ({
  shippingService: { calculateShipping: vi.fn().mockResolvedValue({ options: [] }) },
}));
vi.mock('../tax/tax.service.js', () => ({
  taxService: { calculateTax: vi.fn().mockResolvedValue({ totalTax: '0', breakdown: [] }) },
}));
vi.mock('../currency/currency.service.js', () => ({
  currencyService: { getStoreCurrency: vi.fn().mockResolvedValue('USD'), convert: vi.fn() },
}));

import { pricingService } from './pricing.service.js';

describe('pricing.service wraps catalog work in withTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computeItemPrice runs inside withTenant(storeId) and threads tx into pricingRepo.findProductById', async () => {
    await pricingService.computeItemPrice({
      storeId: 's1', productId: 'p1', quantity: 1,
    });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(pricingRepo.findProductById).toHaveBeenCalledWith('p1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('computeOrderPricing runs inside withTenant(storeId)', async () => {
    await pricingService.computeOrderPricing({
      storeId: 's1',
      items: [{ productId: 'p1', quantity: 1 }],
      shippingAddress: { country: 'US' },
    });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(pricingRepo.findProductById).toHaveBeenCalledWith('p1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });
});
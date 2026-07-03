/* eslint-disable @typescript-eslint/no-explicit-any */
// Verifies seoService.getProductJsonLd wraps the products read in
// withTenant(storeId, fn) (RLS Phase 1 catalog). withTenant is mocked to invoke
// fn with a sentinel tx; the sentinel tx exposes a `select` returning a
// products-query chain so we can assert the RLS-gated products read ran on the
// tx (a bare db read would zero-out under catalog-RLS). `stores` has no RLS
// this phase and stays on bare db.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock, sentinelTx, productsFrom, productsWhere, productsLimit } = vi.hoisted(() => {
  const productsChain: Record<string, unknown> = {};
  const productsFrom = vi.fn(() => productsChain);
  const productsWhere = vi.fn(() => productsChain);
  const productsLimit = vi.fn(() => productsChain);
  productsChain.where = productsWhere;
  productsChain.limit = productsLimit;
  productsChain.then = vi.fn((resolve: (v: unknown) => unknown) =>
    resolve([
      {
        id: 'p1',
        titleEn: 'P',
        salePrice: '10.00',
        currentQuantity: 5,
        images: [],
        descriptionEn: '',
        barcode: '',
      },
    ]),
  );
  const sentinelTx = {
    __sentinel: 'tx',
    select: vi.fn(() => ({ from: productsFrom })),
  };
  return { withTenantMock: vi.fn(), sentinelTx, productsFrom, productsWhere, productsLimit };
});

vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn(sentinelTx);
  },
}));

const { storeFrom, storeWhere, storeLimit } = vi.hoisted(() => {
  const storeChain: Record<string, unknown> = {};
  const storeFrom = vi.fn(() => storeChain);
  const storeWhere = vi.fn(() => storeChain);
  const storeLimit = vi.fn(() => storeChain);
  storeChain.where = storeWhere;
  storeChain.limit = storeLimit;
  storeChain.then = vi.fn((resolve: (v: unknown) => unknown) =>
    resolve([{ domain: 'shop.example.com', currency: 'USD' }]),
  );
  return { storeFrom, storeWhere, storeLimit };
});

vi.mock('../../db/index.js', () => ({
  // db is only used for the stores lookup in this module (stores has no RLS).
  db: {
    select: vi.fn(() => ({ from: storeFrom })),
  },
}));

import { seoService } from './seo.service.js';

describe('seoService.getProductJsonLd wraps products read in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('runs inside withTenant(storeId) and reads products on the sentinel tx', async () => {
    const result = await seoService.getProductJsonLd('s1', 'p1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(sentinelTx.select).toHaveBeenCalled();
    expect(productsFrom).toHaveBeenCalled(); // from(products)
    expect(productsWhere).toHaveBeenCalled();
    expect(productsLimit).toHaveBeenCalledWith(1);
    // stores lookup stays on bare db (no RLS this phase)
    expect(storeFrom).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ '@type': 'Product', name: 'P' }));
  });

  it('returns null when product is missing (RLS zero-out path)', async () => {
    // Make the products chain resolve to empty for this call only.
    (productsLimit as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      const emptyChain: Record<string, unknown> = {
        where: productsWhere,
        limit: productsLimit,
        then: vi.fn((resolve: (v: unknown) => unknown) => resolve([])),
      };
      return emptyChain;
    });
    const result = await seoService.getProductJsonLd('s1', 'missing');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(result).toBeNull();
  });
});
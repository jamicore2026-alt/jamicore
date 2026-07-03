/* eslint-disable @typescript-eslint/no-explicit-any */
// Verifies seoService.getProductJsonLd wraps the products read in
// withTenant(storeId, fn) (RLS Phase 1 catalog). withTenant is mocked to
// invoke fn with a sentinel tx; the sentinel tx exposes a `select` whose
// `from(table)` returns a tracked query chain keyed by table name so we can
// assert BOTH RLS-gated reads ran on the tx: products (catalog RLS) and
// stores (RLS since migration 0031 — moved onto the tenant-scoped tx because
// app.tenant_id = storeId satisfies the id-based stores policy). drizzle-orm
// `eq`/`and` + schema are mocked so the chains can be table-keyed.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  withTenantMock,
  sentinelTx,
  productsFrom,
  productsWhere,
  productsLimit,
  storeFrom,
  storeWhere,
  storeLimit,
} = vi.hoisted(() => {
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

  const storeChain: Record<string, unknown> = {};
  const storeFrom = vi.fn(() => storeChain);
  const storeWhere = vi.fn(() => storeChain);
  const storeLimit = vi.fn(() => storeChain);
  storeChain.where = storeWhere;
  storeChain.limit = storeLimit;
  storeChain.then = vi.fn((resolve: (v: unknown) => unknown) =>
    resolve([{ domain: 'shop.example.com', currency: 'USD' }]),
  );

  const sentinelTx = {
    __sentinel: 'tx',
    select: vi.fn(() => ({
      from: vi.fn((table: { __tname: string }) => {
        if (table?.__tname === 'products') return productsFrom();
        if (table?.__tname === 'stores') return storeFrom();
        return {} as Record<string, unknown>;
      }),
    })),
  };
  return {
    withTenantMock: vi.fn(),
    sentinelTx,
    productsFrom,
    productsWhere,
    productsLimit,
    storeFrom,
    storeWhere,
    storeLimit,
  };
});

vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn(sentinelTx);
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_l: unknown, _r: unknown) => ({})),
  and: vi.fn(() => ({})),
}));

vi.mock('../../db/schema.js', () => {
  const table = (name: string) => ({
    __tname: name,
    id: 'id',
    storeId: 'storeId',
    domain: 'domain',
    currency: 'currency',
  });
  return { products: table('products'), stores: table('stores') };
});

import { seoService } from './seo.service.js';

describe('seoService.getProductJsonLd wraps products + stores reads in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('runs inside withTenant(storeId) and reads products + stores on the sentinel tx', async () => {
    const result = await seoService.getProductJsonLd('s1', 'p1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(sentinelTx.select).toHaveBeenCalledTimes(2); // products + stores
    expect(productsFrom).toHaveBeenCalled(); // from(products)
    expect(productsWhere).toHaveBeenCalled();
    expect(productsLimit).toHaveBeenCalledWith(1);
    // stores lookup ran on the SAME tx (RLS tenant-scoped), not bare db
    expect(storeFrom).toHaveBeenCalled(); // from(stores)
    expect(storeWhere).toHaveBeenCalled();
    expect(storeLimit).toHaveBeenCalledWith(1);
    expect(result).toEqual(expect.objectContaining({ '@type': 'Product', name: 'P' }));
  });

  it('returns null when product is missing (RLS zero-out path, no stores read)', async () => {
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
    // Only the products select ran; the stores read is short-circuited.
    expect(sentinelTx.select).toHaveBeenCalledTimes(1);
    expect(storeFrom).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
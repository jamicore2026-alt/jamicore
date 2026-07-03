/* eslint-disable @typescript-eslint/no-explicit-any */
// Verifies the /sitemap.xml route wraps its products + categories reads in
// withTenant(storeId, fn) (RLS Phase 1 catalog). withTenant is mocked to
// invoke fn with a sentinel tx exposing a `select` whose `from(table)` returns
// a tracked query chain keyed by table name. db (stores lookup, no RLS this
// phase) + drizzle-orm `eq` are mocked separately. Asserts the RLS-gated
// products + categories reads run on the sentinel tx.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock, sentinelTx, productsFrom, categoriesFrom } = vi.hoisted(() => {
  const makeChain = (resolveValue: unknown) => {
    const chain: Record<string, unknown> = {};
    chain.where = vi.fn(() => chain);
    chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolveValue));
    return chain;
  };
  const productsFrom = vi.fn(() => makeChain([{ id: 'p1', updatedAt: new Date('2026-01-01') }]));
  const categoriesFrom = vi.fn(() => makeChain([{ id: 'c1', updatedAt: new Date('2026-01-01') }]));
  const sentinelTx = {
    __sentinel: 'tx',
    select: vi.fn(() => ({
      from: vi.fn((table: { __tname: string }) => {
        if (table?.__tname === 'products') return productsFrom();
        if (table?.__tname === 'categories') return categoriesFrom();
        return makeChain([]);
      }),
    })),
  };
  return { withTenantMock: vi.fn(), sentinelTx, productsFrom, categoriesFrom };
});

vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn(sentinelTx);
  },
}));

const { storeFrom } = vi.hoisted(() => {
  const storeChain: Record<string, unknown> = {};
  storeChain.where = vi.fn(() => storeChain);
  storeChain.limit = vi.fn(() => storeChain);
  storeChain.then = vi.fn((resolve: (v: unknown) => unknown) =>
    resolve([{ domain: 'shop.example.com' }]),
  );
  return { storeFrom: vi.fn(() => storeChain) };
});

vi.mock('../../db/index.js', () => ({
  // stores has RLS (migration 0031); the sitemap store-domain lookup runs on
  // dbAdmin (BYPASSRLS) with an explicit eq(stores.id, storeId) filter.
  dbAdmin: { select: vi.fn(() => ({ from: storeFrom })) },
}));

vi.mock('drizzle-orm', () => ({ eq: vi.fn((_l: unknown, _r: unknown) => ({})) }));

vi.mock('../../db/schema.js', () => {
  const table = (name: string) => ({ __tname: name, id: 'id', updatedAt: 'updatedAt', storeId: 'storeId', domain: 'domain' });
  return {
    products: table('products'),
    categories: table('categories'),
    stores: table('stores'),
  };
});

vi.mock('./seo.service.js', () => ({
  seoService: { getProductJsonLd: vi.fn().mockResolvedValue(null) },
}));

import seoRoutePublic from './seo.route.public.js';

describe('seo.route.public /sitemap.xml wraps products + categories reads in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('runs products + categories reads inside withTenant(storeId) on the sentinel tx', async () => {
    const handlers: Record<string, (req: any, reply: any) => unknown> = {};
    const fastify = {
      get: vi.fn((path: string, ...rest: unknown[]) => {
        handlers[path] = rest[rest.length - 1] as (req: any, reply: any) => unknown;
      }),
    } as unknown as import('fastify').FastifyInstance;
    await seoRoutePublic(fastify);

    const reply = { header: vi.fn() };
    const xml = (await handlers['/sitemap.xml']({ storeId: 's1' } as any, reply as any)) as string;

    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(sentinelTx.select).toHaveBeenCalled();
    expect(productsFrom).toHaveBeenCalled();
    expect(categoriesFrom).toHaveBeenCalled();
    expect(xml).toContain('<urlset');
    expect(xml).toContain('/products/p1');
    expect(xml).toContain('/categories/c1');
  });
});
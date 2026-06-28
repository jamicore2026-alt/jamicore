import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => {
  const withTenantMock = vi.fn();
  // Per-read payloads. The processor does 4 reads in order:
  //   cart → customer → cartItems → products
  // Each must satisfy the early-return guards so execution reaches emailQueue.add.
  const reads: unknown[][] = [
    [{ id: 'c1', storeId: 's1', itemCount: 2, customerId: 'cust-1' }], // cart
    [{ id: 'cust-1', storeId: 's1', email: 'cust@example.com', firstName: 'Cust' }], // customer
    [{ id: 'ci1', cartId: 'c1', productId: 'p1', quantity: 2 }], // cart_items
    [{ id: 'p1', titleEn: 'Product A' }], // products
  ];
  let readIdx = 0;
  const selectChain = () => {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'limit']) chain[m] = vi.fn(() => chain);
    const idx = readIdx++;
    chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(reads[idx] ?? []));
    return chain;
  };
  const queueService = {
    emailQueue: { add: vi.fn().mockResolvedValue(undefined) },
  };
  return { withTenantMock, selectChain, queueService, resetIdx: () => { readIdx = 0; } };
});

// withTenant mock: invokes fn with a tx whose .select returns the chained mock,
// so reads ride the tx (post-refactor) and we can assert withTenant was called.
vi.mock('../lib/withTenant.js', () => ({
  withTenant: (
    storeId: string,
    fn: (tx: { select: () => Record<string, unknown> }) => Promise<unknown>,
  ) => {
    hoisted.withTenantMock(storeId);
    return fn({ select: hoisted.selectChain });
  },
}));

vi.mock('../db/index.js', () => ({
  db: { select: vi.fn(() => hoisted.selectChain()) },
  dbAdmin: {},
  dbOwner: {},
}));

vi.mock('./queue.service.js', () => ({
  queueService: vi.fn(() => hoisted.queueService),
}));

import { createAbandonedCartProcessor } from './abandonedCartProcessor.service.js';

describe('abandonedCartProcessor wraps reads in withTenant(storeId)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.resetIdx();
  });

  it('runs cart reads inside withTenant(job.data.storeId) and enqueues the email', async () => {
    const processJob = createAbandonedCartProcessor(hoisted.queueService as never);
    await processJob({
      data: { storeId: 's1', cartId: 'c1', customerId: 'cust-1' },
    } as never);
    expect(hoisted.withTenantMock).toHaveBeenCalledWith('s1');
    expect(hoisted.queueService.emailQueue.add).toHaveBeenCalled();
  });
});
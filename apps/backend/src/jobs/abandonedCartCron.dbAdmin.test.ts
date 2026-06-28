// Asserts the abandoned-cart cron reads carts via dbAdmin (BYPASSRLS), not db
// (app_tenant). Under carts-RLS a bare-db all-stores scan would return 0 rows,
// silently killing recovery-email enqueues.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => {
  const dbSelect = vi.fn(() => {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where']) chain[m] = vi.fn(() => chain);
    chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve([]));
    return chain;
  });
  const dbAdminSelect = vi.fn(() => {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where']) chain[m] = vi.fn(() => chain);
    chain.then = vi.fn(
      (resolve: (v: unknown) => unknown) =>
        resolve([{ storeId: 's1', id: 'c1', customerId: 'cust-1' }]),
    );
    return chain;
  });
  const queueService = {
    abandonedCartQueue: { add: vi.fn().mockResolvedValue(undefined) },
  };
  return { dbSelect, dbAdminSelect, queueService };
});

vi.mock('../db/index.js', () => ({
  db: { select: hoisted.dbSelect },
  dbAdmin: { select: hoisted.dbAdminSelect },
  dbOwner: {},
}));

vi.mock('../services/queue.service.js', () => ({
  queueService: vi.fn(() => hoisted.queueService),
}));

// Stub redis set/del so the distributed lock resolves.
vi.mock('../lib/redis.js', () => ({
  createRedis: vi.fn(),
  default: { set: vi.fn().mockResolvedValue('OK'), del: vi.fn().mockResolvedValue(1) },
}));

import { db, dbAdmin } from '../db/index.js';
import { runAbandonedCartCron } from './abandonedCartCron.js';

describe('abandonedCartCron reads carts via dbAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses dbAdmin.select (not db.select) for the all-stores carts scan', async () => {
    const redis = {
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
    } as never;
    await runAbandonedCartCron(
      hoisted.queueService as never,
      { info: vi.fn(), debug: vi.fn(), error: vi.fn() } as never,
      redis,
    );
    expect(hoisted.dbAdminSelect).toHaveBeenCalled();
    expect(hoisted.dbSelect).not.toHaveBeenCalled();
    expect(dbAdmin).not.toBe(db); // sanity: distinct clients
  });
});
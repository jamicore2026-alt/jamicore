// Verifies verifyEmail / resetPassword set app.tenant_id (transaction-local) from
// the verification-token row's storeId BEFORE any customers read/write, so the
// customer reads/writes see rows under customers-RLS. These paths have NO storeId
// in the request — the storeId lives in the verificationTokens row read at the
// top of the same db.transaction. The withTenant helper can't be used (storeId
// unknown at tx-open), so the fix is an inline set_config on the existing tx.
//
// We mock db.transaction to run the callback with a fake tx whose .execute() /
// .select() / .update() we can observe, and assert set_config('app.tenant_id',
// record.storeId, true) is called AFTER the token read+markUsed and BEFORE the
// first authRepo.updateCustomer* call.
//
// Detection approach: we render the drizzle `sql` template object passed to
// tx.execute() using the same queryChunks-based renderer as lib/withTenant.test.ts
// (which does NOT depend on drizzle's internal property names — the SQL object
// stores static text in queryChunks[].value arrays and params as bare values).
// Ordering is asserted via a shared `calls` array: executeMock pushes
// 'set_config' when it sees the set_config statement, and the repo mocks push
// 'updateCustomerVerified' / 'updateCustomerPassword' via mockImplementationOnce.
// The load-bearing invariant is set_config index < write index.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { executeMock } = vi.hoisted(() => ({ executeMock: vi.fn() }));
const { repo } = vi.hoisted(() => ({
  repo: {
    updateCustomerVerified: vi.fn().mockResolvedValue([{ id: 'c1', storeId: 's1' }]),
    updateCustomerPassword: vi.fn().mockResolvedValue(undefined),
    findCustomerByEmailAndStoreId: vi.fn().mockResolvedValue({ id: 'c1' }),
    revokeAllUserTokens: vi.fn().mockResolvedValue(undefined),
    findUserByEmail: vi.fn().mockResolvedValue(undefined),
    updateMerchantPassword: vi.fn().mockResolvedValue(undefined),
    deleteVerificationTokensByEmailTypeUserType: vi.fn().mockResolvedValue(undefined),
    createVerificationToken: vi.fn().mockResolvedValue({ token: 't', id: 'tk1' }),
  },
}));
vi.mock('./auth.repo.js', () => ({ authRepo: repo }));

vi.mock('bcrypt', () => ({
  default: { hash: vi.fn().mockResolvedValue('hash'), compare: vi.fn().mockResolvedValue(true) },
  hash: vi.fn().mockResolvedValue('hash'),
  compare: vi.fn().mockResolvedValue(true),
}));

// Render a drizzle sql`` template object to a plain string + its param values,
// without depending on drizzle's internal property names (the SQL object stores
// static text in queryChunks[].value arrays and params as bare values). Same
// renderer as lib/withTenant.test.ts.
function renderSql(sqlObj: unknown): { text: string; params: unknown[] } {
  const chunks = (sqlObj as { queryChunks?: unknown[] }).queryChunks ?? [];
  let text = '';
  const params: unknown[] = [];
  for (const c of chunks) {
    if (c && typeof c === 'object' && 'value' in c) {
      const v = (c as { value: unknown }).value;
      text += Array.isArray(v) ? v.join('') : String(v);
    } else {
      params.push(c);
    }
  }
  return { text, params };
}

// Per-test configurable token record. The mock db.transaction closes over this
// binding; reassigning it per test changes what the fake tx.select() returns.
let currentRecord: Record<string, unknown> = {
  id: 'tk1',
  email: 'a@x.test',
  storeId: 's1',
  userType: 'customer',
  type: 'email_verification',
};

// Shared ordered call log. executeMock pushes 'set_config' here when it sees the
// set_config statement; the repo write mocks push their name via
// mockImplementationOnce. Ordering is asserted by index comparison.
const calls: string[] = [];

const selectChain = (rows: unknown[]) => {
  // Drizzle chain: tx.select().from(table).where(...).for('update') — thenable.
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.for = vi.fn(() => chain);
  chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(rows));
  return chain;
};

vi.mock('../../db/index.js', () => ({
  db: {
    transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        execute: executeMock,
        select: vi.fn(() => selectChain([currentRecord])),
        update: vi.fn(() => ({
          set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
        })),
      };
      return cb(tx);
    }),
  },
  dbAdmin: {},
  dbOwner: {},
}));

import { authService } from './auth.service.js';

describe('verifyEmail/resetPassword set app.tenant_id from the token storeId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calls.length = 0;
    currentRecord = {
      id: 'tk1',
      email: 'a@x.test',
      storeId: 's1',
      userType: 'customer',
      type: 'email_verification',
    };
    executeMock.mockImplementation(async (q: unknown) => {
      const { text, params } = renderSql(q);
      if (text.includes('set_config') && text.includes('app.tenant_id')) {
        calls.push('set_config');
        // Record the storeId param so we also assert the right tenant is set.
        calls.push(`set_config:${params[0] as string}`);
      } else {
        calls.push('execute:other');
      }
    });
  });

  it('verifyEmail calls set_config(app.tenant_id, record.storeId, true) before updateCustomerVerified', async () => {
    repo.updateCustomerVerified.mockImplementationOnce(async () => {
      calls.push('updateCustomerVerified');
      return [{ id: 'c1', storeId: 's1' }];
    });

    await authService.verifyEmail('tk-token');

    const setIdx = calls.indexOf('set_config');
    const writeIdx = calls.indexOf('updateCustomerVerified');
    expect(setIdx).toBeGreaterThanOrEqual(0);
    expect(writeIdx).toBeGreaterThanOrEqual(0);
    expect(setIdx).toBeLessThan(writeIdx);
    // The storeId passed to set_config is the token row's storeId.
    expect(calls).toContain('set_config:s1');
    expect(repo.updateCustomerVerified).toHaveBeenCalledWith('a@x.test', 's1', expect.any(Object));
  });

  it('resetPassword calls set_config(app.tenant_id, record.storeId, true) before updateCustomerPassword', async () => {
    currentRecord = {
      id: 'tk1',
      email: 'a@x.test',
      storeId: 's1',
      userType: 'customer',
      type: 'password_reset',
    };
    repo.updateCustomerPassword.mockImplementationOnce(async () => {
      calls.push('updateCustomerPassword');
      return undefined;
    });

    await authService.resetPassword('tk-token', 'newpw');

    const setIdx = calls.indexOf('set_config');
    const writeIdx = calls.indexOf('updateCustomerPassword');
    expect(setIdx).toBeGreaterThanOrEqual(0);
    expect(writeIdx).toBeGreaterThanOrEqual(0);
    expect(setIdx).toBeLessThan(writeIdx);
    expect(calls).toContain('set_config:s1');
    expect(repo.updateCustomerPassword).toHaveBeenCalledWith(
      'a@x.test',
      's1',
      expect.any(String),
      expect.any(Object),
    );
  });

  it('verifyEmail merchant branch does NOT call set_config (users table, no RLS this phase)', async () => {
    currentRecord = {
      id: 'tk1',
      email: 'm@x.test',
      storeId: null,
      userType: 'merchant',
      type: 'email_verification',
    };
    repo.findUserByEmail.mockResolvedValueOnce({ id: 'u1', email: 'm@x.test' });

    await authService.verifyEmail('tk-token');

    expect(calls).not.toContain('set_config');
    expect(repo.updateCustomerVerified).not.toHaveBeenCalled();
  });

  it('resetPassword merchant branch does NOT call set_config (users table, no RLS this phase)', async () => {
    currentRecord = {
      id: 'tk1',
      email: 'm@x.test',
      storeId: null,
      userType: 'merchant',
      type: 'password_reset',
    };
    repo.updateMerchantPassword.mockResolvedValueOnce(undefined);
    repo.findUserByEmail.mockResolvedValueOnce({ id: 'u1' });

    await authService.resetPassword('tk-token', 'newpw');

    expect(calls).not.toContain('set_config');
    expect(repo.updateCustomerPassword).not.toHaveBeenCalled();
  });
});
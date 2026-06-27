// apps/backend/src/lib/withTenant.test.ts
// Behavioral unit test for withTenant. Mocks db so no real connection is
// needed; asserts the helper's mechanics (transaction + set_config call +
// tx forwarding + return passthrough + error propagation). The end-to-end
// proof that set_config('app.tenant_id', …, true) actually scopes rows is
// the real-DB RLS negative test in wishlist.rls.test.ts (Task 7).
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted before top-level consts, so the factory must be
// self-contained. It builds a fake db whose transaction() constructs a tx
// { execute } and passes it to the callback, exactly like drizzle does.
vi.mock('../db/index.js', () => {
  const txExecute = vi.fn();
  const transaction = vi.fn(
    async (cb: (tx: { execute: typeof txExecute }) => Promise<unknown>) => {
      const tx = { execute: txExecute };
      return cb(tx);
    },
  );
  return { db: { transaction } };
});

import { db } from '../db/index.js';
import { withTenant } from './withTenant.js';

// Helpers to read the mock spies without fighting TypeScript's vi.fn typing.
const txMock = db.transaction as unknown as { mock: { calls: unknown[] } };

function txExecuteMockFromLastCall(): { mock: { calls: unknown[][] } } {
  // The last transaction() call passed our fake tx to the callback; capture it.
  let captured: { execute: { mock: { calls: unknown[][] } } } | null = null;
  void withTenant('capture', async (tx) => {
    captured = tx as typeof captured;
    return null;
  });
  return captured!.execute;
}

// Render a drizzle sql`` template object to a plain string + its param values,
// without depending on drizzle's internal property names (the SQL object
// stores static text in queryChunks[].value arrays and params as bare values).
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

describe('withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens exactly one transaction and returns fn result', async () => {
    const fn = vi.fn(async () => 'done');
    const result = await withTenant('store-123', fn);

    expect(result).toBe('done');
    expect(txMock.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('issues a set_config(app.tenant_id, …) call before running fn', async () => {
    const fn = vi.fn(async () => null);
    await withTenant('store-789', fn);

    // Capture the tx the helper passed to fn (await so the async mock resolves).
    let captured: { execute: { mock: { calls: unknown[][] } } } | null = null;
    await withTenant('store-789', async (tx) => {
      captured = tx as typeof captured;
      return null;
    });
    const executeCalls = captured!.execute.mock.calls;
    expect(executeCalls.length).toBeGreaterThanOrEqual(1);
    // The set_config statement is the first execute() arg — a drizzle SQL
    // template object. Render it without depending on its internal shape.
    const { text, params } = renderSql(executeCalls[0][0]);
    expect(text).toContain('set_config');
    expect(text).toContain('app.tenant_id');
    // set_config(name, value, is_local) — value is the storeId (a param);
    // is_local is a hardcoded `true` literal in the SQL text (NOT an
    // interpolation), so it can never be accidentally passed as false.
    expect(params).toContain('store-789');
    expect(text).toMatch(/,\s*true\)\s*$/);
  });

  it('passes the tx into fn so repos run on the scoped transaction', async () => {
    let received: { execute: unknown } | null = null;
    await withTenant('store-456', async (tx) => {
      received = tx;
      return null;
    });
    expect(received).toBeDefined();
    expect(typeof (received as { execute: unknown }).execute).toBe('function');
  });

  it('propagates errors thrown by fn (does not swallow them)', async () => {
    const fn = vi.fn(async () => {
      throw new Error('boom');
    });
    await expect(withTenant('store-err', fn)).rejects.toThrow('boom');
  });
});
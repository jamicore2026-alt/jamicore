# RLS Phase 1 — orders + order_items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [`) syntax for tracking.

**Goal:** Enable PostgreSQL Row-Level Security on `orders` and `order_items` (defense-in-depth on the already-correct `where eq(storeId)` filters) by threading every order read/write through `withTenant(storeId, fn)`, then flip RLS on in migration `0025` with a real-DB negative test.

**Architecture:** Apply the parent spec `docs/superpowers/specs/2026-06-27-rls-phase1-orders-design.md` (which applies `docs/superpowers/specs/2026-06-27-rls-design.md` §3/§4.1/§5). Two tables get RLS — `orders` + `order_items`, both §4.1 direct-`store_id` policy + FORCE (`order_items` has its own notNull storeId → direct, not a subquery child). The order-write graph spans 5 services; every `db.transaction` that reads/writes orders or order_items becomes `withTenant(storeId, fn)` (same tx, prefixed `set_config('app.tenant_id', storeId, true)`). Repo read methods that will be RLS-gated gain a `tx?: DbOrTx` param so they can ride the withTenant tx (a bare-`db` query uses a different pooled connection and would NOT see `app.tenant_id` → zero rows — this is the central correctness invariant). **RLS stays OFF through Tasks 1-6** (behavior-identical: `set_config` is a no-op for tables without RLS, and orders/order_items have none yet), then is enabled in Task 7. products/cart/coupons writes inside the same txs are untouched (no RLS → unaffected by `set_config`).

**Tech Stack:** Fastify v5, Drizzle ORM (postgres-js), PostgreSQL 17, vitest 4.1.4, pnpm ONLY.

## Global Constraints

Copied verbatim from `CLAUDE.md` + the parent RLS spec — every task's requirements implicitly include these:

- **pnpm ONLY** — Never `npm install`/`npm run`/any npm command. Run backend tests via `pnpm --filter backend test`; typecheck via `pnpm --filter backend typecheck`; lint via `pnpm --filter backend lint`.
- **Zero TypeScript errors** — `pnpm --filter backend typecheck` must pass with 0 errors after every task. **No `any` type** introduced.
- **No console.log** — Use `fastify.log.*` only (none of these tasks add logging; do not introduce `console.*`).
- **ESM imports only** — No `require()`. Use `.js` extensions in relative imports.
- **`withTenant` is the ONLY sanctioned tenant-context primitive** — never bare `SET`/`set_config(..., false)`/`SET SESSION`. Import from `../../lib/withTenant.js`.
- **`tx ?? db` pattern** — repo methods accept `tx?: DbOrTx` and use `const executor = tx ?? db;`. `DbOrTx` is `apps/backend/src/modules/_shared/db-types.ts`.
- **Admin reads stay on `dbAdmin`** — `orderRepo.findAll`/`findByIdAdmin`/`findOrderItems` are already on `dbAdmin` (BYPASSRLS); do NOT move them to `db` or `withTenant`.
- **storeId from JWT/Host only** — never from request body/query. Public paths use `request.storeId` (resolved by `scopes/public.ts` from the Host header, already cross-checked for webhooks at `webhook.service.ts:129,247`).
- **Existing suite must stay green** — Tasks 1-6 are pure refactor (RLS off → behavior identical). The 872-test backend suite is the primary regression gate and must remain green after every task. Do not weaken or delete existing tests.
- **Migration `.sql` is gitignored** — use `git add -f` for `apps/backend/drizzle/0025_orders_order_items_rls.sql`. The drizzle journal (`apps/backend/drizzle/meta/_journal.json`) IS tracked; append the new entry there.
- **TDD per task** — RED (failing test) → implement → GREEN → commit. Behavioral tests use `vi.mock` of `../../db/index.js` and/or `../../lib/withTenant.js` to assert routing, mirroring the existing `*.dbAdmin.test.ts` files. The Task 7 RLS test is a real-DB test (needs live Postgres with roles applied).

**Reference files (read these in the task that touches them):**
- `apps/backend/src/lib/withTenant.ts` — the primitive.
- `apps/backend/src/db/index.ts` — `db`/`dbAdmin`/`dbOwner` definitions + `runMigrations`.
- `apps/backend/src/modules/wishlist/wishlist.rls.test.ts` — the RLS negative-test pattern to mirror.
- `apps/backend/drizzle/0024_rls_wishlists_pilot.sql` — the migration pattern to mirror.
- `apps/backend/src/modules/order/order.repo.dbAdmin.test.ts` — the behavioral-routing test pattern to mirror.

---

### Task 1: Thread `tx` through all tenant-scoped `order.repo` read methods

**Why:** A bare-`db` query uses a different pooled connection than the withTenant tx, so it would NOT see `app.tenant_id` and would zero out under RLS. Every RLS-gated read must be able to ride the caller's tx. (Writes already accept `tx`.)

**Files:**
- Modify: `apps/backend/src/modules/order/order.repo.ts` (methods `findByStoreId`, `findByCustomerId`, `findById`, `findByIdSimple`, `findByOrderNumber`, `findOrderItemsByOrderId`)
- Test: `apps/backend/src/modules/order/order.repo.tx.test.ts` (create)

**Interfaces:**
- Produces: the 6 methods above gain an optional trailing `tx?: DbOrTx` param and use `const executor = tx ?? db;` for their `orders`/`orderItems` queries. Existing callers (which pass no tx) are unaffected — `tx ?? db` resolves to `db`, identical behavior (RLS still off).

**Current signatures (verify against the file before editing):**
```ts
findByStoreId(storeId, opts)            // order.repo.ts ~:21   uses db.select(...) + db.query...
findByCustomerId(storeId, customerId, opts) // ~:77          uses db.query.orders.findMany + db.select count
findById(orderId, storeId)             // :184                db.query.orders.findFirst + db.query.products.findMany (batch)
findByIdSimple(orderId, storeId)       // :220                db.query.orders.findFirst
findByOrderNumber(orderNumber, storeId)// :226                db.query.orders.findFirst
findOrderItemsByOrderId(orderId, storeId) // :246             db.query.orderItems.findMany
```

- [ ] **Step 1: Write the failing test** — `apps/backend/src/modules/order/order.repo.tx.test.ts`

```ts
// Behavioral test: the RLS-gated order read methods accept and use a `tx`
// (so they can ride a withTenant transaction's app.tenant_id). Under RLS a
// bare-`db` query runs on a different pooled connection and would NOT see
// app.tenant_id → zero rows. Asserts each method forwards to `tx`, not `db`,
// when a tx is passed; and falls back to `db` when no tx is passed (preserving
// existing call sites).
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db so we can observe which client a method uses. Both `db` and a passed
// `tx` are thenable-ish Drizzle stand-ins: we only assert call routing, so a
// minimal chain mock suffices.
const ordersFindFirst = vi.fn().mockResolvedValue(undefined);
const ordersFindMany = vi.fn().mockResolvedValue([]);
const orderItemsFindMany = vi.fn().mockResolvedValue([]);
const productsFindMany = vi.fn().mockResolvedValue([]);
const selectChain = vi.fn(() => {
  const chain: Record<string, unknown> = {};
  for (const m of ['from', 'where', 'orderBy', 'limit', 'offset', 'innerJoin', 'leftJoin', 'groupBy']) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ rows: [], length: 0 }));
  return chain;
});
const dbSelect = vi.fn(() => selectChain());

vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      orders: { findFirst: ordersFindFirst, findMany: ordersFindMany },
      orderItems: { findMany: orderItemsFindMany },
      products: { findMany: productsFindMany },
    },
    select: dbSelect,
  },
  dbAdmin: { query: { orders: { findFirst: vi.fn(), findMany: vi.fn() } } },
  dbOwner: {},
}));

import { db } from '../../db/index.js';
import { orderRepo } from './order.repo.js';

// A fake tx: same shape as `db.query` so `executor.query...` works. We detect
// tx-usage by giving the tx distinct mocks and asserting the tx mock (not the
// db mock) was called.
function makeTx() {
  return {
    query: {
      orders: { findFirst: vi.fn().mockResolvedValue(undefined), findMany: vi.fn().mockResolvedValue([]) },
      orderItems: { findMany: vi.fn().mockResolvedValue([]) },
      products: { findMany: vi.fn().mockResolvedValue([]) },
    },
    select: vi.fn(() => selectChain()),
  };
}

describe('order.repo tenant read methods thread tx', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findByIdSimple uses tx when provided, else db', async () => {
    const tx = makeTx();
    await orderRepo.findByIdSimple('o1', 's1', tx as never);
    expect(tx.query.orders.findFirst).toHaveBeenCalledWith(expect.objectContaining({}));
    expect(ordersFindFirst).not.toHaveBeenCalled();

    await orderRepo.findByIdSimple('o2', 's2');
    expect(ordersFindFirst).toHaveBeenCalled();
  });

  it('findOrderItemsByOrderId uses tx when provided, else db', async () => {
    const tx = makeTx();
    await orderRepo.findOrderItemsByOrderId('o1', 's1', tx as never);
    expect(tx.query.orderItems.findMany).toHaveBeenCalled();
    expect(orderItemsFindMany).not.toHaveBeenCalled();
  });

  it('findById uses tx for the orders lookup when provided', async () => {
    const tx = makeTx();
    await orderRepo.findById('o1', 's1', tx as never);
    expect(tx.query.orders.findFirst).toHaveBeenCalled();
    expect(ordersFindFirst).not.toHaveBeenCalled();
  });

  it('findByOrderNumber uses tx when provided', async () => {
    const tx = makeTx();
    await orderRepo.findByOrderNumber('ON-1', 's1', tx as never);
    expect(tx.query.orders.findFirst).toHaveBeenCalled();
  });

  it('findByCustomerId uses tx when provided', async () => {
    const tx = makeTx();
    await orderRepo.findByCustomerId('s1', 'c1', { page: 1, limit: 10 }, tx as never);
    expect(tx.query.orders.findMany).toHaveBeenCalled();
    expect(ordersFindMany).not.toHaveBeenCalled();
  });

  it('findByStoreId uses tx when provided', async () => {
    const tx = makeTx();
    await orderRepo.findByStoreId('s1', { page: 1, limit: 10 }, tx as never);
    expect(tx.query.orders.findMany).toHaveBeenCalled();
  });
});
```

> Adjust the exact mock shape only if the real Drizzle call form differs (e.g. `findById`'s secondary products batch-load). The assertions must verify: **when a tx is passed, the tx's mock is called and `db`'s mock is NOT**; **when no tx is passed, `db`'s mock is called** (fallback preserved). If `findByStoreId`/`findByCustomerId` use `db.select(...)` rather than `db.query...`, assert against `dbSelect`/`tx.select` instead — read the method body and match it.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter backend test -- src/modules/order/order.repo.tx.test.ts`
Expected: FAIL — the methods don't accept `tx` yet (TS error: "Expected 2-3 arguments, but got 4") / `tx` mocks not called.

- [ ] **Step 3: Implement — add `tx?: DbOrTx` to the 6 methods, use `const executor = tx ?? db;`**

For each method, change `db.query.orders...` / `db.query.orderItems...` / `db.select(...)` to `executor.query...` / `executor.select(...)`. Concretely:

- `findByStoreId(storeId, opts)` → `findByStoreId(storeId, opts, tx?: DbOrTx)`: add `const executor = tx ?? db;` as the first line; replace every `db.` in the body with `executor.` (both the `findMany` and the count `select`).
- `findByCustomerId(storeId, customerId, opts)` → add `tx?: DbOrTx`; `const executor = tx ?? db;`; replace `db.` → `executor.`.
- `findById(orderId, storeId)` → `findById(orderId, storeId, tx?: DbOrTx)`: `const executor = tx ?? db;`; use `executor.query.orders.findFirst(...)` for the order lookup. The secondary products batch-load (`db.query.products.findMany`) — products has NO RLS this phase, but for uniformity use `executor.query.products.findMany(...)` too (harmless; forward-safe for the catalog phase).
- `findByIdSimple(orderId, storeId)` → `findByIdSimple(orderId, storeId, tx?: DbOrTx)`: `const executor = tx ?? db;`; `return executor.query.orders.findFirst(...)`.
- `findByOrderNumber(orderNumber, storeId)` → `findByOrderNumber(orderNumber, storeId, tx?: DbOrTx)`: `const executor = tx ?? db;`; `return executor.query.orders.findFirst(...)`.
- `findOrderItemsByOrderId(orderId, storeId)` → `findOrderItemsByOrderId(orderId, storeId, tx?: DbOrTx)`: `const executor = tx ?? db;`; `return executor.query.orderItems.findMany(...)`.

Do NOT touch `findAll`, `findByIdAdmin`, `findOrderItems` (they use `dbAdmin` — leave as-is). Do NOT touch the write methods (they already take `tx`).

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter backend test -- src/modules/order/order.repo.tx.test.ts`
Expected: PASS (6/6).

- [ ] **Step 5: Run the full backend suite + typecheck (regression gate)**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: typecheck 0 errors; full suite green (872 + 6 new = 878, or however many the new file adds). No existing test regresses — `tx ?? db` falls back to `db` for all current call sites.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/order/order.repo.ts apps/backend/src/modules/order/order.repo.tx.test.ts
git commit -m "refactor(rls): thread tx through order.repo tenant read methods (Phase 1 prep)

Adds tx?: DbOrTx to findByStoreId/findByCustomerId/findById/findByIdSimple/
findByOrderNumber/findOrderItemsByOrderId so they can ride a withTenant tx's
app.tenant_id. Behavior unchanged (tx ?? db falls back to db; RLS still off).
Prep for orders+order_items RLS — a bare-db read would not see app.tenant_id."
```

---

### Task 2: Thread `tx` through `pos.repo` read methods

**Why:** `posRepo.generateOrderNumber` (bare-`db` orders uniqueness read), `listPosOrders`, and `findPosOrderById` (loads `items` → order_items) read RLS-gated tables on bare `db`. Under RLS they'd zero out. They need to ride a withTenant tx.

**Files:**
- Modify: `apps/backend/src/modules/pos/pos.repo.ts` (`generateOrderNumber`, `createOrder` caller fix, `listPosOrders`, `findPosOrderById`)
- Test: `apps/backend/src/modules/pos/pos.repo.tx.test.ts` (create)

**Interfaces:**
- `generateOrderNumber(tx?: DbOrTx)` — uses `executor.query.orders.findFirst` for the uniqueness check.
- `createOrder(data, tx)` — change its internal `this.generateOrderNumber()` call to `this.generateOrderNumber(tx)` so the uniqueness check rides the same tx.
- `listPosOrders(storeId, opts, tx?: DbOrTx)` — `const executor = tx ?? db;`; both the `findMany` and the count `select` use `executor`.
- `findPosOrderById(orderId, storeId, tx?: DbOrTx)` — `const executor = tx ?? db;`; `executor.query.orders.findFirst`.

- [ ] **Step 1: Write the failing test** — `apps/backend/src/modules/pos/pos.repo.tx.test.ts`

Mirror the Task 1 test structure: mock `../../db/index.js` (`db` + `dbAdmin`), provide a `makeTx()` with distinct mocks, assert that when a tx is passed the tx mock is called and `db`'s is not, and that no-tx falls back to `db`. Cover: `generateOrderNumber(tx)`, `listPosOrders(storeId, opts, tx)`, `findPosOrderById(orderId, storeId, tx)`. For `createOrder`, assert it calls `generateOrderNumber(tx)` (spy on `posRepo.generateOrderNumber`).

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const ordersFindFirst = vi.fn().mockResolvedValue(undefined);
const ordersFindMany = vi.fn().mockResolvedValue([]);
const selectChain = vi.fn(() => {
  const chain: Record<string, unknown> = {};
  for (const m of ['from', 'where', 'orderBy', 'limit', 'offset']) chain[m] = vi.fn(() => chain);
  chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ count: 0 }));
  return chain;
});
const dbSelect = vi.fn(() => selectChain());

vi.mock('../../db/index.js', () => ({
  db: { query: { orders: { findFirst: ordersFindFirst, findMany: ordersFindMany } }, select: dbSelect },
  dbAdmin: { query: { orders: { findFirst: vi.fn(), findMany: vi.fn() } } },
  dbOwner: {},
}));

import { db } from '../../db/index.js';
import { posRepo } from './pos.repo.js';

function makeTx() {
  return {
    query: { orders: { findFirst: vi.fn().mockResolvedValue(undefined), findMany: vi.fn().mockResolvedValue([]) } },
    select: vi.fn(() => selectChain()),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 'o1' }]) })) })),
  };
}

describe('pos.repo tenant read methods thread tx', () => {
  beforeEach(() => vi.clearAllMocks());

  it('generateOrderNumber uses tx when provided', async () => {
    const tx = makeTx();
    await posRepo.generateOrderNumber(tx as never);
    expect(tx.query.orders.findFirst).toHaveBeenCalled();
    expect(ordersFindFirst).not.toHaveBeenCalled();
  });

  it('listPosOrders uses tx when provided', async () => {
    const tx = makeTx();
    await posRepo.listPosOrders('s1', { page: 1, limit: 10 }, tx as never);
    expect(tx.query.orders.findMany).toHaveBeenCalled();
    expect(ordersFindMany).not.toHaveBeenCalled();
  });

  it('findPosOrderById uses tx when provided', async () => {
    const tx = makeTx();
    await posRepo.findPosOrderById('o1', 's1', tx as never);
    expect(tx.query.orders.findFirst).toHaveBeenCalled();
  });

  it('createOrder passes its tx to generateOrderNumber', async () => {
    const tx = makeTx();
    const spy = vi.spyOn(posRepo, 'generateOrderNumber').mockResolvedValue('POS-X');
    await posRepo.createOrder({
      storeId: 's1', cashierId: 'u1', email: 'c@x', currency: 'USD',
      orderType: 'pos', paymentMethod: 'cash', items: [], subtotal: 0, tax: 0, total: 0, status: 'completed',
    }, tx as never);
    expect(spy).toHaveBeenCalledWith(tx);
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter backend test -- src/modules/pos/pos.repo.tx.test.ts`
Expected: FAIL (no `tx` param / `db` used instead of `tx`).

- [ ] **Step 3: Implement**

In `apps/backend/src/modules/pos/pos.repo.ts`:
- `generateOrderNumber(): Promise<string>` → `generateOrderNumber(tx?: DbOrTx): Promise<string>`: add `const executor = tx ?? db;`; change `db.query.orders.findFirst` → `executor.query.orders.findFirst`.
- In `createOrder(data, tx)`: change `const orderNumber = await this.generateOrderNumber();` → `const orderNumber = await this.generateOrderNumber(tx);`.
- `listPosOrders(storeId, opts)` → `listPosOrders(storeId, opts, tx?: DbOrTx)`: `const executor = tx ?? db;`; replace `db.query.orders.findMany` → `executor.query.orders.findMany` and `db.select(...)` → `executor.select(...)`.
- `findPosOrderById(orderId, storeId)` → `findPosOrderById(orderId, storeId, tx?: DbOrTx)`: `const executor = tx ?? db;`; `return executor.query.orders.findFirst(...)`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter backend test -- src/modules/pos/pos.repo.tx.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Full suite + typecheck**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: 0 type errors; full suite green.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/pos/pos.repo.ts apps/backend/src/modules/pos/pos.repo.tx.test.ts
git commit -m "refactor(rls): thread tx through pos.repo read methods (Phase 1 prep)

generateOrderNumber/listPosOrders/findPosOrderById accept tx?: DbOrTx and
ride it (executor = tx ?? db); createOrder passes its tx to generateOrderNumber.
Behavior unchanged (RLS off). Prep for orders RLS."
```

---

### Task 3: Thread `tx` through `return.repo.findByStore`

**Why:** `returnRepo.findByStore` eagerly loads `with: { order: true }` (the `orders` relation). Under orders-RLS, that relation read on bare `db` would zero out (returns row present, `order` null). It needs to ride a withTenant tx. (`findByIdWithItems` already accepts `tx` and loads `order` + `orderItem`; `findById` reads `returns` only — no RLS this phase — so leave it bare.)

**Files:**
- Modify: `apps/backend/src/modules/return/return.repo.ts` (`findByStore`)
- Test: `apps/backend/src/modules/return/return.repo.tx.test.ts` (create)

- [ ] **Step 1: Write the failing test** — `apps/backend/src/modules/return/return.repo.tx.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const returnsFindMany = vi.fn().mockResolvedValue([]);
const selectChain = vi.fn(() => {
  const chain: Record<string, unknown> = {};
  for (const m of ['from', 'where', 'limit', 'offset', 'orderBy']) chain[m] = vi.fn(() => chain);
  chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ count: 0 }));
  return chain;
});
const dbSelect = vi.fn(() => selectChain());

vi.mock('../../db/index.js', () => ({
  db: { query: { returns: { findMany: returnsFindMany } }, select: dbSelect },
  dbAdmin: {}, dbOwner: {},
}));

import { db } from '../../db/index.js';
import { returnRepo } from './return.repo.js';

function makeTx() {
  return {
    query: { returns: { findMany: vi.fn().mockResolvedValue([]) } },
    select: vi.fn(() => selectChain()),
  };
}

describe('return.repo.findByStore threads tx', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses tx when provided, else db', async () => {
    const tx = makeTx();
    await returnRepo.findByStore('s1', 1, 10, undefined, undefined, tx as never);
    expect(tx.query.returns.findMany).toHaveBeenCalled();
    expect(returnsFindMany).not.toHaveBeenCalled();

    await returnRepo.findByStore('s1', 1, 10);
    expect(returnsFindMany).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter backend test -- src/modules/return/return.repo.tx.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `apps/backend/src/modules/return/return.repo.ts`, `findByStore(storeId, page, limit, status?, customerId?)` → `findByStore(storeId, page, limit, status?, customerId?, tx?: DbOrTx)`:
- add `const executor = tx ?? db;`
- `db.query.returns.findMany` → `executor.query.returns.findMany`
- `db.select({ count }).from(returns).where(where)` → `executor.select({ count: count() }).from(returns).where(where)`

Leave `findById` (returns-only), `findByOrder` (returns-only), and the write methods unchanged.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter backend test -- src/modules/return/return.repo.tx.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite + typecheck**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: 0 type errors; full suite green.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/return/return.repo.ts apps/backend/src/modules/return/return.repo.tx.test.ts
git commit -m "refactor(rls): thread tx through return.repo.findByStore (Phase 1 prep)

findByStore loads the orders relation; under orders-RLS a bare-db read would
zero out the joined order. Accept tx?: DbOrTx (executor = tx ?? db). Behavior
unchanged (RLS off)."
```

---

### Task 4: Wrap `order.service` operations in `withTenant`

**Why:** `orderService.create` (checkout tx), `updateStatus`, and the read entries (`findById`/`findByStoreId`/`findByCustomerId`) read/write `orders`+`order_items`. Under RLS they zero out unless `app.tenant_id` is set. Wrap each at the service-entry level (parent spec §3). `create`'s existing `db.transaction` BECOMES the withTenant tx (not nested in one).

**Files:**
- Modify: `apps/backend/src/modules/order/order.service.ts`
- Test: `apps/backend/src/modules/order/order.service.withTenant.test.ts` (create)

**Interfaces:**
- Consumes: Task 1's `tx`-threaded `orderRepo` read methods.
- Produces: `orderService` methods run all order/order_items DB work inside `withTenant(storeId, fn)`.

- [ ] **Step 1: Write the failing test** — `apps/backend/src/modules/order/order.service.withTenant.test.ts`

Assert `withTenant` is invoked with the correct storeId for each entry, and that the inner repo calls receive the withTenant tx. Mock `withTenant` to capture the storeId and forward a fake tx; mock `orderRepo` to record the tx passed.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const withTenantMock = vi.fn();
vi.mock('../../lib/withTenant.js', () => ({
  // Run fn with a sentinel tx so we can assert repos received it.
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    const sentinelTx = { __sentinel: 'tx', query: {}, select: vi.fn(), insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })) })) };
    return fn(sentinelTx);
  },
}));

const repo = {
  findByStoreId: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  findByCustomerId: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  findById: vi.fn().mockResolvedValue({ id: 'o1', storeId: 's1', items: [] }),
  findByIdSimple: vi.fn().mockResolvedValue({ id: 'o1', storeId: 's1', status: 'pending', paymentStatus: 'pending', fulfillmentStatus: 'unfulfilled' }),
  updateOrder: vi.fn().mockResolvedValue({ id: 'o1' }),
};
vi.mock('./order.repo.js', () => ({ orderRepo: repo }));
// create() also touches webhookService/notificationService/superAdminService (fire-and-forget) — mock them.
vi.mock('../webhook/webhook.service.js', () => ({ webhookService: { dispatchWebhook: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('../notifications/notifications.service.js', () => ({ notificationService: { createNotification: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('../superAdmin/superAdmin.service.js', () => ({ superAdminService: { createNotification: vi.fn().mockResolvedValue(undefined) } }));

import { orderService } from './order.service.js';

describe('order.service wraps order work in withTenant', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('findByStoreId runs inside withTenant(storeId)', async () => {
    await orderService.findByStoreId('s1', { page: 1, limit: 10 });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findByStoreId).toHaveBeenCalledWith('s1', expect.any(Object), expect.any(Object));
  });

  it('findByCustomerId runs inside withTenant(storeId)', async () => {
    await orderService.findByCustomerId('s1', 'c1', { page: 1, limit: 10 });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
  });

  it('findById runs inside withTenant(storeId)', async () => {
    await orderService.findById('o1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findById).toHaveBeenCalledWith('o1', 's1', expect.any(Object));
  });

  it('updateStatus runs inside withTenant(storeId) and passes tx to repo reads/writes', async () => {
    await orderService.updateStatus('o1', 's1', 'shipped');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findByIdSimple).toHaveBeenCalledWith('o1', 's1', expect.any(Object));
    expect(repo.updateOrder).toHaveBeenCalledWith('o1', 's1', expect.any(Object), expect.any(Object));
  });
});
```

> `create` is the heaviest path (retries on `orders_order_number_unique`). Add one assertion that `create` invokes `withTenant` with `data.storeId` and that `insertOrder`/`insertOrderItems` receive the tx — but `create`'s exact internal repo calls are many; assert at minimum `withTenantMock` was called with `data.storeId` and `orderRepo.insertOrder` received a 2nd arg that is the sentinel tx. Keep the `create` test minimal but meaningful.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter backend test -- src/modules/order/order.service.withTenant.test.ts`
Expected: FAIL — `withTenant` not imported/used yet.

- [ ] **Step 3: Implement** — `apps/backend/src/modules/order/order.service.ts`

1. Add the import: `import { withTenant } from '../../lib/withTenant.js';` (keep `import { db } from '../../db/index.js';` — it may no longer be referenced after the change; if `db` becomes unused, remove it to avoid the lint `no-unused-vars`. Check: `create` currently uses `db.transaction`; after the change it uses `withTenant`, so `db` is likely unused — remove the `db` import and the file-header comment "Imports db ONLY for db.transaction()" no longer holds; update the comment to "Order service — business logic, domain errors, transaction orchestration via withTenant.").
2. `create(data)`: replace `result = await db.transaction(async (tx) => {` with `result = await withTenant(data.storeId, async (tx) => {`. The body (which already threads `tx` to every `orderRepo` call) is unchanged. Keep the retry loop and the `23505`/`orders_order_number_unique` handling exactly as-is. The final `return this.findById(result.id, data.storeId);` — `findById` is now wrapped in withTenant internally (see below), so no change at the call site.
3. `updateStatus(orderId, storeId, status)`: wrap the whole body in `withTenant(storeId, async (tx) => { ... })`. Move the existing logic inside, changing:
   - `const order = await orderRepo.findByIdSimple(orderId, storeId);` → `const order = await orderRepo.findByIdSimple(orderId, storeId, tx);`
   - both `return orderRepo.updateOrder(orderId, storeId, updateData);` → `return orderRepo.updateOrder(orderId, storeId, updateData, tx);`
4. `findById(orderId, storeId)`: change `const order = await orderRepo.findById(orderId, storeId);` to `const order = await withTenant(storeId, (tx) => orderRepo.findById(orderId, storeId, tx));` (keep the not-found throw after).
5. `findByStoreId(storeId, opts)`: wrap the `orderRepo.findByStoreId` call: `const { data, total } = await withTenant(storeId, (tx) => orderRepo.findByStoreId(storeId, { page, limit, status: ..., search: ..., dateFrom: ..., dateTo: ... }, tx));`.
6. `findByCustomerId(storeId, customerId, opts)`: `const { data, total } = await withTenant(storeId, (tx) => orderRepo.findByCustomerId(storeId, customerId, { page, limit }, tx));`.

> Note: `updateStatus`'s early returns (`ORDER_CANCELLED`, `ORDER_ALREADY_PAID`, `ORDER_ALREADY_FULFILLED` throws) can stay inside the withTenant closure — they throw, which rolls back the (read-only-so-far) tx and propagates. That's correct. Only the final `updateOrder` calls need `tx`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter backend test -- src/modules/order/order.service.withTenant.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite + typecheck (critical regression gate)**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: 0 type errors; full suite green — `order.service.test.ts`, `order.route.*.test.ts`, checkout/payment tests must all still pass. This is the proof the refactor is behavior-identical (RLS off).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/order/order.service.ts apps/backend/src/modules/order/order.service.withTenant.test.ts
git commit -m "refactor(rls): wrap order.service in withTenant (Phase 1 prep)

create/updateStatus/findById/findByStoreId/findByCustomerId now run all
orders+order_items DB work inside withTenant(storeId, fn) (set_config
app.tenant_id tx-local). create's db.transaction becomes the withTenant tx
(no nesting). Behavior unchanged (RLS off; set_config no-op for non-RLS
tables). Prep for orders+order_items RLS."
```

---

### Task 5: Wrap payment intent + webhook order work in `withTenant`

**Why:** `intentService.createPaymentIntent` (COD/Razorpay/Stripe) and `webhookService.handleWebhook` (Razorpay/Stripe) read/write `orders`+`order_items`. Under RLS they zero out. The COD intent + both webhooks decrement inventory via `findOrderItemsByOrderId` (currently bare-`db` → would return `[]` → **silent inventory under-decrement on paid orders**, the worst latent defect). The external provider API calls (Razorpay/Stripe) MUST stay outside any tx (don't hold a tx across network IO), so reads and writes are wrapped separately.

**Files:**
- Modify: `apps/backend/src/modules/payment/payment.intent.service.ts`, `apps/backend/src/modules/payment/payment.webhook.service.ts`
- Test: `apps/backend/src/modules/payment/payment.withTenant.test.ts` (create)

**Key invariants:**
- External API calls (`createRazorpayOrder`, `createStripePaymentIntent`) stay outside `withTenant` (between the pre-read and the write-tx), exactly as today.
- Webhook `storeId` comes from the public route's Host-header resolution and is already cross-checked `payment.storeId !== storeId` (`webhook.service.ts:129,247`) BEFORE the tx — so `withTenant(payment.storeId, ...)` cannot be spoofed to a wrong tenant.

- [ ] **Step 1: Write the failing test** — `apps/backend/src/modules/payment/payment.withTenant.test.ts`

Assert: (a) `intentService.createPaymentIntent` for COD invokes `withTenant(storeId, ...)` for the write tx AND passes the tx to `orderRepo.findOrderItemsByOrderId`; (b) the pre-tx `orderRepo.findByIdSimple` call is wrapped in `withTenant(storeId, ...)`; (c) `webhookService.getPaymentStatus` wraps the `findByIdSimple` order read in `withTenant`. Mock `withTenant` (forward sentinel tx), `orderRepo`, `repo` (payment.repo), `webhookService.findProviderByStoreId`, and the external API functions (mock `createRazorpayOrder`/`createStripePaymentIntent` to resolve canned objects) so no network is hit. Keep assertions focused on routing (withTenant called with storeId; tx passed to findOrderItemsByOrderId).

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const withTenantMock = vi.fn();
const sentinelTx = { __sentinel: 'tx', query: {}, insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 'p1' }]) })) })) };
vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => { withTenantMock(storeId); return fn(sentinelTx); },
}));

const orderRepo = {
  findByIdSimple: vi.fn().mockResolvedValue({ id: 'o1', storeId: 's1', status: 'pending', paymentStatus: 'pending', currency: 'USD', total: '10.00' }),
  updateOrder: vi.fn().mockResolvedValue({ id: 'o1' }),
  findOrderItemsByOrderId: vi.fn().mockResolvedValue([]),
  decrementInventory: vi.fn().mockResolvedValue([{ id: 'p1' }]),
};
vi.mock('../order/order.repo.js', () => ({ orderRepo }));
const productRepo = { decrementVariantOptionStock: vi.fn().mockResolvedValue([{ id: 'v1' }]) };
vi.mock('../product/product.repo.js', () => ({ productRepo }));

const payRepo = {
  findPaymentByOrderId: vi.fn().mockResolvedValue(undefined),
  insertPayment: vi.fn().mockResolvedValue({ id: 'p1', amount: '10.00', currency: 'USD' }),
  transitionPaymentToCompleted: vi.fn().mockResolvedValue({ id: 'p1' }),
  findProvider: vi.fn().mockResolvedValue({ config: '{}' }),
  findPayment: vi.fn(),
};
vi.mock('./payment.repo.js', () => ({ __esModule: true, ...payRepo, default: payRepo }));
// Note: payment.repo is imported as `* as repo` in the service — adjust the mock export to match (named exports). Read the service imports and mirror them.
```

> The payment services import payment.repo both as `* as repo` (webhook) and `* as repo` (intent) — verify by reading the top of each service file and shape the mock so `repo.findPaymentByOrderId`, `repo.insertPayment`, `repo.findProvider`, `repo.transitionPaymentToCompleted` exist. Mock `webhookService.findProviderByStoreId` (intent calls it) to resolve `{ isEnabled: true, config: { key_id: 'k', key_secret: 's', secret_key: 's', publishable_key: 'p' } }`. Mock the external API helpers (`createRazorpayOrder`/`createStripePaymentIntent`) — they're module-private functions, so instead mock at the `fetch` level OR stub via `vi.spyOn` is not possible for non-exported fns; the simplest is to test only the COD path for intent (no external API) + the getPaymentStatus path for webhook (no external API), which both avoid the network entirely. **Limit the intent test to the COD path** and the **webhook test to `getPaymentStatus`** — both are network-free and exercise withTenant wrapping. Add a separate, lighter assertion that the Razorpay/Stripe write txs use `withTenant` by spying on `db.transaction`-replacement is not feasible without network; so for Razorpay/Stripe, assert via the `withTenantMock` call count only if you stub the external call. Prefer: test COD (full) + getPaymentStatus (full); for Razorpay/Stripe, trust the code-review gate + the existing webhook tests, and add a unit assertion that `withTenant` is invoked when the write tx runs by mocking the external API via injecting a mocked `fetch` (global `vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'r1', client_secret: 'cs', amount: 1000, currency: 'usd' }) }))`).

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter backend test -- src/modules/payment/payment.withTenant.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement — `payment.intent.service.ts`**

Add `import { withTenant } from '../../lib/withTenant.js';`. (`db` import: after the change the 3 `db.transaction` calls become `withTenant`; if `db` becomes unused, remove it.)

- **Pre-tx order read** (`:20`): `const order = await orderRepo.findByIdSimple(orderId, storeId);` → `const order = await withTenant(storeId, (tx) => orderRepo.findByIdSimple(orderId, storeId, tx));`
- **COD tx** (`:66`): `const result = await db.transaction(async (tx) => {` → `const result = await withTenant(storeId, async (tx) => {`. Inside, change `const items = await orderRepo.findOrderItemsByOrderId(orderId, storeId);` (`:90`) → `const items = await orderRepo.findOrderItemsByOrderId(orderId, storeId, tx);`. (The `repo.insertPayment`, `orderRepo.updateOrder`, `productRepo.decrementVariantOptionStock`, `orderRepo.decrementInventory` calls already receive `tx` — leave them.)
- **Razorpay tx** (`:138`): `const result = await db.transaction(async (tx) => {` → `const result = await withTenant(storeId, async (tx) => {`. Body already threads `tx` (`repo.insertPayment`, `orderRepo.updateOrder`). No `findOrderItemsByOrderId` here.
- **Stripe tx** (`:180`): same → `withTenant(storeId, async (tx) => {`.

- [ ] **Step 4: Implement — `payment.webhook.service.ts`**

Add `import { withTenant } from '../../lib/withTenant.js';`. (`db` is still used for `db.query.payments.findFirst` at `:118`/`:236` — `payments` has NO RLS this phase, so those stay on bare `db`. Keep the `db` import.)

- **`getPaymentStatus`** (`:38`): `const order = await orderRepo.findByIdSimple(orderId, storeId);` → `const order = await withTenant(storeId, (tx) => orderRepo.findByIdSimple(orderId, storeId, tx));` (`repo.findPaymentByOrderId` reads `payments` — no RLS — leave bare).
- **Razorpay webhook tx** (`:139`): `await db.transaction(async (tx) => {` → `await withTenant(payment.storeId, async (tx) => {`. Inside, change `const items = await orderRepo.findOrderItemsByOrderId(payment.orderId, payment.storeId);` (`:164`) → `... findOrderItemsByOrderId(payment.orderId, payment.storeId, tx);`. (`payment.storeId` was already validated `=== storeId` at `:129`.)
- **Stripe webhook tx** (`:257`): `await db.transaction(async (tx) => {` → `await withTenant(payment.storeId, async (tx) => {`. Inside, `findOrderItemsByOrderId(payment.orderId, payment.storeId)` (`:280`) → add `, tx`.
- Leave `findProviderByStoreId` (`:67`) bare (reads `payment_providers` — no RLS this phase).

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter backend test -- src/modules/payment/payment.withTenant.test.ts`
Expected: PASS.

- [ ] **Step 6: Full suite + typecheck (critical — COD inventory + webhook inventory tests)**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: 0 type errors; full suite green. The COD inventory-decrement tests and webhook inventory tests MUST still pass — this is the proof `findOrderItemsByOrderId` now rides the tx correctly.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/payment/payment.intent.service.ts apps/backend/src/modules/payment/payment.webhook.service.ts apps/backend/src/modules/payment/payment.withTenant.test.ts
git commit -m "refactor(rls): wrap payment intent+webhook order work in withTenant (Phase 1 prep)

COD/Razorpay/Stripe intent txs and Razorpay/Stripe webhook txs become
withTenant(storeId, fn); findOrderItemsByOrderId now rides the tx (was bare-db
→ would return [] under order_items-RLS → silent inventory under-decrement on
paid orders). Pre-tx order reads (findByIdSimple) wrapped in withTenant.
External provider API calls stay outside any tx. payments lookups stay on bare
db (no RLS this phase). Behavior unchanged (RLS off)."
```

---

### Task 6: Wrap POS + return order work in `withTenant`

**Why:** `posService.createPosOrder`/`listPosOrders`/`getPosOrder` and `returnService.createReturn`/`processRefund`/`getReturn`/`listReturns` read/write `orders`+`order_items` (directly or via `with: { order }` / `with: { items }` relations). Under RLS they zero out.

**Files:**
- Modify: `apps/backend/src/modules/pos/pos.service.ts`, `apps/backend/src/modules/return/return.service.ts`
- Test: `apps/backend/src/modules/pos/pos.service.withTenant.test.ts`, `apps/backend/src/modules/return/return.service.withTenant.test.ts` (create)

- [ ] **Step 1: Write the failing tests**

`pos.service.withTenant.test.ts` — assert `createPosOrder`, `listPosOrders`, `getPosOrder` invoke `withTenant(storeId, ...)` and that `posRepo.createOrder`/`listPosOrders`/`findPosOrderById` receive the tx. Mock `withTenant` (sentinel tx), `posRepo`, and the products read inside createPosOrder (`tx.query.products.findMany`) by having the sentinel tx expose a `query.products.findMany` mock. (For createPosOrder, the sentinel tx must also support `.query.products.findMany` returning `[]` so the product validation loop sees no products → throws `PRODUCT_NOT_FOUND`; to avoid that, have the products mock return a canned product matching `input.items[0].productId`. Read `createPosOrder` to shape the canned product.)

`return.service.withTenant.test.ts` — assert `createReturn` invokes `withTenant(data.storeId, ...)` and passes tx to `orderRepo.findById`; `getReturn` and `listReturns` invoke `withTenant(storeId, ...)`; `processRefund`'s `findByIdWithItems` read is wrapped in `withTenant`. Mock `withTenant` (sentinel tx), `returnRepo`, `orderRepo`, `paymentRepo`, `refundService`.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter backend test -- src/modules/pos/pos.service.withTenant.test.ts src/modules/return/return.service.withTenant.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement — `pos.service.ts`**

Add `import { withTenant } from '../../lib/withTenant.js';`. (`db` import: `createPosOrder`'s `db.transaction` becomes `withTenant`; `db` likely unused after — remove if so.)

- `createPosOrder(storeId, cashierId, cashierEmail, storeCurrency, input)`: replace `return await db.transaction(async (tx) => {` (`:59`) with `return await withTenant(storeId, async (tx) => {`. Body unchanged (it already uses `tx` for the products read + `posRepo.decrementInventory` + `posRepo.createOrder`). `posRepo.createOrder(data, tx)` already passes tx → its internal `generateOrderNumber(tx)` (Task 2) now rides the tx.
- `listPosOrders(storeId, query)`: `return posRepo.listPosOrders(storeId, query);` → `return withTenant(storeId, (tx) => posRepo.listPosOrders(storeId, query, tx));`
- `getPosOrder(orderId, storeId)`: `const order = await posRepo.findPosOrderById(orderId, storeId);` → `const order = await withTenant(storeId, (tx) => posRepo.findPosOrderById(orderId, storeId, tx));` (keep the not-found throw after).

- [ ] **Step 4: Implement — `return.service.ts`**

Add `import { withTenant } from '../../lib/withTenant.js';`. (`db` is still used by `processRefund`'s `db.transaction` at `:203` — see below whether to wrap it. For THIS phase that tx only writes `products` (restoreInventory) + `returns` (transitionStatus) — neither has RLS — so it does NOT strictly need withTenant. Leave it as `db.transaction` to keep the change minimal and avoid holding tenant context across the provider refund API call's surrounding logic. Keep the `db` import.)

- `createReturn(data)`: replace `return db.transaction(async (tx) => {` (`:23`) with `return withTenant(data.storeId, async (tx) => {`. Inside, change `const order = await orderRepo.findById(data.orderId, data.storeId);` (`:24`) → `... findById(data.orderId, data.storeId, tx);`. The `tx.select().from(orderItems)` at `:41` already rides tx → now sees `app.tenant_id` (correct). The `returns`/`returnItems` reads at `:53`/`:56` (no RLS) and `returnRepo.create`/`createItem`/`findByIdWithItems` (already take tx at `:97`) — `findByIdWithItems(ret.id, data.storeId, tx)` already passes tx. No other change.
- `getReturn(id, storeId)`: `const ret = await returnRepo.findByIdWithItems(id, storeId);` (`:156`) → `const ret = await withTenant(storeId, (tx) => returnRepo.findByIdWithItems(id, storeId, tx));`
- `listReturns(storeId, opts)`: `const result = await returnRepo.findByStore(storeId, page, limit, opts?.status, opts?.customerId);` (`:143`) → `const result = await withTenant(storeId, (tx) => returnRepo.findByStore(storeId, page, limit, opts?.status, opts?.customerId, tx));`
- `processRefund(returnId, storeId)`: the pre-tx `returnRepo.findByIdWithItems(returnId, storeId)` (`:181`) reads `orders`+`order_items` via relations → wrap: `const ret = await withTenant(storeId, (tx) => returnRepo.findByIdWithItems(returnId, storeId, tx));`. Leave the `db.transaction` at `:203` as-is (writes products/returns only, no RLS this phase). Leave `returnRepo.findById(returnId, storeId)` at `:228` bare (returns-only, no RLS). Leave `updateStatus` (`:101`) as-is (reads returns only via `returnRepo.findById`, no orders/order_items read).

- [ ] **Step 5: Run to verify they pass**

Run: `pnpm --filter backend test -- src/modules/pos/pos.service.withTenant.test.ts src/modules/return/return.service.withTenant.test.ts`
Expected: PASS.

- [ ] **Step 6: Full suite + typecheck**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: 0 type errors; full suite green (POS + return tests included).

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/pos/pos.service.ts apps/backend/src/modules/return/return.service.ts apps/backend/src/modules/pos/pos.service.withTenant.test.ts apps/backend/src/modules/return/return.service.withTenant.test.ts
git commit -m "refactor(rls): wrap POS + return order work in withTenant (Phase 1 prep)

createPosOrder/listPosOrders/getPosOrder and createReturn/getReturn/listReturns/
processRefund(findByIdWithItems) run order/order_items work inside
withTenant(storeId, fn). createReturn's order_items validation read (:41) now
sees app.tenant_id. processRefund's refund tx left as db.transaction (writes
only products+returns — no RLS this phase). Behavior unchanged (RLS off)."
```

---

### Task 7: Enable RLS on `orders` + `order_items` (migration `0025`) + negative test

**Why:** The refactor (Tasks 1-6) is behavior-identical with RLS off. Now flip RLS on and prove the DB enforces isolation independently of the app layer.

**Files:**
- Create: `apps/backend/drizzle/0025_orders_order_items_rls.sql` (gitignored → `git add -f`)
- Modify: `apps/backend/drizzle/meta/_journal.json` (append entry idx 26)
- Create: `apps/backend/src/modules/order/orders.rls.test.ts` (real-DB negative test, mirrors `wishlist.rls.test.ts`)

- [ ] **Step 1: Write the migration SQL** — `apps/backend/drizzle/0025_orders_order_items_rls.sql`

```sql
-- RLS Phase 1: orders + order_items. Both are §4.1 tenant tables (storeId
-- uuid notNull); order_items has its own storeId so it gets a DIRECT policy,
-- not a subquery-via-orders child. See
-- docs/superpowers/specs/2026-06-27-rls-phase1-orders-design.md §3.
-- Roles + grants are created by scripts/rls-roles.ts (idempotent bootstrap),
-- NOT here, so passwords never live in the migration journal.

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON orders;
CREATE POLICY tenant_iso ON orders
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON order_items;
CREATE POLICY tenant_iso ON order_items
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```

- [ ] **Step 2: Register the migration in the journal** — `apps/backend/drizzle/meta/_journal.json`

Append a new entry to the `entries` array (after the `0024` entry, idx 25). Use a `when` value strictly greater than the `0024` entry's `1780843000000` (e.g. `1780843100000`). No snapshot file is needed (the `0024` pilot has no snapshot either; `migrate()` reads the journal + `.sql`, not snapshots):

```json
    {
      "idx": 26,
      "version": "7",
      "when": 1780843100000,
      "tag": "0025_orders_order_items_rls",
      "breakpoints": true
    }
```

- [ ] **Step 3: Write the failing real-DB negative test** — `apps/backend/src/modules/order/orders.rls.test.ts`

Mirror `apps/backend/src/modules/wishlist/wishlist.rls.test.ts` exactly in structure (tenantUrl, `tenantClient`/`tenantDb` with `max: 1`, `beforeAll` seeds via `dbOwner`, `setTenant(storeId|null)` helper, `afterAll` cleanup). Seed: two stores (A, B), one order per store (each with `email` + `currency` + `subtotal`/`total` notNull + `orderNumber` unique + `storeId`), and one `order_items` row per order (carrying `storeId`, `orderId`, `productTitle`, `quantity`, `price`, `total`). Tests:

1. fail-closed: `setTenant(null)` → `tenantDb.query.orders.findMany()` is `[]` AND `tenantDb.query.orderItems.findMany()` is `[]`.
2. single-tenant: `setTenant(storeAId)` → sees store A's order(s) only; `orders.findMany` length 1, `storeId === storeAId`; `orderItems.findMany` length 1, `storeId === storeAId`.
3. cross-tenant isolation: `setTenant(storeAId)` → no row with `storeId === storeBId` in either table.
4. `setTenant(storeBId)` → sees store B's order + items.
5. WITH CHECK reject: `setTenant(storeAId)` → inserting an `orders` row with `storeId: storeBId` rejects; inserting an `order_items` row with `storeId: storeBId` (and an `orderId` belonging to store A) rejects.
6. WITH CHECK accept: `setTenant(storeAId)` → insert `orders` with `storeId: storeAId` succeeds (cleanup); insert `order_items` with `storeId: storeAId` + the new order's id succeeds (cleanup).

> Required notNull columns for an `orders` insert (from `schema.ts:406-460`): `storeId`, `orderNumber` (unique — use random), `email`, `currency`, `subtotal`, `total`. For `order_items` (`:470-484`): `orderId`, `storeId`, `productTitle`, `quantity`, `price`, `total`. Generate a unique `orderNumber` per insert (e.g. `` `RLS-${Date.now()}-${Math.random().toString(36).slice(2)}` `` — but `Date.now` is fine in a test file, NOT in a workflow script). Use `crypto.randomUUID()` for ids where helpful.

- [ ] **Step 4: Apply the migration + run the RLS test**

Apply the migration (runs as `dbOwner`): `pnpm --filter backend exec node --experimental-vm-modules -e "import('./src/db/index.js').then(m => m.runMigrations()).then(() => { console.log('migrated'); process.exit(0); })"` — OR the project's existing migration command (check `apps/backend/package.json` `scripts` for a `db:migrate`/`migrate` script; if present, use `pnpm --filter backend run <script>`). Verify via psql that the policies exist: `psql "$DATABASE_URL" -c "\d+ orders" -c "SELECT polname FROM pg_policy WHERE polrelid = 'orders'::regclass;"` (orders + order_items each have `tenant_iso`; `rowsecurity` enabled + forced).

Run: `pnpm --filter backend test -- src/modules/order/orders.rls.test.ts`
Expected: PASS (6/6) — requires live Postgres with `app_tenant`/`app_admin` roles applied (`scripts/rls-roles.ts`) and `DATABASE_URL` + `RLS_TENANT_PASSWORD` set. If the env isn't set, this test is skipped/erroring like `wishlist.rls.test.ts` — confirm it's not a code regression by checking the existing wishlist RLS test runs the same way.

- [ ] **Step 5: Full suite + typecheck (final gate before RLS goes live)**

Run: `pnpm --filter backend typecheck && pnpm --filter backend lint && pnpm --filter backend test`
Expected: 0 type errors; lint clean; full suite green (872 + all the new routing tests + 6 RLS tests). This is the proof the withTenant refactor survives RLS being ON.

- [ ] **Step 6: Force-add the gitignored migration + commit**

```bash
git add -f apps/backend/drizzle/0025_orders_order_items_rls.sql
git add apps/backend/drizzle/meta/_journal.json apps/backend/src/modules/order/orders.rls.test.ts
git commit -m "feat(rls): enable RLS on orders + order_items (Phase 1)

Migration 0025: ENABLE+FORCE RLS + tenant_iso policy (NULLIF-hardened) on
orders and order_items (both 4.1 direct store_id; order_items has its own
storeId). Closes the order-write graph zero-out risk: every order read/write
now runs inside withTenant(storeId) (Tasks 1-6), so RLS sees app.tenant_id.
Real-DB negative test (orders.rls.test.ts) proves fail-closed, single-tenant
visibility, cross-tenant isolation, and WITH CHECK reject/accept for both
tables. Defense-in-depth on the existing where eq(storeId) filters."
```

---

## Post-implementation

- Update `docs/PROGRESS.md` with a "## 2026-06-27 — RLS Phase 1: orders + order_items" record (tables enabled, services refactored, test count).
- Update memory `rls_phase2a_domain_repo_followup.md` / a new `rls_phase1_orders` memory: orders+order_items now have RLS; the spec §5 staleness list shrinks (orders + order_items no longer "no RLS"; products/cart/coupons/customers still pending).
- The remaining RLS Phase 1 modules (cart/coupons → customers → catalog → reviews → …) are separate plans per parent spec §5. Do not start them in this plan.

## Self-review (run after writing — done during planning)

- **Spec coverage:** every item in `2026-06-27-rls-phase1-orders-design.md` §4 (repo threading 4.1, order.service 4.2, payment 4.3/4.4, pos 4.5, return 4.6, read routes 4.7) maps to a task. §3 migration → Task 7. §6 testing → per-task + Task 7. ✓
- **Placeholder scan:** no TBD/TODO; migration + test code are complete. The behavioral-test mocks are specified with exact shapes (with a noted "adjust if Drizzle call form differs" guard for `findById`'s products batch — that's an instruction, not a placeholder). ✓
- **Type consistency:** `tx?: DbOrTx` + `const executor = tx ?? db;` used uniformly; `withTenant(storeId, fn)` signature matches `lib/withTenant.ts`. ✓
- **Invariant preserved:** admin reads (`findAll`/`findByIdAdmin`/`findOrderItems`) stay on `dbAdmin` — no task moves them. ✓
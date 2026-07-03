# RLS Phase 1 — cart + coupons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [`) syntax for tracking.

**Goal:** Enable PostgreSQL Row-Level Security on `carts`, `cart_items`, `coupons`, and `coupon_usages` (defense-in-depth on the already-correct `where eq(storeId)` filters) by threading every cart/coupon read/write through `withTenant(storeId, fn)`, routing the cross-tenant abandoned-cart cron to `dbAdmin`, seeding coupons via `dbOwner`, then flipping RLS on in migration `0026` with a real-DB negative test.

**Architecture:** Apply the module spec `docs/superpowers/specs/2026-06-28-rls-phase1-cart-coupons-design.md` (which applies `docs/superpowers/specs/2026-06-27-rls-design.md` §3/§4.1/§4.2/§5). Four tables get RLS: `carts` (§4.1 direct), `cart_items` (§4.2 subquery→`carts`, no `storeId`), `coupons` (§4.1 direct), `coupon_usages` (§4.1 direct — has its **own** `storeId notNull`, not a subquery child). Each cart/coupon service entry's `db.transaction` (where present) *becomes* `withTenant(storeId, fn)` (same tx, prefixed `set_config('app.tenant_id', storeId, true)`); read entries wrap a single repo call in `withTenant`. Repo read methods that will be RLS-gated gain a `tx?: DbOrTx` param so they can ride the withTenant tx (a bare-`db` query uses a different pooled connection and would NOT see `app.tenant_id` → zero rows — the central correctness invariant). **The load-bearing fix:** `couponService.validateCoupon` is called by `pricingService.computeOrderPricing` *before* `orderService.create`'s withTenant tx, so wrapping `validateCoupon` in its own `withTenant` self-provides tenant context — otherwise every coupon checkout silently breaks under coupons-RLS. **RLS stays OFF through Tasks 1-7** (behavior-identical: `set_config` is a no-op for tables without RLS, and carts/cart_items/coupons/coupon_usages have none yet), then is enabled in Task 8. `orderService.create`'s cart/coupon paths are already RLS-safe from Phase 1 (it already threads its withTenant tx to `findCartByIdScoped`/`deleteCartItems`/`resetCartTotals`/`incrementCouponUsage`) — this plan does NOT touch `order.service.ts`.

**Tech Stack:** Fastify v5, Drizzle ORM (postgres-js), PostgreSQL 17, vitest 4.1.4, pnpm ONLY.

## Global Constraints

Copied verbatim from `CLAUDE.md` + the parent RLS spec — every task's requirements implicitly include these:

- **pnpm ONLY** — Never `npm install`/`npm run`/any npm command. Run backend tests via `pnpm --filter backend test`; typecheck via `pnpm --filter backend typecheck`; lint via `pnpm --filter backend lint`.
- **Zero TypeScript errors** — `pnpm --filter backend typecheck` must pass with 0 errors after every task. **No `any` type** introduced.
- **No console.log** — Use `fastify.log.*` only (none of these tasks add logging; do not introduce `console.*`). The cron already uses a `Logger` — keep it.
- **ESM imports only** — No `require()`. Use `.js` extensions in relative imports.
- **`withTenant` is the ONLY sanctioned tenant-context primitive** — never bare `SET`/`set_config(..., false)`/`SET SESSION`. Import from `../../lib/withTenant.js` (or `../../../lib/withTenant.js` from deeper paths).
- **`tx ?? db` pattern** — repo methods accept `tx?: DbOrTx` and use `const executor = tx ?? db;`. `DbOrTx` is `apps/backend/src/modules/_shared/db-types.ts`.
- **`dbAdmin` (BYPASSRLS) for inherently cross-tenant reads** — the abandoned-cart cron scans all stores; route it to `dbAdmin`. Do NOT route tenant-scoped reads to `dbAdmin`.
- **`dbOwner` (BYPASSRLS) for seeding RLS tables** — the coupons seed must bypass `WITH CHECK`.
- **storeId from JWT/Host only** — never from request body/query. Public paths use `request.storeId` (resolved by `scopes/public.ts` from the Host header).
- **External calls stay OUTSIDE any withTenant tx** — `queueService.*Queue.add` (Redis) and any provider API call run after/around the tx, never inside.
- **Existing suite must stay green** — Tasks 1-7 are pure refactor (RLS off → behavior identical). The 913-test backend suite is the primary regression gate and must remain green after every task. Do not weaken or delete existing tests.
- **Migration `.sql` is gitignored** — use `git add -f` for `apps/backend/drizzle/0026_cart_coupons_rls.sql`. The drizzle journal (`apps/backend/drizzle/meta/_journal.json`) IS tracked; append the new entry there. Roles/grants come from `src/scripts/rls-roles.ts` (which grants DML on ALL tables in `public` to `app_tenant`+`app_admin`), so the migration carries ONLY `ENABLE`/`FORCE`/policy statements — NO grants.
- **TDD per task** — RED (failing test) → implement → GREEN → commit. Behavioral tests use `vi.mock` of `../../db/index.js` and/or `../../lib/withTenant.js` to assert routing, mirroring `order.repo.tx.test.ts` / `order.service.withTenant.test.ts`. The Task 8 RLS test is a real-DB test (needs live Postgres with roles applied).

**Reference files (read these in the task that touches them):**
- `apps/backend/src/lib/withTenant.ts` — the primitive.
- `apps/backend/src/db/index.ts` — `db`/`dbAdmin`/`dbOwner` definitions + `runMigrations`.
- `apps/backend/src/modules/order/orders.rls.test.ts` — the RLS negative-test pattern to mirror (closest template: two tenant tables + items child).
- `apps/backend/src/modules/wishlist/wishlist.rls.test.ts` — the simpler RLS negative-test pattern.
- `apps/backend/drizzle/0025_orders_order_items_rls.sql` — the migration pattern to mirror (NULLIF-hardened direct policy).
- `apps/backend/src/modules/order/order.repo.tx.test.ts` — the behavioral repo-routing test pattern to mirror.
- `apps/backend/src/modules/order/order.service.withTenant.test.ts` — the sentinel-tx service-wrapping test pattern to mirror.

---

### Task 1: Thread `tx` through `cart.repo` read methods

**Why:** A bare-`db` query uses a different pooled connection than the withTenant tx, so it would NOT see `app.tenant_id` and would zero out under RLS. Every RLS-gated cart read must be able to ride the caller's tx. (All `cartRepo` write methods already accept `tx?: DbOrTx`; the 6 read methods do not.)

**Files:**
- Modify: `apps/backend/src/modules/cart/cart.repo.ts` (methods `findCartById`, `findCartBySessionId`, `findCartItemsByCartId`, `findCartItemById`, `findCartItemsByProductId`, `findCartByCustomerId`)
- Test: `apps/backend/src/modules/cart/cart.repo.tx.test.ts` (create)

**Interfaces:**
- Produces: the 6 read methods gain an optional trailing `tx?: DbOrTx` param and use `const executor = tx ?? db;` for their `carts`/`cartItems` queries. Existing callers (which pass no tx) are unaffected — `tx ?? db` resolves to `db`, identical behavior (RLS still off).

**Current signatures (verify against the file before editing):**
```ts
findCartById(cartId, storeId)              // cart.repo.ts:14  db.query.carts.findFirst (with: items/product/bundle)
findCartBySessionId(sessionId)             // :40              db.query.carts.findFirst (no storeId filter — dead code, no callers)
findCartItemsByCartId(cartId)              // :62              db.select().from(cartItems).where(eq(cartItems.cartId, cartId))
findCartItemById(itemId, cartId)           // :66              db.select().from(cartItems).where(...)
findCartItemsByProductId(cartId, productId)// :72              db.select().from(cartItems).where(...)
findCartByCustomerId(customerId, storeId)  // :149             db.query.carts.findFirst (with: items/product/bundle)
```

- [ ] **Step 1: Write the failing test** — `apps/backend/src/modules/cart/cart.repo.tx.test.ts`

```ts
// Behavioral test: the RLS-gated cart read methods accept and use a `tx` so
// they can ride a withTenant transaction's app.tenant_id. Under RLS a bare-`db`
// query runs on a different pooled connection and would NOT see app.tenant_id
// → zero rows. Asserts each method forwards to `tx`, not `db`, when a tx is
// passed; and falls back to `db` when no tx is passed (preserving existing
// call sites).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const cartsFindFirst = vi.fn().mockResolvedValue(undefined);
const selectChain = vi.fn(() => {
  const chain: Record<string, unknown> = {};
  for (const m of ['from', 'where', 'then']) {
    chain[m] = m === 'then'
      ? vi.fn((resolve: (v: unknown) => unknown) => resolve([]))
      : vi.fn(() => chain);
  }
  return chain;
});
const dbSelect = vi.fn(() => selectChain());

vi.mock('../../db/index.js', () => ({
  db: {
    query: { carts: { findFirst: cartsFindFirst } },
    select: dbSelect,
  },
  dbAdmin: {},
  dbOwner: {},
}));

import { db } from '../../db/index.js';
import { cartRepo } from './cart.repo.js';

// A fake tx: same shape as `db` so `executor.query...` / `executor.select(...)`
// work. We detect tx-usage by giving the tx distinct mocks and asserting the
// tx mock (not the db mock) was called.
function makeTx() {
  return {
    query: { carts: { findFirst: vi.fn().mockResolvedValue(undefined) } },
    select: vi.fn(() => selectChain()),
  };
}

describe('cart.repo tenant read methods thread tx', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findCartById uses tx when provided, else db', async () => {
    const tx = makeTx();
    await cartRepo.findCartById('c1', 's1', tx as never);
    expect(tx.query.carts.findFirst).toHaveBeenCalled();
    expect(cartsFindFirst).not.toHaveBeenCalled();

    await cartRepo.findCartById('c2', 's2');
    expect(cartsFindFirst).toHaveBeenCalled();
  });

  it('findCartBySessionId uses tx when provided', async () => {
    const tx = makeTx();
    await cartRepo.findCartBySessionId('sess-1', tx as never);
    expect(tx.query.carts.findFirst).toHaveBeenCalled();
    expect(cartsFindFirst).not.toHaveBeenCalled();
  });

  it('findCartByCustomerId uses tx when provided', async () => {
    const tx = makeTx();
    await cartRepo.findCartByCustomerId('cust-1', 's1', tx as never);
    expect(tx.query.carts.findFirst).toHaveBeenCalled();
  });

  it('findCartItemsByCartId uses tx.select when provided, else db.select', async () => {
    const tx = makeTx();
    await cartRepo.findCartItemsByCartId('c1', tx as never);
    expect(tx.select).toHaveBeenCalled();
    expect(dbSelect).not.toHaveBeenCalled();

    await cartRepo.findCartItemsByCartId('c2');
    expect(dbSelect).toHaveBeenCalled();
  });

  it('findCartItemById uses tx.select when provided', async () => {
    const tx = makeTx();
    await cartRepo.findCartItemById('i1', 'c1', tx as never);
    expect(tx.select).toHaveBeenCalled();
  });

  it('findCartItemsByProductId uses tx.select when provided', async () => {
    const tx = makeTx();
    await cartRepo.findCartItemsByProductId('c1', 'p1', tx as never);
    expect(tx.select).toHaveBeenCalled();
  });
});
```

> The `findCartById`/`findCartByCustomerId` bodies use `db.query.carts.findFirst`; the `findCartItemsByCartId`/`findCartItemById`/`findCartItemsByProductId` bodies use `db.select().from(cartItems)...`. The test asserts the correct client per method shape. If the real Drizzle call form differs when you read the file, adjust the chain mock — but keep the invariant: **tx passed → tx mock called, db mock NOT; no tx → db mock called**.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter backend test -- src/modules/cart/cart.repo.tx.test.ts`
Expected: FAIL — the methods don't accept `tx` yet (TS error "Expected 2-3 arguments, but got 3") / `tx` mocks not called.

- [ ] **Step 3: Implement — add `tx?: DbOrTx` to the 6 methods, use `const executor = tx ?? db;`**

In `apps/backend/src/modules/cart/cart.repo.ts`:

- `findCartById(cartId, storeId)` → `findCartById(cartId, storeId, tx?: DbOrTx)`: add `const executor = tx ?? db;` as the first line; change `return db.query.carts.findFirst(...)` → `return executor.query.carts.findFirst(...)`.
- `findCartBySessionId(sessionId)` → `findCartBySessionId(sessionId, tx?: DbOrTx)`: `const executor = tx ?? db;`; `return executor.query.carts.findFirst(...)`. (Dead code — no callers — but threaded for consistency per the spec §4.1.)
- `findCartItemsByCartId(cartId)` → `findCartItemsByCartId(cartId, tx?: DbOrTx)`: `const executor = tx ?? db;`; `return executor.select().from(cartItems).where(eq(cartItems.cartId, cartId));`.
- `findCartItemById(itemId, cartId)` → `findCartItemById(itemId, cartId, tx?: DbOrTx)`: `const executor = tx ?? db;`; `executor.select().from(cartItems).where(...)`.
- `findCartItemsByProductId(cartId, productId)` → `findCartItemsByProductId(cartId, productId, tx?: DbOrTx)`: `const executor = tx ?? db;`; `executor.select().from(cartItems).where(...)`.
- `findCartByCustomerId(customerId, storeId)` → `findCartByCustomerId(customerId, storeId, tx?: DbOrTx)`: `const executor = tx ?? db;`; `return executor.query.carts.findFirst(...)`.

Do NOT touch the write methods (they already take `tx`). Do NOT add a `storeId` filter to `findCartBySessionId` (out of scope — dead code, deferred).

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter backend test -- src/modules/cart/cart.repo.tx.test.ts`
Expected: PASS (6/6).

- [ ] **Step 5: Run the full backend suite + typecheck (regression gate)**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: typecheck 0 errors; full suite green. No existing test regresses — `tx ?? db` falls back to `db` for all current call sites.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/cart/cart.repo.ts apps/backend/src/modules/cart/cart.repo.tx.test.ts
git commit -m "refactor(rls): thread tx through cart.repo read methods (Phase 1 prep)

Adds tx?: DbOrTx to findCartById/findCartBySessionId/findCartItemsByCartId/
findCartItemById/findCartItemsByProductId/findCartByCustomerId so they can ride
a withTenant tx's app.tenant_id. Behavior unchanged (tx ?? db falls back to db;
RLS still off). Prep for carts+cart_items RLS — a bare-db read would not see
app.tenant_id."
```

---

### Task 2: Wrap `cart.service` operations in `withTenant`

**Why:** `cartService.getOrCreateCart`, `mergeCartOnLogin`, `recalculateTotals`, `addItem`, `updateItemQuantity`, `removeItem` read/write `carts`+`cart_items`. Under RLS they zero out unless `app.tenant_id` is set. Wrap each at the service-entry level (parent spec §3). `mergeCartOnLogin`'s existing `db.transaction` BECOMES the withTenant tx (remove the inner `db.transaction` wrapper — do NOT keep a nested one).

**Files:**
- Modify: `apps/backend/src/modules/cart/cart.service.ts`
- Test: `apps/backend/src/modules/cart/cart.service.withTenant.test.ts` (create)

**Interfaces:**
- Consumes: Task 1's `tx`-threaded `cartRepo` read methods.
- Produces: `cartService` methods run all carts/cart_items DB work inside `withTenant(storeId, fn)`. `recalculateTotals` gains a `storeId` first param: `recalculateTotals(storeId, cartId)` — callers in this file (`addItem`, `updateItemQuantity`, `removeItem`) already hold `storeId` and are updated in Step 3 to pass it.

- [ ] **Step 1: Write the failing test** — `apps/backend/src/modules/cart/cart.service.withTenant.test.ts`

```ts
// Verifies cartService wraps all carts/cart_items DB work in withTenant(storeId, fn)
// (RLS Phase 1 prep). withTenant + cartRepo + pricingService + productRepo are mocked.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  // Run fn with a sentinel tx so we can assert repos received it.
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    const sentinelTx = { __sentinel: 'tx' };
    return fn(sentinelTx);
  },
}));

const { repo } = vi.hoisted(() => ({
  repo: {
    findCartById: vi.fn().mockResolvedValue(undefined),
    findCartByCustomerId: vi.fn().mockResolvedValue(undefined),
    findCartItemsByCartId: vi.fn().mockResolvedValue([]),
    findCartItemsByProductId: vi.fn().mockResolvedValue([]),
    findCartItemById: vi.fn().mockResolvedValue(null),
    insertCart: vi.fn().mockResolvedValue({ id: 'c1', storeId: 's1', items: [] }),
    insertCartItem: vi.fn().mockResolvedValue({ id: 'i1', cartId: 'c1', quantity: 1, price: '10.00', total: '10.00' }),
    insertCartItemsBatch: vi.fn().mockResolvedValue([]),
    incrementCartItemQuantities: vi.fn().mockResolvedValue([]),
    updateCartItem: vi.fn().mockResolvedValue({ id: 'i1', quantity: 1, price: '10.00', total: '10.00' }),
    deleteCartItem: vi.fn().mockResolvedValue(undefined),
    deleteCart: vi.fn().mockResolvedValue(undefined),
    updateCartCustomerId: vi.fn().mockResolvedValue({ id: 'c1' }),
    updateCartTotals: vi.fn().mockResolvedValue({ id: 'c1' }),
    recalculateCartTotalsInDb: vi.fn().mockResolvedValue({ id: 'c1', subtotal: '10.00', total: '10.00', itemCount: 1 }),
  },
}));
vi.mock('./cart.repo.js', () => ({ cartRepo: repo }));

// addItem/updateItemQuantity call pricingService.computeItemPrice + productRepo.findById.
const { productRepo } = vi.hoisted(() => ({
  productRepo: {
    findById: vi.fn().mockResolvedValue({ id: 'p1', storeId: 's1', currentQuantity: 100 }),
    findManyByIds: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('../product/product.repo.js', () => ({ productRepo }));

const { pricingService } = vi.hoisted(() => ({
  pricingService: {
    computeItemPrice: vi.fn().mockResolvedValue({ effectivePrice: '10.00', lineTotal: '10.00' }),
  },
}));
vi.mock('../pricing/pricing.service.js', () => ({ pricingService }));

import { cartService } from './cart.service.js';

describe('cart.service wraps cart work in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getOrCreateCart runs inside withTenant(storeId) and threads tx to findCartById/insertCart', async () => {
    await cartService.getOrCreateCart('c1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    // When a cartId is provided and found, findCartById is called with the tx;
    // when not found, insertCart is called with the tx.
    expect(repo.findCartById).toHaveBeenCalledWith('c1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('getOrCreateCart (new cart) runs inside withTenant and inserts on tx', async () => {
    repo.findCartById.mockResolvedValueOnce(undefined);
    await cartService.getOrCreateCart(undefined, 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.insertCart).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('recalculateTotals(storeId, cartId) runs inside withTenant(storeId)', async () => {
    await cartService.recalculateTotals('s1', 'c1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.recalculateCartTotalsInDb).toHaveBeenCalledWith('c1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('addItem runs inside withTenant(storeId) and threads tx to inserts/recalc', async () => {
    repo.findCartItemsByProductId.mockResolvedValueOnce([]);
    await cartService.addItem('c1', 's1', { productId: 'p1', quantity: 1 }, 'cust-1', undefined);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.insertCartItem).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ __sentinel: 'tx' }));
    expect(repo.recalculateCartTotalsInDb).toHaveBeenCalledWith('c1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('updateItemQuantity runs inside withTenant(storeId)', async () => {
    await cartService.updateItemQuantity('c1', 'i1', 2, 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.updateCartItem).toHaveBeenCalledWith('i1', expect.any(Object), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('removeItem runs inside withTenant(storeId)', async () => {
    await cartService.removeItem('c1', 'i1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.deleteCartItem).toHaveBeenCalledWith('i1', 'c1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('mergeCartOnLogin runs inside withTenant(storeId)', async () => {
    repo.findCartById.mockResolvedValueOnce({ id: 'guest', storeId: 's1', customerId: undefined, items: [] });
    repo.findCartByCustomerId.mockResolvedValueOnce(undefined);
    await cartService.mergeCartOnLogin('guest', 'cust-1', 's1', undefined);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.updateCartCustomerId).toHaveBeenCalledWith('guest', 'cust-1', expect.objectContaining({ __sentinel: 'tx' }));
  });
});
```

> `mergeCartOnLogin`'s exact internal branch behavior is complex; the test covers the simplest branch (`guestCart && !customerCart` → `updateCartCustomerId`) and asserts `withTenant` was invoked with `storeId`. That is sufficient to prove the wrap; the full suite (Step 5) covers the merge-transaction branch.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter backend test -- src/modules/cart/cart.service.withTenant.test.ts`
Expected: FAIL — `withTenant` not imported/used yet; `recalculateTotals` still takes `(cartId)`.

- [ ] **Step 3: Implement** — `apps/backend/src/modules/cart/cart.service.ts`

1. Add the import: `import { withTenant } from '../../lib/withTenant.js';`. The file currently imports `import { db } from '../../db/index.js';` and uses `db.transaction` only inside `mergeCartOnLogin`. After Step 3d, `db` is no longer referenced — **remove the `db` import** and the `import { cartItems } from '../../db/schema.js';` / `import { eq, sql } from 'drizzle-orm';` imports IF they become unused (the `tx.select(...).from(cartItems)...` aggregate inside `mergeCartOnLogin` is replaced by `cartRepo.updateCartTotals` on the tx — see 3d — so `cartItems`/`eq`/`sql` may become unused; verify with typecheck and remove unused imports to keep lint clean).
2. `getOrCreateCart(cartId, storeId)`:
   ```ts
   async getOrCreateCart(cartId: string | undefined, storeId: string) {
     return withTenant(storeId, async (tx) => {
       if (cartId) {
         const existingCart = await cartRepo.findCartById(cartId, storeId, tx);
         if (existingCart) {
           return { cart: existingCart, isNew: false };
         }
       }
       const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
       const newCart = await cartRepo.insertCart({
         storeId,
         sessionId: crypto.randomUUID(),
         subtotal: '0',
         total: '0',
         itemCount: 0,
         expiresAt,
       }, tx);
       return { cart: { ...newCart, items: [] }, isNew: true };
     });
   }
   ```
3. `recalculateTotals(cartId)` → `recalculateTotals(storeId: string, cartId: string)`:
   ```ts
   async recalculateTotals(storeId: string, cartId: string) {
     return withTenant(storeId, (tx) => cartRepo.recalculateCartTotalsInDb(cartId, tx));
   }
   ```
   Update the three internal call sites (`addItem` lines ~304 & ~322, `updateItemQuantity` ~349, `removeItem` ~361) from `cartService.recalculateTotals(cartId)` → `cartService.recalculateTotals(storeId, cartId)`.
4. `mergeCartOnLogin(guestCartId, customerId, storeId, queueService?)`: wrap the **entire** method body in `withTenant(storeId, async (tx) => { ... })`. **Remove the inner `db.transaction(async (tx) => {...})` wrapper** (the block at lines ~177-199) and run its body directly on the withTenant `tx` (no nested transaction). All `cartRepo` calls inside pass `tx`: `findCartById(guestCartId, storeId, tx)`, `findCartByCustomerId(customerId, storeId, tx)`, `deleteCart(guestCartId, tx)`, `findCartItemsByCartId(customerCart.id, tx)`, `insertCartItemsBatch(toInsert, tx)`, `incrementCartItemQuantities(toIncrement, tx)`, `updateCartTotals(...)`, `updateCartCustomerId(guestCartId, customerId, tx)`. Replace the inline `tx.select(...).from(cartItems)...` aggregate (lines ~185-191) with `cartRepo.updateCartTotals(customerCart.id, totals.subtotal, totals.subtotal, totals.itemCount, tx)` — BUT the aggregate currently computes subtotal+itemCount only; `recalculateCartTotalsInDb(customerCart.id, tx)` is the cleaner replacement (single UPDATE that sets subtotal+total+itemCount). Use `await cartRepo.recalculateCartTotalsInDb(customerCart.id, tx);` in place of the manual aggregate + `updateCartTotals`. The `productRepo.findManyByIds(productIds, storeId)` call (products, no RLS) stays bare OR rides `tx` — for forward-safety pass nothing extra (it has no tx param); leave it as `productRepo.findManyByIds(productIds, storeId)` (products have no RLS this phase). The `scheduleAbandonedCartRecovery(...)` queue-add MUST stay **outside** the withTenant tx — so restructure: have the wrapped body return a sentinel (e.g. whether recovery should be scheduled + the cartId), then call `scheduleAbandonedCartRecovery` after `withTenant` returns. Concretely:
   ```ts
   async mergeCartOnLogin(guestCartId, customerId, storeId, queueService?) {
     const outcome = await withTenant(storeId, async (tx) => {
       const guestCart = await cartRepo.findCartById(guestCartId, storeId, tx);
       const customerCart = await cartRepo.findCartByCustomerId(customerId, storeId, tx);
       if (guestCart && customerCart) {
         const guestItems = guestCart.items || [];
         if (guestItems.length === 0) { await cartRepo.deleteCart(guestCartId, tx); return { scheduleFor: undefined }; }
         // ... (unchanged product load + prepared + dedup logic, using bare productRepo.findManyByIds) ...
         // batch write directly on tx (NO inner db.transaction):
         if (toInsert.length > 0) await cartRepo.insertCartItemsBatch(toInsert, tx);
         if (toIncrement.length > 0) await cartRepo.incrementCartItemQuantities(toIncrement, tx);
         await cartRepo.recalculateCartTotalsInDb(customerCart.id, tx);
         await cartRepo.deleteCart(guestCartId, tx);
         return { scheduleFor: customerCart.id };
       } else if (guestCart && !customerCart) {
         await cartRepo.updateCartCustomerId(guestCartId, customerId, tx);
         return { scheduleFor: guestCartId };
       }
       return { scheduleFor: undefined };
     });
     if (outcome.scheduleFor) {
       await scheduleAbandonedCartRecovery(outcome.scheduleFor, storeId, customerId, queueService);
     }
   }
   ```
   (Keep the existing product-load + `prepared` + `dedupKey` + `toInsert`/`toIncrement` logic verbatim — only the tx wrapping + inner-transaction removal + enqueue-hoist changes.)
5. `addItem(cartId, storeId, params, customerId?, queueService?)`: wrap the body in `withTenant(storeId, async (tx) => { ... })`. All `cartRepo` calls pass `tx`: `findCartItemsByProductId(cartId, params.productId, tx)`, `updateCartItem(existingItem.id, {...}, tx)`, `insertCartItem({...}, tx)`. `recalculateTotals(storeId, cartId)` (inside the tx, this opens a NESTED withTenant — see note below) — to avoid nesting, replace the inner `await cartService.recalculateTotals(storeId, cartId)` calls with `await cartRepo.recalculateCartTotalsInDb(cartId, tx)` (ride the same tx). `productRepo.findById(params.productId, storeId)` (products, no RLS) stays bare. The final `findCartById(cartId, storeId, tx)` rides the tx. `scheduleAbandonedCartRecovery(...)` MUST stay outside the tx — restructure as in 4: return the cartId from the wrapped body, enqueue after.
   > **Avoid nested withTenant:** `addItem`/`updateItemQuantity`/`removeItem` already run inside `withTenant(storeId, ...)`. Calling `cartService.recalculateTotals(storeId, cartId)` from inside would open a SECOND `withTenant` (nested `db.transaction` → savepoint). That is functionally safe but unnecessary. Prefer `await cartRepo.recalculateCartTotalsInDb(cartId, tx)` on the same tx. Do this.
6. `updateItemQuantity(cartId, itemId, quantity, storeId, customerId?, queueService?)`: wrap in `withTenant(storeId, async (tx) => { ... })`. `findCartItemById(itemId, cartId, tx)`, `updateCartItem(itemId, {...}, tx)`, `await cartRepo.recalculateCartTotalsInDb(cartId, tx)`, `findCartById(cartId, storeId, tx)`. Enqueue after (return cartId, scheduleAbandonedCartRecovery outside).
7. `removeItem(cartId, itemId, storeId)`: wrap in `withTenant(storeId, async (tx) => { ... })`. `deleteCartItem(itemId, cartId, tx)`, `await cartRepo.recalculateCartTotalsInDb(cartId, tx)`, `findCartById(cartId, storeId, tx)`. Return `{ cart }` from the wrapped body.

> The `scheduleAbandonedCartRecovery` helper stays a module-private function (no tx). For `addItem`/`updateItemQuantity`, the wrapped body returns `{ cart, item }` (or just the cartId for scheduling); enqueue after `withTenant` resolves. Keep the return shape of each public method identical to today (`{ cart, item }` / `{ cart }`).

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter backend test -- src/modules/cart/cart.service.withTenant.test.ts`
Expected: PASS (7/7).

- [ ] **Step 5: Full suite + typecheck (critical regression gate)**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: 0 type errors; full suite green — `cart.route.public.test.ts`, checkout tests, `auth.route.session` mergeCartOnLogin tests must all still pass. This is the proof the refactor is behavior-identical (RLS off). If `cart.route.public.test.ts` breaks because it calls `cartService.recalculateTotals(cartId)` directly — it does NOT (the route calls service entries, not `recalculateTotals`); but if any caller does, update it to `recalculateTotals(storeId, cartId)`.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/cart/cart.service.ts apps/backend/src/modules/cart/cart.service.withTenant.test.ts
git commit -m "refactor(rls): wrap cart.service in withTenant (Phase 1 prep)

getOrCreateCart/mergeCartOnLogin/recalculateTotals/addItem/updateItemQuantity/
removeItem now run all carts+cart_items DB work inside withTenant(storeId, fn)
(set_config app.tenant_id tx-local). mergeCartOnLogin's inner db.transaction is
removed (becomes the withTenant tx body — no nesting); queue-adds stay outside
the tx. recalculateTotals gains a storeId param; internal callers ride the same
tx via recalculateCartTotalsInDb(cartId, tx) to avoid nested withTenant.
Behavior unchanged (RLS off; set_config no-op for non-RLS tables)."
```

---

### Task 3: Wrap `cart.route.public` direct `findCartById` reads in `withTenant`

**Why:** `cart.route.public.ts` calls `cartRepo.findCartById(cartId, request.storeId)` directly (4 sites) for ownership verification before delegating to the (now-wrapped) `cartService`. Under carts-RLS these bare-`db` reads return zero rows → cart reported "not found" → cartId cleared on every request. They must ride a withTenant tx.

**Files:**
- Modify: `apps/backend/src/modules/cart/cart.route.public.ts` (sites `:23`, `:65`, `:124`, `:168`)
- Test: `apps/backend/src/modules/cart/cart.route.public.withTenant.test.ts` (create)

**Interfaces:**
- Consumes: Task 1's `tx`-threaded `cartRepo.findCartById`; `withTenant` primitive.
- Produces: the 4 ownership-verification reads run inside `withTenant(request.storeId, (tx) => cartRepo.findCartById(cartId, request.storeId, tx))`.

- [ ] **Step 1: Write the failing test** — `apps/backend/src/modules/cart/cart.route.public.withTenant.test.ts`

Mirror `apps/backend/src/modules/order/order.route.public.withTenant.test.ts` in structure. Mock `withTenant` (forward sentinel tx), `cartRepo` (`findCartById` returns a canned cart `{ id: 'c1', storeId: 'test-store-id', customerId: undefined, items: [] }`), `cartService` (`getOrCreateCart`/`addItem`/`updateItemQuantity`/`removeItem` return canned shapes), and the `env` import if the route uses `env.isProduction` for cookies. Register the route against a Fastify instance with the public scope's `request.storeId` decorator (or set `request.storeId` directly via a preHandler stub). For each of the 4 endpoints (GET /, POST /items, PATCH /items/:itemId, DELETE /items/:itemId) that does an ownership read, assert `withTenant` was called with `request.storeId` and `cartRepo.findCartById` received the sentinel tx.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn({ __sentinel: 'tx' });
  },
}));

const { cartRepo } = vi.hoisted(() => ({
  cartRepo: { findCartById: vi.fn().mockResolvedValue({ id: 'c1', storeId: 's1', customerId: undefined, items: [] }) },
}));
vi.mock('./cart.repo.js', () => ({ cartRepo }));

const { cartService } = vi.hoisted(() => ({
  cartService: {
    getOrCreateCart: vi.fn().mockResolvedValue({ cart: { id: 'c1', items: [] }, isNew: false }),
    addItem: vi.fn().mockResolvedValue({ cart: { id: 'c1', items: [] }, item: { id: 'i1' } }),
    updateItemQuantity: vi.fn().mockResolvedValue({ cart: { id: 'c1', items: [] }, item: { id: 'i1' } }),
    removeItem: vi.fn().mockResolvedValue({ cart: { id: 'c1', items: [] } }),
  },
}));
vi.mock('./cart.service.js', () => ({ cartService }));
vi.mock('../../config/env.js', () => ({ env: { isProduction: false } }));

import publicCartRoutes from './cart.route.public.js';

function buildApp() {
  const app = Fastify();
  // Stub the public-scope storeId + cookies decorators.
  app.addHook('preHandler', async (req: any) => {
    req.storeId = 's1';
    req.customerId = undefined;
    req.cookies = { cartId: 'c1' };
  });
  app.register(publicCartRoutes);
  return app;
}

describe('cart.route.public wraps findCartById in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET / verifies ownership inside withTenant(storeId)', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(cartRepo.findCartById).toHaveBeenCalledWith('c1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('PATCH /items/:itemId verifies ownership inside withTenant(storeId)', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'PATCH', url: '/items/i1', payload: { quantity: 2 } });
    expect(res.statusCode).toBe(200);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
  });

  it('DELETE /items/:itemId verifies ownership inside withTenant(storeId)', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: '/items/i1' });
    expect(res.statusCode).toBe(200);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
  });
});
```

> The POST `/items` endpoint also does an ownership read at `:65` when `cartId` exists. Add a fourth assertion for it if the injected cookie `cartId: 'c1'` triggers that branch (it does). Adjust the canned `addItem`/`updateItemQuantity`/`removeItem` shapes to whatever the route actually returns to keep `statusCode` 200 — read the route handlers and the existing `cart.route.public.test.ts` canned shapes, and match them. The key invariant is: **`withTenant` called with `request.storeId` and `findCartById` received the sentinel tx**.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter backend test -- src/modules/cart/cart.route.public.withTenant.test.ts`
Expected: FAIL — the route still calls `cartRepo.findCartById(cartId, request.storeId)` with no `withTenant`.

- [ ] **Step 3: Implement** — `apps/backend/src/modules/cart/cart.route.public.ts`

Add `import { withTenant } from '../../lib/withTenant.js';`. At each of the 4 sites, replace:
```ts
const cart = await cartRepo.findCartById(cartId, request.storeId);
```
with:
```ts
const cart = await withTenant(request.storeId, (tx) => cartRepo.findCartById(cartId, request.storeId, tx));
```
The 4 sites are at `:23` (GET /), `:65` (POST /items), `:124` (PATCH /items/:itemId), `:168` (DELETE /items/:itemId). The downstream `cartService.*` calls are unchanged (already wrapped by Task 2).

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter backend test -- src/modules/cart/cart.route.public.withTenant.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite + typecheck**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: 0 type errors; full suite green (the existing `cart.route.public.test.ts` must still pass — it mocks `cartRepo.findCartById` directly; if it now fails because the route wraps the call in `withTenant`, add a `withTenant` mock to that existing test too, mirroring the mock above. Prefer NOT editing the existing test unless it breaks).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/cart/cart.route.public.ts apps/backend/src/modules/cart/cart.route.public.withTenant.test.ts
git commit -m "refactor(rls): wrap cart.route.public findCartById reads in withTenant (Phase 1 prep)

The 4 ownership-verification cartRepo.findCartById reads (GET /, POST /items,
PATCH /items/:itemId, DELETE /items/:itemId) now run inside
withTenant(request.storeId, tx => findCartById(..., tx)) so they see app.tenant_id
post-carts-RLS. Behavior unchanged (RLS off)."
```

---

### Task 4: Thread `tx` through all `coupon.repo` methods

**Why:** `couponRepo` has 9 methods, all on bare `db` with no `tx` param. Under coupons/coupon_usages-RLS, every one would zero out unless it rides the caller's withTenant tx.

**Files:**
- Modify: `apps/backend/src/modules/coupon/coupon.repo.ts` (all 9 methods)
- Test: `apps/backend/src/modules/coupon/coupon.repo.tx.test.ts` (create)

**Interfaces:**
- Produces: all 9 methods gain an optional trailing `tx?: DbOrTx` param and use `const executor = tx ?? db;`. `create`/`update`/`deleteById` keep returning arrays (callers destructure `[x]`). Existing callers (no tx) are unaffected.

**Current signatures (verify against the file before editing):**
```ts
findManyByStoreId(storeId, options?)        // coupon.repo.ts:10  db.query.coupons.findMany
countByStoreId(storeId)                     // :20                db.select({count}).from(coupons)
findById(couponId, storeId)                 // :28                db.query.coupons.findFirst
findByCode(code, storeId)                   // :34                db.query.coupons.findFirst (UPPER(code))
create(data)                                // :43                db.insert(coupons).values(data).returning()
update(couponId, storeId, data)             // :47                db.update(coupons)...returning()
deleteById(couponId, storeId)               // :55                db.delete(coupons).where(...)
countCustomerUsages(couponId, customerId)   // :63                db.select({count}).from(couponUsages)
insertCouponUsage(data)                     // :71                db.insert(couponUsages).values(data).returning()
```

- [ ] **Step 1: Write the failing test** — `apps/backend/src/modules/coupon/coupon.repo.tx.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const couponsFindMany = vi.fn().mockResolvedValue([]);
const couponsFindFirst = vi.fn().mockResolvedValue(undefined);
const selectChain = vi.fn(() => {
  const chain: Record<string, unknown> = {};
  for (const m of ['from', 'where', 'orderBy', 'limit', 'offset']) chain[m] = vi.fn(() => chain);
  chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve([{ count: 0 }]));
  return chain;
});
const dbSelect = vi.fn(() => selectChain());
const insertReturn = vi.fn().mockResolvedValue([{ id: 'cp1' }]);
const updateReturn = vi.fn().mockResolvedValue([{ id: 'cp1' }]);
const deleteChain = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
const insertChain = vi.fn(() => ({ values: vi.fn(() => ({ returning: insertReturn })) }));
const updateChain = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: updateReturn })) })) }));

vi.mock('../../db/index.js', () => ({
  db: {
    query: { coupons: { findMany: couponsFindMany, findFirst: couponsFindFirst } },
    select: dbSelect,
    insert: vi.fn(() => insertChain()),
    update: vi.fn(() => updateChain()),
    delete: vi.fn(() => deleteChain()),
  },
  dbAdmin: {},
  dbOwner: {},
}));

import { db } from '../../db/index.js';
import { couponRepo } from './coupon.repo.js';

function makeTx() {
  return {
    query: { coupons: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(undefined) } },
    select: vi.fn(() => selectChain()),
    insert: vi.fn(() => insertChain()),
    update: vi.fn(() => updateChain()),
    delete: vi.fn(() => deleteChain()),
  };
}

describe('coupon.repo methods thread tx', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findManyByStoreId uses tx when provided, else db', async () => {
    const tx = makeTx();
    await couponRepo.findManyByStoreId('s1', { limit: 10 }, tx as never);
    expect(tx.query.coupons.findMany).toHaveBeenCalled();
    expect(couponsFindMany).not.toHaveBeenCalled();

    await couponRepo.findManyByStoreId('s2');
    expect(couponsFindMany).toHaveBeenCalled();
  });

  it('findById uses tx when provided', async () => {
    const tx = makeTx();
    await couponRepo.findById('cp1', 's1', tx as never);
    expect(tx.query.coupons.findFirst).toHaveBeenCalled();
    expect(couponsFindFirst).not.toHaveBeenCalled();
  });

  it('findByCode uses tx when provided', async () => {
    const tx = makeTx();
    await couponRepo.findByCode('SAVE10', 's1', tx as never);
    expect(tx.query.coupons.findFirst).toHaveBeenCalled();
  });

  it('countByStoreId uses tx.select when provided', async () => {
    const tx = makeTx();
    await couponRepo.countByStoreId('s1', tx as never);
    expect(tx.select).toHaveBeenCalled();
    expect(dbSelect).not.toHaveBeenCalled();
  });

  it('countCustomerUsages uses tx.select when provided', async () => {
    const tx = makeTx();
    await couponRepo.countCustomerUsages('cp1', 'cust-1', tx as never);
    expect(tx.select).toHaveBeenCalled();
  });

  it('create uses tx.insert when provided', async () => {
    const tx = makeTx();
    await couponRepo.create({ storeId: 's1', code: 'X', type: 'fixed', value: '5' } as never, tx as never);
    expect(tx.insert).toHaveBeenCalled();
  });

  it('update uses tx.update when provided', async () => {
    const tx = makeTx();
    await couponRepo.update('cp1', 's1', { description: 'd' } as never, tx as never);
    expect(tx.update).toHaveBeenCalled();
  });

  it('deleteById uses tx.delete when provided', async () => {
    const tx = makeTx();
    await couponRepo.deleteById('cp1', 's1', tx as never);
    expect(tx.delete).toHaveBeenCalled();
  });

  it('insertCouponUsage uses tx.insert when provided', async () => {
    const tx = makeTx();
    await couponRepo.insertCouponUsage({ couponId: 'cp1', customerId: 'c', orderId: 'o', storeId: 's1' } as never, tx as never);
    expect(tx.insert).toHaveBeenCalled();
  });
});
```

> `countCustomerUsages` returns a `number` (it awaits the rows and reads `rows[0]?.count`). The `tx.select` mock chain's `.then` resolves `[{ count: 0 }]` so `countCustomerUsages` returns `0`. Keep the chain's `.then` returning an array of `{ count }`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter backend test -- src/modules/coupon/coupon.repo.tx.test.ts`
Expected: FAIL — methods don't accept `tx` yet.

- [ ] **Step 3: Implement** — `apps/backend/src/modules/coupon/coupon.repo.ts`

For each method, add `tx?: DbOrTx` as the **last** param and `const executor = tx ?? db;` as the first line, then replace `db.` with `executor.` in the body:

- `findManyByStoreId(storeId, options?, tx?)` → `executor.query.coupons.findMany(...)`.
- `countByStoreId(storeId, tx?)` → `executor.select({ count: count() }).from(coupons).where(where)`. (Currently returns the promise-of-rows `db.select(...)` directly — keep the same return shape: `return executor.select(...)...`; the caller in `coupon.service.findByStoreId` does `const totalResult = await ...; const total = totalResult[0]?.count ?? 0;`. Wait — `countByStoreId` currently `return db.select(...).from(coupons).where(where);` WITHOUT await. Keep it un-awaited (returns the thenable). Just swap `db` → `executor`.)
- `findById(couponId, storeId, tx?)` → `executor.query.coupons.findFirst(...)`.
- `findByCode(code, storeId, tx?)` → `executor.query.coupons.findFirst(...)`.
- `create(data, tx?)` → `return executor.insert(coupons).values(data).returning();`.
- `update(couponId, storeId, data, tx?)` → `return executor.update(coupons).set(...).where(...).returning();`.
- `deleteById(couponId, storeId, tx?)` → `return executor.delete(coupons).where(...);`.
- `countCustomerUsages(couponId, customerId, tx?)` → `const rows = await executor.select({ count: count() }).from(couponUsages).where(...); return rows[0]?.count ?? 0;`.
- `insertCouponUsage(data, tx?)` → `const [row] = await executor.insert(couponUsages).values(data).returning(); return row;`.

> `countByStoreId` is the only method that returns a thenable without `await` (so the caller `Promise.all`s it). Keep that exact behavior — only swap `db` → `executor`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter backend test -- src/modules/coupon/coupon.repo.tx.test.ts`
Expected: PASS (9/9).

- [ ] **Step 5: Full suite + typecheck**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: 0 type errors; full suite green. `coupon.service.test.ts` mocks `couponRepo` so it's unaffected by the signature change.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/coupon/coupon.repo.ts apps/backend/src/modules/coupon/coupon.repo.tx.test.ts
git commit -m "refactor(rls): thread tx through all coupon.repo methods (Phase 1 prep)

All 9 couponRepo methods (findManyByStoreId/countByStoreId/findById/findByCode/
create/update/deleteById/countCustomerUsages/insertCouponUsage) accept tx?: DbOrTx
and ride it (executor = tx ?? db). Behavior unchanged (RLS off). Prep for
coupons+coupon_usages RLS — a bare-db read would not see app.tenant_id."
```

---

### Task 5: Wrap `coupon.service` operations in `withTenant`

**Why:** `couponService.findByStoreId/findById/findByCode/create/update/delete/validateCoupon` read/write `coupons` (+`coupon_usages` via `countCustomerUsages`). Under RLS they zero out. **`validateCoupon` is the load-bearing wrap**: `pricingService.computeOrderPricing` calls it *before* `orderService.create`'s withTenant tx, so it must self-provide tenant context or every coupon checkout breaks under coupons-RLS. `calculateDiscount` is pure CPU — no wrap.

**Files:**
- Modify: `apps/backend/src/modules/coupon/coupon.service.ts`
- Test: `apps/backend/src/modules/coupon/coupon.service.withTenant.test.ts` (create)

**Interfaces:**
- Consumes: Task 4's `tx`-threaded `couponRepo` methods.
- Produces: `couponService` methods (except `calculateDiscount`) run all coupons/coupon_usages DB work inside `withTenant(storeId, fn)`. `pricing.service.ts` needs NO change — it calls `validateCoupon` which now self-wraps.

- [ ] **Step 1: Write the failing test** — `apps/backend/src/modules/coupon/coupon.service.withTenant.test.ts`

```ts
// Verifies couponService wraps all coupon DB work in withTenant(storeId, fn)
// (RLS Phase 1 prep). The validateCoupon wrap is the regression guard for the
// pricing-path zero-out risk (pricing.service calls validateCoupon pre-checkout).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn({ __sentinel: 'tx' });
  },
}));

const { repo } = vi.hoisted(() => ({
  repo: {
    findManyByStoreId: vi.fn().mockResolvedValue([]),
    countByStoreId: vi.fn().mockResolvedValue([{ count: 0 }]),
    findById: vi.fn().mockResolvedValue({ id: 'cp1', storeId: 's1', code: 'SAVE10', type: 'fixed', value: '5', isActive: true, usageCount: 0, usageLimitPerCustomer: 1 }),
    findByCode: vi.fn().mockResolvedValue({ id: 'cp1', storeId: 's1', code: 'SAVE10', type: 'fixed', value: '5', isActive: true, usageCount: 0, usageLimitPerCustomer: 1 }),
    create: vi.fn().mockResolvedValue([{ id: 'cp1', storeId: 's1', code: 'SAVE10' }]),
    update: vi.fn().mockResolvedValue([{ id: 'cp1', storeId: 's1' }]),
    deleteById: vi.fn().mockResolvedValue(undefined),
    countCustomerUsages: vi.fn().mockResolvedValue(0),
  },
}));
vi.mock('./coupon.repo.js', () => ({ couponRepo: repo }));

import { couponService } from './coupon.service.js';

describe('coupon.service wraps coupon work in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findByStoreId runs inside withTenant(storeId) and threads tx', async () => {
    await couponService.findByStoreId('s1', { page: 1, limit: 10 });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findManyByStoreId).toHaveBeenCalledWith('s1', expect.any(Object), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('findById runs inside withTenant(storeId)', async () => {
    await couponService.findById('cp1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findById).toHaveBeenCalledWith('cp1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('findByCode runs inside withTenant(storeId)', async () => {
    await couponService.findByCode('SAVE10', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
  });

  it('create runs inside withTenant(storeId) and threads tx to create + dup-check', async () => {
    repo.findByCode.mockResolvedValueOnce(undefined);
    await couponService.create({ storeId: 's1', code: 'NEW', type: 'fixed', value: '5' });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1' }), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('update runs inside withTenant(storeId)', async () => {
    await couponService.update('cp1', 's1', { description: 'd' });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.update).toHaveBeenCalledWith('cp1', 's1', expect.any(Object), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('delete runs inside withTenant(storeId)', async () => {
    await couponService.delete('cp1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.deleteById).toHaveBeenCalledWith('cp1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('validateCoupon runs inside withTenant(storeId) — the pricing-path regression guard', async () => {
    await couponService.validateCoupon('SAVE10', 's1', '100.00', 'cust-1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findByCode).toHaveBeenCalledWith('SAVE10', 's1', expect.objectContaining({ __sentinel: 'tx' }));
    expect(repo.countCustomerUsages).toHaveBeenCalledWith('cp1', 'cust-1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('calculateDiscount does NOT open a withTenant (pure CPU)', async () => {
    await couponService.calculateDiscount({ id: 'cp1', storeId: 's1', code: 'SAVE10', type: 'fixed', value: '5', isActive: true, usageCount: 0, usageLimitPerCustomer: 1 } as never, '100.00');
    expect(withTenantMock).not.toHaveBeenCalled();
  });
});
```

> `coupon.service.test.ts` (the existing behavioral test) mocks `couponRepo` directly and does NOT mock `withTenant`. After this task, `couponService.findById` etc. call the real `withTenant` → real `db.transaction`. That existing test will break unless it mocks `withTenant`. **In Step 5, if `coupon.service.test.ts` fails, add the same `vi.mock('../../lib/withTenant.js', ...)` sentinel-tx mock to it** (prepend it to the file's mocks). This is expected — mirror how `order.service.test.ts` was handled in Phase 1.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter backend test -- src/modules/coupon/coupon.service.withTenant.test.ts`
Expected: FAIL — `withTenant` not imported/used yet.

- [ ] **Step 3: Implement** — `apps/backend/src/modules/coupon/coupon.service.ts`

Add `import { withTenant } from '../../lib/withTenant.js';`. Wrap each entry's DB work in `withTenant(storeId, async (tx) => { ... })` and pass `tx` to every `couponRepo` call:

- `findByStoreId(storeId, opts?)`: `const [rows, totalResult] = await withTenant(storeId, async (tx) => Promise.all([ couponRepo.findManyByStoreId(storeId, { limit, offset }, tx), couponRepo.countByStoreId(storeId, tx) ]));` then compute pagination outside the tx (pure CPU). (Note: `countByStoreId` returns a thenable that `Promise.all` awaits — same as today.)
- `findById(couponId, storeId)`: `const coupon = await withTenant(storeId, (tx) => couponRepo.findById(couponId, storeId, tx));` then the not-found throw after.
- `findByCode(code, storeId)`: `return withTenant(storeId, (tx) => couponRepo.findByCode(code, storeId, tx));`.
- `create(data)`: wrap the dup-check + insert in ONE tx:
  ```ts
  return withTenant(data.storeId, async (tx) => {
    const existing = await couponRepo.findByCode(data.code, data.storeId, tx);
    if (existing) { throw Object.assign(new Error('Coupon code already exists in this store'), { code: ErrorCodes.INVALID_COUPON }); }
    const [coupon] = await couponRepo.create({ ...data fields..., code: data.code.toUpperCase(), ... }, tx);
    return coupon;
  });
  ```
- `update(couponId, storeId, data)`: wrap the findById + dup-check (if `data.code`) + update in ONE tx, passing `tx` to each `couponRepo` call. Keep the existing logic; only add `tx` args + the `withTenant` wrapper.
- `delete(couponId, storeId)`: `return withTenant(storeId, async (tx) => { const coupon = await couponRepo.findById(couponId, storeId, tx); if (!coupon) { throw ... } await couponRepo.deleteById(couponId, storeId, tx); return { id: couponId, deleted: true }; });`.
- `validateCoupon(code, storeId, orderAmount?, _customerId?)`: wrap the whole body in `withTenant(storeId, async (tx) => { ... })`. Pass `tx` to `couponRepo.findByCode(code, storeId, tx)` and `couponRepo.countCustomerUsages(coupon.id, _customerId, tx)`. All the validation logic (isActive / startsAt / expiresAt / usageLimit / usageLimitPerCustomer / minOrderAmount) stays inside the closure and returns `coupon` at the end. This is the load-bearing change.
- `calculateDiscount(...)`: **unchanged** (pure CPU, no DB, no `withTenant`).

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter backend test -- src/modules/coupon/coupon.service.withTenant.test.ts`
Expected: PASS (8/8).

- [ ] **Step 5: Full suite + typecheck (critical — coupon checkout path)**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: 0 type errors; full suite green. If `coupon.service.test.ts` breaks (real `withTenant` now runs), add the `withTenant` sentinel-tx mock to it (see Step 1 note). The pricing/checkout tests (`pricing.service.test.ts`, checkout route tests) MUST stay green — they call `validateCoupon` which now self-wraps; if `pricing.service.test.ts` mocks `couponService` it's unaffected; if it uses the real `couponService`, add the `withTenant` mock there too.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/coupon/coupon.service.ts apps/backend/src/modules/coupon/coupon.service.withTenant.test.ts
# also add coupon.service.test.ts / pricing.service.test.ts if you added the withTenant mock to them
git commit -m "refactor(rls): wrap coupon.service in withTenant (Phase 1 prep)

findByStoreId/findById/findByCode/create/update/delete/validateCoupon now run
all coupons+coupon_usages DB work inside withTenant(storeId, fn). validateCoupon
self-provides tenant context — fixes the pricing-path zero-out risk where
pricing.service.computeOrderPricing calls validateCoupon BEFORE order.service's
withTenant tx (every coupon checkout would otherwise break under coupons-RLS).
calculateDiscount stays pure (no wrap). Behavior unchanged (RLS off)."
```

---

### Task 6: Route abandoned-cart cron to `dbAdmin`; wrap processor reads in `withTenant`

**Why:** `jobs/abandonedCartCron.ts:28` does a cross-tenant `db.select().from(carts)` (all stores) — under carts-RLS on `app_tenant` with no context → zero rows → recovery emails never enqueue. Route it to `dbAdmin` (BYPASSRLS). `services/abandonedCartProcessor.service.ts` reads `carts`+`cart_items` for a single store (has `storeId` from job data) → wrap reads in `withTenant(storeId)`; the `emailQueue.add` enqueue stays outside the tx.

**Files:**
- Modify: `apps/backend/src/jobs/abandonedCartCron.ts`
- Modify: `apps/backend/src/services/abandonedCartProcessor.service.ts`
- Test: `apps/backend/src/jobs/abandonedCartCron.dbAdmin.test.ts` (create)
- Test: `apps/backend/src/services/abandonedCartProcessor.withTenant.test.ts` (create)

**Interfaces:**
- Produces: `runAbandonedCartCron` uses `dbAdmin` for the all-stores carts scan. `createAbandonedCartProcessor`'s processor reads carts/cart_items/customers/products inside `withTenant(storeId, fn)` and enqueues the email after the tx returns.

- [ ] **Step 1: Write the failing tests**

`apps/backend/src/jobs/abandonedCartCron.dbAdmin.test.ts`:
```ts
// Asserts the abandoned-cart cron reads carts via dbAdmin (BYPASSRLS), not db
// (app_tenant). Under carts-RLS a bare-db all-stores scan would return 0 rows.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const dbSelect = vi.fn(() => {
  const chain: Record<string, unknown> = {};
  for (const m of ['from', 'where']) chain[m] = vi.fn(() => chain);
  chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve([]));
  return chain;
});
const dbAdminSelect = vi.fn(() => {
  const chain: Record<string, unknown> = {};
  for (const m of ['from', 'where']) chain[m] = vi.fn(() => chain);
  chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve([{ storeId: 's1', id: 'c1', customerId: 'cust-1' }]));
  return chain;
});

vi.mock('../db/index.js', () => ({
  db: { select: dbSelect },
  dbAdmin: { select: dbAdminSelect },
  dbOwner: {},
}));

const { queueService } = vi.hoisted(() => ({
  queueService: { abandonedCartQueue: { add: vi.fn().mockResolvedValue(undefined) } },
}));
vi.mock('../services/queue.service.js', () => ({ queueService: vi.fn(() => queueService) }));

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
    const redis = { set: vi.fn().mockResolvedValue('OK'), del: vi.fn().mockResolvedValue(1) } as never;
    await runAbandonedCartCron(queueService as never, { info: vi.fn(), debug: vi.fn(), error: vi.fn() } as never, redis);
    expect(dbAdminSelect).toHaveBeenCalled();
    expect(dbSelect).not.toHaveBeenCalled();
    expect(dbAdmin).not.toBe(db); // sanity: distinct clients
  });
});
```

> Read `abandonedCartCron.ts`'s exact imports (`redis` type, `QueueService` type) and shape the mocks to match. The key invariant: **`dbAdmin.select` called, `db.select` NOT called**.

`apps/backend/src/services/abandonedCartProcessor.withTenant.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn({ __sentinel: 'tx' });
  },
}));

// The processor uses bare db.select for carts/cartItems/customers/products.
// After the change it rides the withTenant tx, so we assert withTenant is
// called with job.data.storeId and the enqueue (emailQueue.add) still happens.
const selectChain = vi.fn(() => {
  const chain: Record<string, unknown> = {};
  for (const m of ['from', 'where', 'limit']) chain[m] = vi.fn(() => chain);
  chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve([{ id: 'c1', storeId: 's1', itemCount: 2, customerId: 'cust-1' }]));
  return chain;
});
vi.mock('../db/index.js', () => ({
  db: { select: vi.fn(() => selectChain()) },
  dbAdmin: {}, dbOwner: {},
}));

const { queueService } = vi.hoisted(() => ({
  queueService: { emailQueue: { add: vi.fn().mockResolvedValue(undefined) } },
}));
vi.mock('./queue.service.js', () => ({ queueService: vi.fn(() => queueService) }));

import { createAbandonedCartProcessor } from './abandonedCartProcessor.service.js';

describe('abandonedCartProcessor wraps reads in withTenant(storeId)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('runs cart reads inside withTenant(job.data.storeId) and enqueues the email', async () => {
    const processJob = createAbandonedCartProcessor(queueService as never);
    await processJob({ data: { storeId: 's1', cartId: 'c1', customerId: 'cust-1' } } as never);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(queueService.emailQueue.add).toHaveBeenCalled();
  });
});
```

> The processor's first carts read returns the cart via `db.select(...).from(carts).where(...).limit(1)`. The mock chain's `.then` must resolve an array whose `[0]` is `{ id, storeId, itemCount, customerId }` so the early-return guards (`!cart || cart.itemCount === 0`, `!customerId`, `!customer?.email`) pass. Shape the chain returns so the processor reaches the `emailQueue.add` call — read the processor body and provide a customer with `email` and cartItems with `productId`. (The carts/cartItems/customers/products reads all go through the same mocked `db.select` chain; return arrays that satisfy each guard.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter backend test -- src/jobs/abandonedCartCron.dbAdmin.test.ts src/services/abandonedCartProcessor.withTenant.test.ts`
Expected: FAIL — cron still uses `db`; processor doesn't use `withTenant`.

- [ ] **Step 3: Implement — `apps/backend/src/jobs/abandonedCartCron.ts`**

Change the import to also bring `dbAdmin`: `import { dbAdmin } from '../db/index.js';` (remove `db` from the import if it becomes unused — it does, the only `db` use is the carts scan). Change line 28:
```ts
const abandonedCarts = await dbAdmin.select().from(carts)
  .where(and(
    isNotNull(carts.customerId),
    gt(carts.itemCount, 0),
    lt(carts.updatedAt, oneHourAgo),
    gt(carts.updatedAt, twoHoursAgo),
  ));
```
Everything else (lock, enqueue loop, log) unchanged.

- [ ] **Step 4: Implement — `apps/backend/src/services/abandonedCartProcessor.service.ts`**

Add `import { withTenant } from '../lib/withTenant.js';`. Restructure `processAbandonedCartJob` so the read section runs inside `withTenant(storeId, ...)` and the `emailQueue.add` runs AFTER the tx returns:
```ts
import { db } from '../db/index.js';
import { carts, cartItems, customers, products } from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { withTenant } from '../lib/withTenant.js';
import type { QueueService } from './queue.service.js';

export function createAbandonedCartProcessor(queueService: QueueService) {
  return async function processAbandonedCartJob(job: Job<AbandonedCartJobData>): Promise<void> {
    const { storeId, cartId, customerId } = job.data;

    const emailPayload = await withTenant(storeId, async (tx) => {
      const [cart] = await tx.select().from(carts)
        .where(and(eq(carts.id, cartId), eq(carts.storeId, storeId)))
        .limit(1);
      if (!cart || cart.itemCount === 0) return null;
      if (!customerId) return null;
      const [customer] = await tx.select().from(customers)
        .where(and(eq(customers.id, customerId), eq(customers.storeId, storeId)))
        .limit(1);
      if (!customer?.email) return null;
      const items = await tx.select().from(cartItems)
        .where(eq(cartItems.cartId, cartId));
      if (items.length === 0) return null;
      const itemProductIds = Array.from(new Set(items.map((i) => i.productId)));
      const productRows = itemProductIds.length === 0
        ? []
        : await tx.select({ id: products.id, titleEn: products.titleEn })
            .from(products)
            .where(and(inArray(products.id, itemProductIds), eq(products.storeId, storeId)));
      const productMap = new Map(productRows.map((p) => [p.id, p.titleEn]));
      const itemList = items.map((i) => `- ${productMap.get(i.productId) ?? 'Product'} x${i.quantity}`).join('\n');
      return {
        to: customer.email,
        subject: 'You left something in your cart!',
        html: `<p>Hi ${customer.firstName ?? ''},</p>\n<p>You have items waiting in your cart:</p>\n<pre>${itemList}</pre>\n<p><a href="https://cart link">Complete your purchase</a></p>`,
        text: `Hi ${customer.firstName ?? ''},\n\nYou have items waiting in your cart:\n${itemList}\n\nComplete your purchase: https://cart link`,
      };
    });

    if (emailPayload) {
      await queueService.emailQueue.add('abandoned-cart', emailPayload);
    }
  };
}
```
> The `tx` here is the withTenant tx. The Drizzle `tx.select()` API has the same shape as `db.select()`, so swapping `db.` → `tx.` inside the closure works. The `customers`/`products` reads are no-ops today (no RLS) and correct post-their-RLS-phases. The `emailQueue.add` is outside the tx (enqueued only after the read tx commits). Keep the email HTML/text identical to today (copy verbatim from the current file — the `https://cart-link` placeholder stays).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter backend test -- src/jobs/abandonedCartCron.dbAdmin.test.ts src/services/abandonedCartProcessor.withTenant.test.ts`
Expected: PASS.

- [ ] **Step 6: Full suite + typecheck**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: 0 type errors; full suite green (any existing abandoned-cart tests must still pass).

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/jobs/abandonedCartCron.ts apps/backend/src/services/abandonedCartProcessor.service.ts apps/backend/src/jobs/abandonedCartCron.dbAdmin.test.ts apps/backend/src/services/abandonedCartProcessor.withTenant.test.ts
git commit -m "refactor(rls): abandoned-cart cron → dbAdmin, processor → withTenant (Phase 1 prep)

abandonedCartCron's all-stores carts scan now uses dbAdmin (BYPASSRLS) — under
carts-RLS a bare-db app_tenant scan with no app.tenant_id would return 0 rows.
abandonedCartProcessor's cart/cart_items/customers/products reads now run inside
withTenant(job.data.storeId); the emailQueue.add enqueue stays outside the tx.
Behavior unchanged (RLS off)."
```

---

### Task 7: Seed `coupons` via `dbOwner`

**Why:** `db/seed.ts:775` inserts `coupons` via bare `db` (app_tenant). Under coupons-RLS, the seed insert hits `WITH CHECK` (no `app.tenant_id` set in seed context) and fails. Switch to `dbOwner` (BYPASSRLS) — same fix Phase 1 applied to the orders/order_items seed.

**Files:**
- Modify: `apps/backend/src/db/seed.ts` (line `:775`)
- Test: none (seed is not unit-tested; the full-suite + a manual seed run is the gate)

**Interfaces:**
- Produces: `seed.ts` inserts `coupons` via `dbOwner.insert(...)` (joining the existing `dbOwner` orders/order_items seed pattern at lines 709/767).

- [ ] **Step 1: Implement** — `apps/backend/src/db/seed.ts`

At line 775, change:
```ts
await db.insert(schema.coupons).values([
  // ... existing coupon rows verbatim ...
]).onConflictDoUpdate({ target: [schema.coupons.storeId, schema.coupons.code], set: { updatedAt: new Date() } });
```
to:
```ts
await dbOwner.insert(schema.coupons).values([
  // ... existing coupon rows verbatim ...
]).onConflictDoUpdate({ target: [schema.coupons.storeId, schema.coupons.code], set: { updatedAt: new Date() } });
```
`dbOwner` is already imported (line 6: `import { db, dbOwner } from './index.js';`). No other change.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter backend typecheck`
Expected: 0 type errors.

- [ ] **Step 3: Full suite + lint**

Run: `pnpm --filter backend lint && pnpm --filter backend test`
Expected: lint clean; full suite green. (The seed file isn't exercised by the test suite, but typecheck + lint confirm the change compiles. A full `pnpm --filter backend run seed` against a dev DB would confirm the insert bypasses RLS — optional, only if a DB is available; do NOT run seed against a shared DB without the user's ask.)

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/db/seed.ts
git commit -m "refactor(rls): seed coupons via dbOwner (Phase 1 prep)

The coupons seed insert switches from db (app_tenant) to dbOwner (BYPASSRLS) so
it passes WITH CHECK once coupons has RLS. Mirrors the Phase 1 orders/order_items
seed fix. Behavior unchanged (RLS off; dbOwner bypasses)."
```

---

### Task 8: Enable RLS on `carts` + `cart_items` + `coupons` + `coupon_usages` (migration `0026`) + negative test

**Why:** The refactor (Tasks 1-7) is behavior-identical with RLS off. Now flip RLS on and prove the DB enforces isolation independently of the app layer.

**Files:**
- Create: `apps/backend/drizzle/0026_cart_coupons_rls.sql` (gitignored → `git add -f`)
- Modify: `apps/backend/drizzle/meta/_journal.json` (append entry idx 27)
- Create: `apps/backend/src/modules/cart/cart_coupons.rls.test.ts` (real-DB negative test, mirrors `orders.rls.test.ts`)

- [ ] **Step 1: Write the migration SQL** — `apps/backend/drizzle/0026_cart_coupons_rls.sql`

```sql
-- RLS Phase 1: carts + cart_items + coupons + coupon_usages.
-- carts/coupons/coupon_usages are §4.1 tenant tables (storeId uuid notNull) →
-- direct policy. cart_items has NO storeId → §4.2 subquery-to-carts policy.
-- coupon_usages has its OWN storeId (not a subquery child of coupons).
-- See docs/superpowers/specs/2026-06-28-rls-phase1-cart-coupons-design.md §3.
-- Roles + grants are created by src/scripts/rls-roles.ts (idempotent bootstrap,
-- grants DML on ALL tables in public to app_tenant + app_admin), NOT here, so
-- the migration carries only ENABLE/FORCE/policy statements.

ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON carts;
CREATE POLICY tenant_iso ON carts
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON cart_items;
CREATE POLICY tenant_iso ON cart_items
  FOR ALL TO app_tenant
  USING    (EXISTS (SELECT 1 FROM carts c
                     WHERE c.id = cart_items.cart_id
                       AND c.store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid))
  WITH CHECK (EXISTS (SELECT 1 FROM carts c
                     WHERE c.id = cart_items.cart_id
                       AND c.store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid));

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON coupons;
CREATE POLICY tenant_iso ON coupons
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON coupon_usages;
CREATE POLICY tenant_iso ON coupon_usages
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```

- [ ] **Step 2: Register the migration in the journal** — `apps/backend/drizzle/meta/_journal.json`

Append a new entry to the `entries` array (after the `0025` entry, idx 26). Use a `when` value strictly greater than `0025`'s `1780843100000` (e.g. `1780843200000`). No snapshot file is needed (the `0024`/`0025` pilots have no snapshot either; `migrate()` reads the journal + `.sql`, not snapshots):

```json
    {
      "idx": 27,
      "version": "7",
      "when": 1780843200000,
      "tag": "0026_cart_coupons_rls",
      "breakpoints": true
    }
```

- [ ] **Step 3: Write the failing real-DB negative test** — `apps/backend/src/modules/cart/cart_coupons.rls.test.ts`

Mirror `apps/backend/src/modules/order/orders.rls.test.ts` exactly in structure (`tenantUrl`, `tenantClient`/`tenantDb` with `max: 1`, `beforeAll` seeds via `dbOwner`, `setTenant(storeId|null)` helper, `afterAll` cleanup; residue-robust `beforeAll` pre-cleanup via distinct `rls-%` domains). Seed via `dbOwner` (BYPASSRLS): two stores (A, B) with distinct `rls-%` domains; one cart per store (`carts` requires `storeId`, `sessionId` notNull, defaults for subtotal/total/itemCount); one `cart_items` row per cart (`cart_items` requires `cartId`, `productId`, `quantity`, `price`, `total` — `productId` must reference an existing `products` row; seed a product per store first, OR use a fixed existing product id if the dev DB has one — prefer seeding a product per store via `dbOwner`); one coupon per store (`coupons` requires `storeId`, `code`, `type`, `value`); one `coupon_usages` row per coupon (`coupon_usages` requires `couponId`, `customerId`, `orderId`, `storeId` — seed a customer + order per store first, OR reference existing rows; prefer seeding minimal customer+order per store via `dbOwner`).

Tests:
1. fail-closed: `setTenant(null)` → `tenantDb.query.carts.findMany()` is `[]` AND `tenantDb.query.cartItems.findMany()` is `[]` AND `tenantDb.query.coupons.findMany()` is `[]` AND `tenantDb.query.couponUsages.findMany()` is `[]`.
2. single-tenant: `setTenant(storeAId)` → `carts.findMany` length 1 (`storeId === storeAId`); `cartItems.findMany` length 1 (the row belongs to store A's cart); `coupons.findMany` length 1 (`storeId === storeAId`); `couponUsages.findMany` length 1 (`storeId === storeAId`).
3. cross-tenant isolation: `setTenant(storeAId)` → no row with `storeId === storeBId` in `carts`/`coupons`/`coupon_usages`; no `cart_items` row whose parent cart belongs to store B.
4. `setTenant(storeBId)` → sees store B's cart/cart_items/coupon/coupon_usages only.
5. WITH CHECK reject: `setTenant(storeAId)` → inserting a `carts` row with `storeId: storeBId` rejects; inserting a `coupons` row with `storeId: storeBId` rejects; inserting a `coupon_usages` row with `storeId: storeBId` rejects; inserting a `cart_items` row whose `cartId` is store B's cart rejects (subquery `WITH CHECK`).
6. WITH CHECK accept: `setTenant(storeAId)` → insert `carts` with `storeId: storeAId` succeeds (cleanup); insert `cart_items` with `cartId` = the new store-A cart succeeds (cleanup); insert `coupons` with `storeId: storeAId` succeeds (cleanup); insert `coupon_usages` with `storeId: storeAId` succeeds (cleanup).

> Required notNull columns (from `schema.ts`):
> - `carts` (`:524-541`): `storeId`, `sessionId` (notNull). (`customerId` nullable; `subtotal`/`total`/`itemCount` default; `expiresAt` nullable.)
> - `cart_items` (`:543-557`): `cartId`, `productId`, `quantity` (default 1), `price`, `total`. (`productId` FK → `products.id` with `onDelete: cascade` — the product must exist. Seed a product per store via `dbOwner`: `products` requires `storeId`, `titleEn`/`slug`/`price`/etc. — read `schema.ts` products definition for exact notNull columns and seed the minimum.)
> - `coupons` (`:368-391`): `storeId`, `code`, `type`, `value`. (`usageCount`/`isActive`/etc. default.)
> - `coupon_usages` (`:393-404`): `couponId`, `customerId`, `orderId`, `storeId` — all notNull FKs. Seed a customer per store (`customers`: `storeId`, `email`, etc.) and an order per store (`orders`: `storeId`, `orderNumber` unique, `email`, `currency`, `subtotal`, `total`) via `dbOwner` first.
>
> Use `crypto.randomUUID()` for ids and a unique `sessionId`/`orderNumber` per insert (e.g. `` `rls-sess-${crypto.randomUUID()}` ``, `` `RLS-${Date.now()}-${Math.random().toString(36).slice(2)}` `` — `Date.now` is fine in a test file, NOT in a workflow script). FK-respecting cleanup order in `afterAll`: `coupon_usages` → `cart_items` → `carts` → `coupon_usages`'s parents (`orders`, `customers`, `coupons`) → `products` → `stores` (only the `rls-%` rows). Mirror `orders.rls.test.ts`'s cleanup helper.
>
> The `cart_items` subquery policy test (5/6 for `cart_items`) is the new coverage vs. the orders pilot — it proves the §4.2 EXISTS policy works for both USING (read) and WITH CHECK (insert).

- [ ] **Step 4: Apply the migration + run the RLS test**

Apply the migration (runs as `dbOwner`): check `apps/backend/package.json` `scripts` for a `db:migrate`/`migrate` script; if present, `pnpm --filter backend run <script>`. Otherwise: `pnpm --filter backend exec node --experimental-vm-modules -e "import('./src/db/index.js').then(m => m.runMigrations()).then(() => { console.log('migrated'); process.exit(0); })"`. Verify via psql that the policies exist:
```bash
psql "$DATABASE_URL" -c "SELECT tablename, polname FROM pg_policy WHERE polrelid IN ('carts'::regclass,'cart_items'::regclass,'coupons'::regclass,'coupon_usages'::regclass);"
```
Expected: 4 rows, each `tenant_iso`. And `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname IN ('carts','cart_items','coupons','coupon_usages');` → all `t/t`.

Run: `pnpm --filter backend test -- src/modules/cart/cart_coupons.rls.test.ts`
Expected: PASS (6/6) — requires live Postgres with `app_tenant`/`app_admin` roles applied (`pnpm --filter backend exec tsx src/scripts/rls-roles.ts`) and `DATABASE_URL` + `RLS_TENANT_PASSWORD` set. If a test fails with `23505 stores_domain_unique` or `UNDEFINED_VALUE`, it's test-DB residue from a crashed prior run — clean it (FK-respecting order: `DELETE FROM coupon_usages WHERE store_id IN (SELECT id FROM stores WHERE domain LIKE 'rls-%'); DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE store_id IN (SELECT id FROM stores WHERE domain LIKE 'rls-%')); ... DELETE FROM stores WHERE domain LIKE 'rls-%';`) and re-run. Not a code regression.

- [ ] **Step 5: Full suite + typecheck + lint (final gate before RLS goes live)**

Run: `pnpm --filter backend typecheck && pnpm --filter backend lint && pnpm --filter backend test`
Expected: 0 type errors; lint clean; full suite green (913 + all the new routing tests + 6 RLS tests). This is the proof the withTenant refactor survives RLS being ON — a missed wrap zeros out and surfaces here.

- [ ] **Step 6: Force-add the gitignored migration + commit**

```bash
git add -f apps/backend/drizzle/0026_cart_coupons_rls.sql
git add apps/backend/drizzle/meta/_journal.json apps/backend/src/modules/cart/cart_coupons.rls.test.ts
git commit -m "feat(rls): enable RLS on carts + cart_items + coupons + coupon_usages (Phase 1)

Migration 0026: ENABLE+FORCE RLS + tenant_iso policy (NULLIF-hardened) on carts,
coupons, coupon_usages (4.1 direct store_id) and cart_items (4.2 subquery to
carts — no store_id). Closes the cart/coupon zero-out risks: every cart/coupon
read/write now runs inside withTenant(storeId) (Tasks 1-5), the abandoned-cart
cron uses dbAdmin (Task 6), coupons seed uses dbOwner (Task 7). Real-DB negative
test (cart_coupons.rls.test.ts) proves fail-closed, single-tenant visibility,
cross-tenant isolation, and WITH CHECK reject/accept — including the cart_items
subquery policy. Defense-in-depth on the existing where eq(storeId) filters."
```

---

## Post-implementation

- Update `docs/PROGRESS.md` with a "## 2026-06-28 — RLS Phase 1: cart + coupons" record (tables enabled, services refactored, test count).
- Update memory: write a new `rls_phase1_cart_coupons` memory and update `resume-2026-06-28-next-rls-module` (mark cart/coupons done; next = customers). Update the "tables with RLS" list: `wishlists` (0024), `orders`+`order_items` (0025), `carts`+`cart_items`+`coupons`+`coupon_usages` (0026).
- The remaining RLS Phase 1 modules (customers → catalog → reviews → shipping/tax → …) are separate plans per parent spec §5. Do not start them in this plan.
- Do NOT push without an explicit user ask (standing rule). Commit only on user request per task (the plan shows `git commit` per task — run them only when the user has authorized commits for this session).

## Self-review (run after writing — done during planning)

- **Spec coverage:** every item in `2026-06-28-rls-phase1-cart-coupons-design.md` §4 maps to a task: §4.1 cart.repo (6 reads) → Task 1; §4.2 cart.service (6 entries) → Task 2; §4.3 coupon.repo+service → Tasks 4+5; §4.4 cart.route.public (4 sites) → Task 3; §4.5 abandonedCartCron → dbAdmin → Task 6; §4.6 abandonedCartProcessor → withTenant → Task 6; §4.7 seed coupons → dbOwner → Task 7. §3 migration → Task 8. §6 testing → per-task + Task 8. §1 worst risk (validateCoupon) → Task 5 (load-bearing). ✓
- **Placeholder scan:** no TBD/TODO; migration + test code are complete. Behavioral-test mocks specify exact shapes with "adjust if Drizzle call form differs" guards (instructions, not placeholders). ✓
- **Type consistency:** `tx?: DbOrTx` + `const executor = tx ?? db;` uniform; `withTenant(storeId, fn)` signature matches `lib/withTenant.ts`; `recalculateTotals(storeId, cartId)` signature change flagged in Task 2 + applied to all 3 internal callers. ✓
- **Invariants preserved:** `order.service.ts` untouched (already RLS-safe from Phase 1); admin reads stay on `dbAdmin`; `calculateDiscount` not wrapped; external queue/provider calls outside tx; `findCartBySessionId` threaded but not filter-fixed (deferred dead code). ✓
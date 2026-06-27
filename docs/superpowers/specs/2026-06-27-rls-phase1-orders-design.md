# RLS Phase 1 — orders + order_items (module design)

> Applies the locked primitives from the parent spec
> `docs/superpowers/specs/2026-06-27-rls-design.md` (§3 context primitive, §4.1
> tenant-table policy, §5 per-module sequencing) to the **orders** module.
> Read that spec first; this document only specifies the orders-specific
> application and the precise blast radius.

## 1. Goal & threat model

Enable PostgreSQL Row-Level Security on `orders` and `order_items` so a missed
`store_id` filter in the application layer returns **zero rows, not another
tenant's orders** — defense-in-depth on top of the existing `where eq(storeId)`
filters.

Threat model specific to orders:
- **No cross-tenant leak path exists via `db` today.** Every `orderRepo`
  method still on `db` already filters by `storeId` in the WHERE clause
  (verified by the exploration map). The only cross-tenant order/order_items
  reads are `findAll` / `findByIdAdmin` / `findOrderItems`, which already run
  on `dbAdmin` (BYPASSRLS) and are admin-only. RLS here is **pure
  defense-in-depth**; the real risk is **zero-out**, not leakage.
- **Zero-out risk:** every order write/read path uses bare `db.transaction`
  with no `app.tenant_id` set. Under RLS, `store_id = current_setting(...)`
  evaluates to `store_id = NULL` → every query returns zero rows. The most
  dangerous manifestation is `findOrderItemsByOrderId` (used in COD intent +
  Razorpay/Stripe webhooks): under order_items-RLS it returns `[]` → **inventory
  is never decremented on paid orders** (silent under-decrement / oversell).
  Order creation itself would fail at INSERT (`WITH CHECK` reject).

## 2. Scope

**Tables receiving RLS (this phase):** `orders`, `order_items` — both §4.1
direct-`store_id` policy + `FORCE`.

> `order_items` has its own **notNull** `storeId` (`schema.ts:473`), so it is a
> §4.1 tenant table with a **direct** policy — NOT a §4.2 subquery-via-parent
> child. (The four §4.2 subquery children are `cart_items`, `ticket_replies`,
> `return_items`, `webhook_deliveries` — none is `order_items`.)

**Services refactored to `withTenant` (the order-write graph — 5 services):**
- `order.service.ts` — `create` (checkout tx), `updateStatus`, read entries.
- `payment.intent.service.ts` — COD / Razorpay / Stripe intent txs.
- `payment.webhook.service.ts` — Razorpay / Stripe webhook txs (inventory decrement).
- `pos.service.ts` — `createPosOrder` tx.
- `return.service.ts` — `createReturn` + `processRefund` txs.

**Explicitly out of scope (deferred to later phases):**
- `products`, `product_variants`, `productVariantOptions`, `modifierOptions`,
  `modifierGroups` RLS → later **catalog** phase. Checkout's `pricingRepo.*` /
  `productRepo.findManyByIds` reads stay on bare `db` until then. This is safe
  in this phase: `set_config('app.tenant_id', ...)` is a **no-op for tables
  without RLS**, so the products/cart/coupons reads+writes inside the same
  withTenant tx are unaffected.
- `carts`, `cart_items`, `coupons`, `coupon_usages` RLS → later **cart/coupons**
  phase. `incrementCouponUsage`'s id-only `SELECT ... FOR UPDATE` on `coupons`
  (`order.repo.ts:359-363`) and id-only UPDATE (`:381-393`) are fine now and
  **future-proofed automatically** — they run inside the withTenant tx, so when
  coupons gets RLS later the context is already set.
- Dual-use `domain.repo` `findById`/`updateStatus` split → **stores** phase.

## 3. Policy (migration `0025`)

Both tables are §4.1 tenant tables (`storeId uuid notNull`), so the policy is
the standard direct shape, hardened with `NULLIF` so an unset/empty/NULL
context yields zero rows cleanly instead of `''::uuid` throwing a 500
(mirrors migration `0024`):

```sql
-- 0025_orders_order_items_rls.sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON orders
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON order_items
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```

`dbAdmin` (`app_admin`, BYPASSRLS) reads (`findAll`/`findByIdAdmin`/`findOrderItems`)
are unaffected by these policies.

## 4. Refactor — `withTenant` threading

Context primitive (unchanged, from parent spec §3): `withTenant(storeId, fn)`
opens `db.transaction`, issues `SELECT set_config('app.tenant_id', storeId, true)`
(transaction-local; resets at COMMIT/ROLLBACK → safe on pooled connections),
and forwards the tx to `fn`.

**Wrapping pattern:** wrap at the **service-entry / operation level** (parent
spec §3). `order.service.create`'s existing `db.transaction` *becomes* the
withTenant tx (not nested in one) — no savepoint semantics involved.

### 4.1 `order.repo.ts` — `tx` threading gaps (3 methods)

These three methods currently take no `tx` and re-query on bare `db` even when
called from inside a transaction. Under RLS the bare-`db` query runs outside
the withTenant tx → `app.tenant_id` unset → zero rows. Add `tx?: DbOrTx` and
use `const executor = tx ?? db;`:

- `findOrderItemsByOrderId(orderId, storeId, tx?)` — `order.repo.ts:246-249`.
  Callers in `payment.intent.service.ts:90` and `payment.webhook.service.ts:164,280`
  pass their withTenant tx.
- `findById(id, storeId?, tx?)` — `order.repo.ts:184-218`. Callers in
  `order.service.create` final reload, `order.route.*`, `return.service.ts:24`
  pass tx where inside a tx.
- `findByIdSimple(orderId, storeId, tx?)` — `order.repo.ts:220-224`. Callers in
  `payment.route.customer/public`, `payment.intent.service.ts:20`,
  `order.service.updateStatus` pass tx where inside a tx.

Admin reads `findAll` / `findByIdAdmin` / `findOrderItems` stay on `dbAdmin`
(unchanged from Phase 2a).

### 4.2 `order.service.ts`

- `create(data)` — `db.transaction(async (tx) => { ... })` →
  `withTenant(data.storeId, async (tx) => { ... })`. Body unchanged (it already
  threads `tx` to every repo call). The inner reads/writes of `orders`,
  `order_items`, `carts`, `cart_items`, `coupons`, `coupon_usages` all run on
  this tx; only `orders`/`order_items` are RLS-gated, the rest are unaffected.
- `updateStatus(orderId, storeId, status)` — currently bare `db`
  (`findByIdSimple` + `updateOrder` on `db`). Wrap in
  `withTenant(storeId, async (tx) => { ... findByIdSimple(.., tx) ... updateOrder(.., tx) })`.
- Read entries `findById` / `findByStoreId` / `findByCustomerId` — wrap at the
  service method: `return withTenant(storeId, () => orderRepo.<method>(...))`.

### 4.3 `payment.intent.service.ts`

COD (`:66`), Razorpay (`:138`), Stripe (`:180`) `db.transaction` blocks →
`withTenant(storeId, fn)`. Pass `tx` to `findOrderItemsByOrderId` (`:90`) and
to `orderRepo.updateOrder` / `decrementInventory` (already threaded).

### 4.4 `payment.webhook.service.ts`

Razorpay (`:139`) and Stripe (`:257`) `db.transaction` blocks →
`withTenant(storeId, fn)`. Pass `tx` to `findOrderItemsByOrderId` (`:164, :280`).
`storeId` comes from the public webhook route's Host-header resolution and is
already cross-checked against `payment.storeId` (`webhook.service.ts:129,247`),
so `withTenant(storeId)` cannot be spoofed to a wrong tenant.

### 4.5 `pos.service.ts`

`createPosOrder` tx (`:59`) → `withTenant(storeId, fn)`. `generateOrderNumber`
(`pos.repo.ts:116-126`) does a bare-`db` orders uniqueness read with no storeId
filter — add a `tx` param and call it on the withTenant tx so it doesn't
zero-out post-RLS (harmless "not found" today, but correct under RLS).

### 4.6 `return.service.ts`

`createReturn` tx (`:23`) and `processRefund` tx (`:203`) → `withTenant(storeId, fn)`.
`orderRepo.findById(data.orderId, data.storeId)` at `:24` → pass `tx`.
The direct `order_items` read at `:41`
(`tx.select().from(orderItems).where(eq(orderItems.orderId, data.orderId))`)
is already on the tx; under order_items-RLS it now sees `app.tenant_id` and
filters correctly (no `storeId` WHERE needed — RLS enforces it).

### 4.7 Read routes (non-tx endpoints)

`order.route.merchant` (list `:18`, detail `:32`), `order.route.customer`
(list `:18`, detail `:33`), `order.route.public` (detail `:158`, track `:181`,
create `:111`): the public path has no JWT, but `request.storeId` is already
resolved from the Host header by the public scope hook (`scopes/public.ts`), so
`withTenant(request.storeId)` applies uniformly. Wrapping happens at the
service entry (§4.2), so routes need no change beyond what the service
signature already exposes — except where a route calls a repo directly (audit
during implementation; prefer routing through the wrapped service method).

## 5. Sequencing (parent spec §5)

Per-module rule: (1) migrate repos/services to `withTenant` **with RLS still
OFF** (behavior identical — `set_config` is a no-op for non-RLS tables), (2)
enable RLS via migration `0025`, (3) negative real-DB test. A missed
`withTenant` path returns zero rows and surfaces immediately in the existing
test suite (fail-closed by design).

Implementation order (each task independently testable):
1. `order.repo.ts` `tx` threading (3 methods) + tests.
2. `order.service.ts` `create` + `updateStatus` + read entries → `withTenant`.
3. `payment.intent.service.ts` → `withTenant`.
4. `payment.webhook.service.ts` → `withTenant`.
5. `pos.service.ts` → `withTenant`.
6. `return.service.ts` → `withTenant`.
7. Migration `0025` (ENABLE+FORCE+policy on orders + order_items) + `orders.rls.test.ts` negative test.

Tasks 1-6 are pure refactor (RLS off → 872-suite stays green, behavior
identical). Task 7 flips RLS on and adds the negative test.

## 6. Testing

- **Existing suite (872 tests):** must stay green throughout tasks 1-6
  (behavior-identical with RLS off). This is the primary regression gate.
- **`orders.rls.test.ts` (new, task 7):** real-DB test connecting as
  `app_tenant` (mirrors `wishlist.rls.test.ts`), needs live Postgres with the
  roles applied:
  - fail-closed: `app_tenant` with no `app.tenant_id` → 0 rows on `orders`
    and `order_items`.
  - single-tenant visibility: with `app.tenant_id = A` → sees only store A's
    orders + items.
  - cross-tenant isolation: store A context cannot see store B's orders/items.
  - `WITH CHECK` reject: insert an `orders`/`order_items` row with a
    `store_id` ≠ context → rejected; matching `store_id` → accepted.
- **Per-task TDD:** each task writes/extends the behavioral + repo tests for
  the methods it touches (assert `withTenant` is used where RLS will enforce,
  using the existing mock-`db`+`dbAdmin` pattern where the change is
  routing-only; real-DB only for the RLS test in task 7).

## 7. Environment & infra

No new env vars. Roles `app_tenant` / `app_admin` already exist (Phase 0).
Migration `0025` runs via `dbOwner` (`runMigrations`). `.sql` files are
gitignored → `git add -f` the migration.

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Nested-tx → savepoint semantics | Avoided: `order.service.create`'s `db.transaction` *becomes* the withTenant tx, not nested in one. No other path nests. |
| A missed `withTenant` path → zero rows in prod | Fail-closed by design; surfaces immediately in the 872-suite during refactor; negative RLS test in task 7; Phase 3 cutover audit. |
| Public webhook `storeId` from Host header spoofed to wrong tenant | Already cross-checked `payment.storeId !== storeId` rejects mismatch (`webhook.service.ts:129,247`) before `withTenant` runs. |
| `order_items` Drizzle `with: { items: true }` on `findById` partial read | After `tx` threading, the relation loads on the withTenant tx → items visible. Verified by the existing order-detail test. |
| `generateOrderNumber` bare-`db` read zero-out | Thread `tx` (§4.5); correct under RLS. |
| Silent inventory under-decrement (the worst latent defect) | Fixed structurally by §4.3/§4.4 threading `tx` into `findOrderItemsByOrderId`; covered by existing COD/webhook inventory tests. |

## 9. Out of scope (explicit non-goals)

- products/cart/coupons/customers/catalog/reviews/shipping/tax/payments-table/webhooks/support/invoices/returns-table/cms/apiKeys RLS — later phases per parent spec §5.
- Dual-use `domain.repo` split — stores phase.
- Spec §5 staleness update (stores/products not yet RLS) — tracked separately.
- Per-request `request.db` transaction end-state (parent spec §3 deferred alternative) — post-Phase-3.
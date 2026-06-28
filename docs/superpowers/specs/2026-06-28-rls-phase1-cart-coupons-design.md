# RLS Phase 1 — cart + coupons (module design)

> Applies the locked primitives from the parent spec
> `docs/superpowers/specs/2026-06-27-rls-design.md` (§3 context primitive, §4.1
> tenant-table policy, §4.2 child-table subquery policy, §5 per-module
> sequencing) to the **cart/coupons** module. Read that spec first; this
> document only specifies the cart/coupons-specific application and the precise
> blast radius. It mirrors the structure of
> `docs/superpowers/specs/2026-06-27-rls-phase1-orders-design.md` (the Phase 1
> orders module), which shipped green.

## 1. Goal & threat model

Enable PostgreSQL Row-Level Security on `carts`, `cart_items`, `coupons`, and
`coupon_usages` so a missed `store_id` filter in the application layer returns
**zero rows, not another tenant's data** — defense-in-depth on top of the
existing `where eq(storeId)` filters (which are retained).

Threat model specific to cart/coupons:

- **No cross-tenant leak path exists via `db` today.** Every `cartRepo` /
  `couponRepo` method still on `db` already filters by `storeId` in the WHERE
  clause (verified by the exploration map). The only cross-tenant cart read is
  `jobs/abandonedCartCron.ts:28` (an all-stores scan, by design) and the dead
  `findCartBySessionId` (no callers). RLS here is **pure defense-in-depth**;
  the real risks are **zero-out**, not leakage.

- **Zero-out risk #1 — coupon checkout breakage (the worst):**
  `pricingService.computeOrderPricing` (`pricing.service.ts:275`) calls
  `couponService.validateCoupon` (`:304`) **before** `orderService.create`'s
  withTenant tx runs (checkout computes pricing in the route, then calls
  `create` with the computed totals). `validateCoupon` → `couponRepo.findByCode`
  and `couponRepo.countCustomerUsages` run on bare `db` with no `app.tenant_id`.
  Under coupons-RLS they return zero rows → every coupon code reports
  "invalid" at checkout → **all coupon usage silently breaks**.

- **Zero-out risk #2 — abandoned-cart cron silence:**
  `jobs/abandonedCartCron.ts:28` does `db.select().from(carts)` across **all
  stores** (a platform cron). Under carts-RLS on `app_tenant` with no context
  → zero rows → recovery emails never enqueue (silent failure).

- **Already safe — Phase 1 future-proofing pays off:** `orderService.create`'s
  withTenant tx (wrapped in Phase 1) already threads `tx` to
  `orderRepo.findCartByIdScoped`, `deleteCartItems`, `resetCartTotals`, and
  `incrementCouponUsage` (`order.service.ts:171-186`). All four run with
  `app.tenant_id` set, so the cart-clearing and coupon-usage-increment paths
  inside checkout need **no change** — exactly as the Phase 1 orders design §2
  predicted ("future-proofed automatically — they run inside the withTenant
  tx, so when coupons gets RLS later the context is already set").

## 2. Scope

**Tables receiving RLS (this phase, migration `0026`):**

| Table | `storeId` column | Policy shape |
|---|---|---|
| `carts` | `storeId uuid notNull` (`schema.ts:526`) | §4.1 direct + FORCE |
| `cart_items` | **none** (`schema.ts:543-557`) | §4.2 subquery → `carts` + FORCE |
| `coupons` | `storeId uuid notNull` (`schema.ts:370`) | §4.1 direct + FORCE |
| `coupon_usages` | `storeId uuid notNull` (`schema.ts:399`) | §4.1 direct + FORCE |

> `coupon_usages` has its **own** `storeId notNull`, so it is a §4.1 tenant
> table with a **direct** policy — NOT a §4.2 subquery child of `coupons`.
> (The four §4.2 subquery children listed in the parent spec are `cart_items`,
> `ticket_replies`, `return_items`, `webhook_deliveries` — `coupon_usages` is
> not among them.) Only `cart_items` is a §4.2 child in this module.

**Repos refactored with `tx?: DbOrTx` threading:**

- `cart.repo.ts` — 6 read methods currently on bare `db`: `findCartById`,
  `findCartBySessionId`, `findCartItemsByCartId`, `findCartItemById`,
  `findCartItemsByProductId`, `findCartByCustomerId`. (All write methods
  already take `tx?: DbOrTx`.)
- `coupon.repo.ts` — all 9 methods currently on bare `db` with no `tx`:
  `findManyByStoreId`, `countByStoreId`, `findById`, `findByCode`, `create`,
  `update`, `deleteById`, `countCustomerUsages`, `insertCouponUsage`.

**Services wrapped in `withTenant(storeId, fn)` at entry:**

- `cart.service.ts` — `getOrCreateCart`, `mergeCartOnLogin`,
  `recalculateTotals`, `addItem`, `updateItemQuantity`, `removeItem`.
- `coupon.service.ts` — `findByStoreId`, `findById`, `findByCode`, `create`,
  `update`, `delete`, `validateCoupon`. (`calculateDiscount` is pure CPU — no
  DB, no wrap.) **The `validateCoupon` wrap is the structural fix for §1's
  worst risk.**

**Routes:**

- `cart.route.public.ts` — 4 direct `cartRepo.findCartById` call-sites
  (`:23`, `:65`, `:124`, `:168`) wrapped in
  `withTenant(request.storeId, (tx) => cartRepo.findCartById(cartId, request.storeId, tx))`.
- `coupon.route.merchant.ts` / `coupon.route.customer.ts` — call the
  (now-wrapped) `couponService` methods → no route change needed.

**Cross-tenant / worker / seed paths:**

- `jobs/abandonedCartCron.ts` → `dbAdmin` (BYPASSRLS) for the all-stores scan.
- `services/abandonedCartProcessor.service.ts` → wrap the read section in
  `withTenant(storeId, fn)` (single-store; `storeId` comes from job data);
  the `emailQueue.add` enqueue stays **outside** the tx.
- `db/seed.ts:775` → `db.insert(schema.coupons)` switches to `dbOwner`
  (BYPASSRLS) so the seed insert passes `WITH CHECK`. (Only `coupons` is
  seeded among these four tables; `carts`/`cart_items`/`coupon_usages` are
  not seeded.)

**Explicitly out of scope (deferred):**

- `products`, `product_variants`, customers, shipping, tax — later phases.
  `pricingService.computeItemPrice` / `productRepo.findById` /
  `productRepo.findManyByIds` / `shippingService` reads stay on bare `db`
  until then. This is safe in this phase: `set_config('app.tenant_id', ...)`
  is a **no-op for tables without RLS**, so those reads inside the new
  withTenant txs are unaffected.
- `findCartBySessionId` dead-code removal and the duplicate
  `modules/abandonedCart/` + `modules/abandoned-cart/` dir consolidation —
  **note-only, deferred** (neither abandoned-cart merchant route is
  registered in any scope; `findCartBySessionId` has no callers). Both are
  dead code that does not affect RLS at runtime.
- Dual-use `domain.repo` split — stores phase.

## 3. Policy (migration `0026`)

Three §4.1 direct policies + one §4.2 subquery policy. All `NULLIF`-hardened
so an unset/empty/NULL context yields zero rows cleanly instead of `''::uuid`
throwing a 500 (mirrors migrations `0024` and `0025`):

```sql
-- 0026_cart_coupons_rls.sql
-- carts (§4.1 direct)
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON carts
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- cart_items (§4.2 subquery to carts — no store_id column)
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON cart_items
  FOR ALL TO app_tenant
  USING    (EXISTS (SELECT 1 FROM carts c
                    WHERE c.id = cart_items.cart_id
                      AND c.store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid))
  WITH CHECK (EXISTS (SELECT 1 FROM carts c
                    WHERE c.id = cart_items.cart_id
                      AND c.store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid));

-- coupons (§4.1 direct)
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON coupons
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- coupon_usages (§4.1 direct — own store_id)
ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON coupon_usages
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```

The parent FK (`cart_items.cart_id` → `carts.id`) is indexed (PK), so the
`EXISTS` is a cheap index lookup. `WITH CHECK` on `cart_items` INSERT
references the parent `carts` row, which exists in the same transaction.

Roles/grants come from `scripts/rls-roles.ts` (Phase 0) — the four tables are
already granted DML to `app_tenant` / `app_admin`, so the migration carries
only `ENABLE`/`FORCE`/policy statements. `dbAdmin` (`app_admin`, BYPASSRLS)
paths (the abandoned-cart cron) are unaffected by these policies.

## 4. Refactor — `withTenant` threading

Context primitive (unchanged, parent spec §3): `withTenant(storeId, fn)`
opens `db.transaction`, issues
`SELECT set_config('app.tenant_id', storeId, true)` (transaction-local;
resets at COMMIT/ROLLBACK → safe on pooled connections), and forwards the tx
to `fn`.

**Wrapping pattern (unchanged):** wrap at the **service-entry / operation
level** (parent spec §3). Each service entry's existing `db.transaction`
*becomes* the withTenant tx (not nested in one).

### 4.1 `cart.repo.ts` — `tx` threading on 6 reads

Add `tx?: DbOrTx` and `const executor = tx ?? db;` to the six read methods
listed in §2, using the same shape as the existing write methods (e.g.
`insertCart`). `findCartBySessionId` (no `storeId` filter, no callers) is
threaded for consistency but remains dead code — noted, not removed.

### 4.2 `cart.service.ts`

- `getOrCreateCart(cartId, storeId)` →
  `withTenant(storeId, async (tx) => { const existing = cartId ? await cartRepo.findCartById(cartId, storeId, tx) : undefined; ... insertCart({...}, tx) ... })`.
- `mergeCartOnLogin(guestCartId, customerId, storeId, queueService)` → wrap
  the whole method body in `withTenant(storeId, async (tx) => { ... })` so
  the pre-reads (`findCartById`, `findCartByCustomerId`,
  `findCartItemsByCartId`, `productRepo.findManyByIds`) and the existing
  `db.transaction(async (tx) => {...})` block (lines 177-199) share one
  context. **Remove the inner `db.transaction(async (tx) => {...})` wrapper**
  (lines 177-199) and run its body directly on the withTenant tx — do **not**
  keep a nested `db.transaction` (that would create a savepoint). The
  post-merge `deleteCart(guestCartId)` /
  `updateCartCustomerId(guestCartId, customerId)` run on the withTenant tx.
  The `queueService.abandonedCartQueue.add` call (external Redis op) stays
  **outside** the tx — compute results inside, enqueue after, matching the
  current "schedule once after the merge" structure.
- `recalculateTotals(cartId)` →
  `withTenant(storeId, (tx) => cartRepo.recalculateCartTotalsInDb(cartId, tx))`.
  (Requires threading `storeId` into this method — currently signature is
  `recalculateTotals(cartId)`; callers (`addItem`, `updateItemQuantity`,
  `removeItem`) already have `storeId`, so pass it through.)
- `addItem`, `updateItemQuantity`, `removeItem` →
  `withTenant(storeId, async (tx) => { ... all repo calls pass tx ... })`.
  `productRepo.findById` (products, no RLS) runs on the tx — no-op today,
  correct post-catalog-RLS. The `scheduleAbandonedCartRecovery` queue-add
  stays outside the tx (called after the withTenant returns).

### 4.3 `coupon.repo.ts` + `coupon.service.ts`

- `coupon.repo`: add `tx?: DbOrTx` to all 9 methods; `executor = tx ?? db`.
  `create` / `update` / `deleteById` keep returning arrays (callers
  destructure `[x]`).
- `coupon.service`: each entry →
  `withTenant(storeId, async (tx) => couponRepo.<method>(..., tx))`.
  `validateCoupon(code, storeId, orderAmount, customerId)` →
  `withTenant(storeId, async (tx) => { const coupon = await couponRepo.findByCode(code, storeId, tx); ... await couponRepo.countCustomerUsages(coupon.id, customerId, tx); ... return coupon; })`.
  This is the load-bearing change: when `pricingService.computeOrderPricing`
  calls `validateCoupon` pre-checkout, it now self-provides tenant context,
  fixing §1's worst risk without touching `pricing.service`.
  `calculateDiscount` is pure CPU → unchanged (no wrap, no tx).

### 4.4 `cart.route.public.ts` — 4 direct repo reads

The four `await cartRepo.findCartById(cartId, request.storeId)` sites (`:23`,
`:65`, `:124`, `:168`) →
`await withTenant(request.storeId, (tx) => cartRepo.findCartById(cartId, request.storeId, tx))`.
These are ownership-verification reads before delegating to the (already
wrapped) service method; they must see tenant rows post-RLS.

### 4.5 `jobs/abandonedCartCron.ts` — cross-tenant → `dbAdmin`

`db.select().from(carts)` (`:28`) → `dbAdmin.select().from(carts)`. This is a
platform cron scanning all stores' carts — inherently cross-tenant, so the
BYPASSRLS client is the correct primitive (mirrors the Phase 2a routing of
superAdmin / admin reads to `dbAdmin`).

### 4.6 `services/abandonedCartProcessor.service.ts` — single-store → `withTenant`

Wrap the read section (`carts` + `cartItems` + `customers` + `products`
selects, lines 18-47) in `withTenant(storeId, async (tx) => { ... })` using
`job.data.storeId`. Build `itemList` inside the tx; the
`queueService.emailQueue.add` enqueue (`:52`) runs **after** the tx returns
(external Redis op, kept outside per the "external calls outside withTenant"
rule). `customers`/`products` reads are no-ops today (no RLS), correct
post-their-RLS-phases.

### 4.7 `db/seed.ts` — coupons seed → `dbOwner`

`db.insert(schema.coupons)` (`:775`) → `dbOwner.insert(schema.coupons)`.
Under coupons-RLS, an `app_tenant` insert with no `app.tenant_id` hits
`WITH CHECK` and fails; `dbOwner` (BYPASSRLS) bypasses it. Same fix Phase 1
applied to the orders seed.

## 5. Sequencing (parent spec §5)

Per-module rule: (1) migrate repos/services to `withTenant` with RLS still
OFF (behavior identical — `set_config` is a no-op for non-RLS tables), (2)
enable RLS via migration `0026`, (3) negative real-DB test. A missed
`withTenant` path returns zero rows and surfaces immediately in the existing
test suite (fail-closed by design).

Implementation order (each task independently testable):

1. `cart.repo.ts` `tx` threading (6 reads) + `cart.repo.tx.test.ts`.
2. `cart.service.ts` → `withTenant` (6 entries; thread `storeId` into
   `recalculateTotals`) + `cart.service.withTenant.test.ts`.
3. `cart.route.public.ts` 4 `findCartById` wraps + test.
4. `coupon.repo.ts` `tx` threading (9 methods) + `coupon.repo.tx.test.ts`.
5. `coupon.service.ts` → `withTenant` (7 entries) + `coupon.service.withTenant.test.ts`
   (asserts `validateCoupon` runs inside `withTenant` — the regression guard
   for §1's worst risk).
6. `abandonedCartCron` → `dbAdmin`; `abandonedCartProcessor` → `withTenant`
   + tests.
7. `seed.ts` coupons → `dbOwner`.
8. Migration `0026` (ENABLE+FORCE+policy on the 4 tables) +
   `cart_coupons.rls.test.ts` negative test.

Tasks 1–7 are pure refactor (RLS off → 913-suite stays green, behavior
identical). Task 8 flips RLS on and adds the negative test.

## 6. Testing

- **Existing suite (913 tests):** must stay green throughout tasks 1–7
  (behavior-identical with RLS off). This is the primary regression gate.
  The mock-based `coupon.service.test.ts` and `cart.route.public.test.ts`
  need `withTenant` mocked with the sentinel-tx pattern from
  `order.service.withTenant.test.ts` (`vi.mock('../../lib/withTenant.js', ...)`
  invoking `fn` with a sentinel `{ __sentinel: 'tx' }` so callers can assert
  repos received it).

- **`cart_coupons.rls.test.ts` (new, task 8):** real-DB test connecting as
  `app_tenant` (mirrors `orders.rls.test.ts` / `wishlist.rls.test.ts`),
  needs live Postgres with the roles applied:
  - fail-closed: `app_tenant` with no `app.tenant_id` → 0 rows on `carts`,
    `cart_items`, `coupons`, `coupon_usages`.
  - single-tenant visibility: with `app.tenant_id = A` → sees only store A's
    carts + their cart_items + store A's coupons + coupon_usages.
  - cross-tenant isolation: store A context cannot see store B's
    carts/cart_items/coupons/coupon_usages.
  - `WITH CHECK` reject: insert a `carts`/`coupons`/`coupon_usages` row with
    `store_id` ≠ context → rejected; matching `store_id` → accepted. For
    `cart_items`: insert whose parent `carts` row belongs to another tenant
    → rejected by the subquery `WITH CHECK`; parent in the same tenant →
    accepted.
  - residue-robust `beforeAll` pre-cleanup via distinct `rls-%` domains
    (Phase 1 convention).
  - Seed the RLS-enabled tables via `dbOwner` (BYPASSRLS) in the test setup,
    not `db` — or the seed insert hits `WITH CHECK`.

- **Per-task TDD:** each task writes/extends the behavioral + repo tests for
  the methods it touches, using the existing mock-`db` + sentinel-tx pattern
  where the change is routing-only; real-DB only for the RLS test in task 8.

## 7. Environment & infra

No new env vars. Roles `app_tenant` / `app_admin` already exist (Phase 0).
`dbOwner` / `dbAdmin` clients already wired (Phase 0 / Phase 2a). Migration
`0026` runs via `dbOwner` (`runMigrations`). `.sql` files are gitignored →
`git add -f` the migration. Journal entry in
`apps/backend/drizzle/meta/_journal.json` (idx + 1 beyond `0025`).

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Coupon checkout breaks (`validateCoupon` zero-out) | Fixed structurally by §4.3 `coupon.service.validateCoupon` `withTenant` wrap; `coupon.service.withTenant.test.ts` asserts it; existing pricing/checkout tests must stay green. |
| Abandoned-cart cron silently returns 0 carts | `dbAdmin` (BYPASSRLS) in §4.5; covered by a cron test asserting dbAdmin routing. |
| Abandoned-cart processor zero-out on carts/cart_items | `withTenant(storeId)` wrap in §4.6; enqueue stays outside tx. |
| `mergeCartOnLogin` nested-tx / savepoint semantics | The existing `db.transaction` *becomes* the withTenant tx (not nested); pre-reads move inside the same tx. No double-nesting. |
| `couponRepo.create/update/deleteById` return arrays — callers destructure `[x]` | Signatures unchanged (still return arrays); only the executor swaps `db` → `tx ?? db`. |
| `recalculateTotals` signature gains `storeId` | All callers (`addItem`, `updateItemQuantity`, `removeItem`) already hold `storeId`; thread it through. |
| `seed.ts` coupons insert hits `WITH CHECK` | Switch to `dbOwner` (§4.7) — same fix Phase 1 applied to the orders seed. |
| `cart_items` Drizzle `with: { items: true }` partial read on `findCartById` | After `tx` threading, the relation loads on the withTenant tx → items visible under cart_items-RLS. Verified by the existing cart-detail test. |
| Missed `withTenant` path in prod | Fail-closed by design; surfaces immediately in the 913-suite during refactor; negative RLS test in task 8; Phase 3 cutover audit. |

## 9. Out of scope (explicit non-goals)

- `findCartBySessionId` dead-code removal and `abandonedCart` /
  `abandoned-cart` duplicate-dir consolidation — **deferred** (noted, user
  decision 2026-06-28). Both are dead code; neither affects RLS at runtime.
- products/customers/shipping/tax/catalog/reviews/payments-table/webhooks/
  support/invoices/returns-table/cms/apiKeys RLS — later phases per parent
  spec §5.
- `order.service.create` cart/coupon paths — **already RLS-safe** from Phase
  1; no change.
- Dual-use `domain.repo` split — stores phase.
- Removing the app-layer `where eq(storeId)` filters — explicitly **not**
  done; they stay as defense-in-depth.
- Per-request `request.db` transaction model (parent spec §3 deferred
  alternative) — post-Phase-3.
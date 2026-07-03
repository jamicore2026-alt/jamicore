# RLS Phase 1 — catalog (module design)

> Applies the locked primitives from the parent spec
> `docs/superpowers/specs/2026-06-27-rls-design.md` (§3 context primitive, §4.1
> tenant-table policy, §5 per-module sequencing) to the **catalog** module
> (`products`, `product_variants`, `product_variant_options`,
> `product_variant_combinations`). Read the parent spec first; this document
> only specifies the catalog-specific application and the precise blast radius.
> It mirrors the structure of
> `docs/superpowers/specs/2026-06-28-rls-phase1-customers-design.md` (the
> Phase 1 customers module), which shipped green.

## 1. Goal & threat model

Enable PostgreSQL Row-Level Security on the four catalog tables so a missed
`store_id` filter in the application layer returns **zero rows, not another
tenant's product** — defense-in-depth on top of the existing
`where eq(storeId)` filters (which are retained).

Catalog is the most far-reaching Phase 1 module by read-path count: products
are read from the public storefront, merchant admin, checkout price
verification, cart, guest order creation, payment decrement-at-payment,
return/refund restore, analytics, and the seed. The real risks are
**zero-outs**, not leakage (every read already filters by `storeId`):

- **Zero-out risk #1 (worst) — checkout 400s "Product not found" + cart shows
  stale prices.** `pricing.service.computeItemPrice` /
  `computeOrderPricing` read `products`, `product_variants`,
  `product_variant_options`, `product_variant_combinations` via `pricingRepo`
  on bare `db` with **no tenant context and no tx threading**. Under
  catalog-RLS `findProductById` returns `undefined` → `computeItemPrice`
  throws `PRODUCT_NOT_FOUND` → checkout 400s; cart `addItem`/mergeCart 400s
  on every line. Fix: wrap `pricing.service` entries in `withTenant(storeId,
  fn)` and thread `tx` into `pricing.repo` (Approach A — service owns the tx,
  mirrors `analytics.service`).

- **Zero-out risk #2 — public + merchant product routes return empty/404.**
  `productService` runs on bare `db` (no `withTenant`); the public and
  merchant routes call it directly. Under catalog-RLS, `findByStoreId` /
  `findById` / `search` return empty → storefront shows no products; merchant
  dashboard shows no products. Fix: wrap every `productService` entry in
  `withTenant(storeId, fn)`. `product.repo` already threads `tx?: DbExecutor`
  on every method (RLS-ready at the signature level — no change).

- **Zero-out risk #3 — cart finds products on bare `db` inside its withTenant
  block.** `cart.service.ts:173` (`findManyByIds`) and `:332` (`findById`)
  call `productRepo` **without passing `tx`** — the cart/coupons phase left
  these bare deliberately (comment at `:312`: "products, no RLS this phase").
  That comment is now stale. Under catalog-RLS the bare `db` read sees no
  tenant context → returns empty → cart merge/add throw `PRODUCT_NOT_FOUND`.
  Fix: pass `tx` from the surrounding `withTenant` into both calls; update the
  stale comments.

- **Zero-out risk #4 — guest order tracking/creation can't resolve products.**
  `order.route.public.ts:50` calls `productRepo.findManyByIds(productIds,
  storeId)` on bare `db`, outside any `withTenant`, for both guest order
  *creation* (price verification before `orderService.create`) and order
  *tracking* (product-title lookup). Under catalog-RLS this returns empty →
  guest checkout 400s `PRODUCT_NOT_FOUND` per item; tracking shows no titles.
  Fix: wrap the product-verification block (lines ~49–89) in
  `withTenant(storeId, async (tx) => { productRows = await
  productRepo.findManyByIds(productIds, storeId, tx); … })`.

- **Zero-out risk #5 — seed catalog inserts hit `WITH CHECK`.** `db/seed.ts`
  inserts `products` (line 447), `productVariants` (457),
  `productVariantOptions` (466) on bare `db`. Under catalog-RLS an `app_tenant`
  insert with no `app.tenant_id` fails `WITH CHECK`. Fix: switch these three
  inserts (and any `db.query.products` lookups in the same region) to
  `dbOwner` (BYPASSRLS) — same fix Phase 1 applied to the orders + coupons +
  customers seeds. (`modifierGroups`/`modifierOptions`/`reviews` inserts at
  503/515/826 stay on `db` — those tables have no RLS this phase.
  `productVariantCombinations` is not seeded.)

- **Already safe (verify only — no design change):**
  - `payment.webhook.service.ts:172,290` + `payment.intent.service.ts:93`
    call `productRepo.decrementVariantOptionStock(..., tx)` for the
    decrement-at-payment path. These services are already wrapped in
    `withTenant(storeId, …)` from the orders phase and pass `tx` (intent
    explicitly at `:94`; webhook consistent — verify the `tx` arg at `:176`/`:294`
    during implementation). Under catalog-RLS these become tenant-scoped
    automatically. The 0-row oversell guard (`stockQuantity >= quantity`) is
    unaffected by RLS.
  - `order.service` does **not** call `productRepo` directly — product-level
    inventory restore goes through `orderRepo.restoreInventory` (`order.repo.ts:297`,
    tx-threaded, updates `products.currentQuantity`), already wrapped in the
    orders phase. Verify `order.repo` has no other bare `products` read.
  - `return.service.ts:243,246` — already passes `tx` to
    `productRepo.restoreVariantOptionStock` + `orderRepo.restoreInventory`
    (commerce-path audit fix). ✓
  - `analytics.repo.countProducts` — `tx?: DbOrTx` threaded in the customers
    phase; `analytics.service` entries already wrapped in `withTenant`. So the
    merchant-dashboard product count becomes tenant-scoped automatically
    (was a no-op until catalog-RLS — now live). No change.
  - `superAdmin.repo.ts:62` — `dbAdmin.select({count}).from(products).where(eq(products.storeId, storeId))`
    is on the BYPASSRLS client. ✓
  - `abandoned-cart` / `abandonedCartProcessor` — no direct `products` /
    `productRepo` reads (reads carts + customers only). ✓
  - `productRepo.findById` loads `category`, `subcategory`, `modifierGroups`
    (with `options`) relations. Those tables have **no RLS this phase**, so
    they load fine on the `withTenant` tx — `set_config('app.tenant_id', …)`
    is a no-op for non-RLS tables. No change to the relation shape.

- **Already safe (latent, RLS auto-fixes):** `productRepo.findVariantById`
  (repo:165) and every variant/option/combination method already filter by
  `eq(…storeId, storeId)`. RLS gates them automatically; the app-layer filters
  stay as defense-in-depth.

## 2. Scope

**Tables receiving RLS (this phase, migration `0028`):**

| Table | `storeId` column | Policy shape |
|---|---|---|
| `products` | `storeId uuid notNull` (`schema.ts:179`) | §4.1 direct + FORCE |
| `product_variants` | `storeId uuid notNull` (`schema.ts:212`) | §4.1 direct + FORCE |
| `product_variant_options` | `storeId uuid notNull` (`schema.ts:226`) | §4.1 direct + FORCE |
| `product_variant_combinations` | `storeId uuid notNull` (`schema.ts:243`) | §4.1 direct + FORCE |

> All four carry their **own** `storeId notNull`, so each is a §4.1 direct
> tenant table with a **direct** policy — **no §4.2 subquery** needed (contrast
> `cart_items` in the cart/coupons phase, which was a child of `carts` without
> its own `storeId`). The `productId`/`variantId` FKs are irrelevant to the
> policy.

**Repos refactored with `tx?: DbOrTx` threading:**

- `product.repo.ts` — **no signature change**; every method already takes
  `tx?: DbExecutor` and does `const executor = tx ?? db;`. Verified.
- `pricing.repo.ts` — add `tx?: DbOrTx` + `const executor = tx ?? db;` to all
  six methods: `findProductById`, `findVariantOptionsByIds`, `findVariantsByIds`,
  `findCombination`, `findModifierOptionsByIds`, `findModifierGroupsByIds`.
  (`modifierGroups`/`modifierOptions` have no RLS this phase; threading `tx`
  is harmless — `set_config` is a no-op for non-RLS tables, and the executor
  still resolves to `db` when no `tx` is passed.)

**Services wrapped in `withTenant(storeId, fn)` at entry:**

- `product.service.ts` — `findByStoreId`, `findById`, `create`, `update`,
  `delete`, `createVariant`, `updateVariant`, `deleteVariant`,
  `createVariantOption`, `updateVariantOption`, `deleteVariantOption`, `search`.
  Each → `withTenant(storeId, async (tx) => productRepo.<method>(..., tx))`.
  For `create`/`createVariant`/`createVariantOption`, `storeId` is read from
  the insert payload (`data.storeId`), so the wrap uses that storeId and the
  insert passes `WITH CHECK`.
- `pricing.service.ts` — `computeItemPrice` and `computeOrderPricing` →
  `withTenant(storeId, async (tx) => { … })` threading `tx` into every
  `pricingRepo` call. `convertOrderPricing` touches only currency (no catalog
  read) → no wrap. **Approach A**: the service owns the tx; `checkout.route`
  and `cart.service` need **no change** to their pricing calls (nested
  `withTenant`, same working precedent as cart→couponService from the
  cart/coupons phase).

**Call-sites fixed (thread `tx` / wrap):**

- `cart.service.ts:173` — `productRepo.findManyByIds(productIds, storeId, tx)`
  (pass the surrounding `withTenant` tx). Update stale comment at `:170-171`.
- `cart.service.ts:332` — `productRepo.findById(params.productId, storeId, tx)`.
  Update stale comment at `:310-313`.
- `order.route.public.ts:49-89` — wrap the product-verification block in
  `withTenant(storeId, async (tx) => { const productRows = await
  productRepo.findManyByIds(productIds, storeId, tx); … })`. Early `reply.send`
  inside the block becomes `return` from the `withTenant` fn (the reply is
  sent after the fn returns, as in other wrapped routes).
- **Implementation task 0 (audit):** `cart.repo` loads the `product: true`
  relation on cart items (the commerce-path `purchasePrice`-leak fix reads it
  via `cart.service` sanitize); `order.repo` may read `products`. Both repos
  were tx-threaded in prior phases, but products had **no RLS then**, so bare
  `db` product reads may linger inside their `withTenant` blocks (exactly as
  `cart.service` did). Audit both repos for any `db.query.products` / `db.select().from(products)`
  / `products` relation load that does not use the threaded `tx`, and thread
  `tx`. This is the first implementation task because it must land before RLS
  is enabled.

**Routes:**

- `product.route.public.ts`, `product.route.merchant.ts` — call the (now-wrapped)
  `productService` → **no route change needed** (the service wrap covers them).
- `checkout.route.customer.ts` — calls `pricingService.computeOrderPricing`
  (now self-wrapped) → **no route change needed**.
- `order.route.public.ts` — wrap the product-verification block (above).

**Seed:**

- `db/seed.ts:447` (`db.insert(schema.products)`) → `dbOwner.insert`.
- `db/seed.ts:457` (`db.insert(schema.productVariants)`) → `dbOwner.insert`.
- `db/seed.ts:466` (`db.insert(schema.productVariantOptions)`) → `dbOwner.insert`.
- Any `db.query.products.findFirst` lookup in the same seed region →
  `dbOwner.query.products` (none observed, but verify).
- `modifierGroups` (503) / `modifierOptions` (515) / `reviews` (826) inserts
  stay on `db` — those tables have no RLS this phase.

**Explicitly out of scope (deferred):**

- `categories`, `subcategories`, `modifier_groups`, `modifier_options`,
  `product_bundles`, `product_bundle_items`, `reviews` RLS — later phases per
  parent spec §5. Their reads stay on bare `db`; safe because `set_config` is
  a no-op for tables without RLS. (The commerce-path P2 "nested storeId leak
  via `sanitizePublicProduct`" is *not* closed by this phase — categories etc.
  still carry their own `storeId` in nested relations. Deferred to the
  categories/modifier RLS phase.)
- `shipping`, `tax`, `payments`, `webhooks`, `support`, `invoices`, `returns`
  table, `cms`, `apiKeys` — later phases.
- Removing the app-layer `where eq(storeId)` filters — explicitly **not** done;
  they stay as defense-in-depth (RLS is the second layer, not a replacement).
- Per-request `request.db` transaction model (parent spec §3 deferred
  alternative) — post-Phase-3.

## 3. Policy (migration `0028`)

Four §4.1 direct policies, `NULLIF`-hardened so an unset/empty/NULL context
yields zero rows cleanly instead of `''::uuid` throwing a 500 (mirrors
migrations `0024`–`0027`):

```sql
-- 0028_catalog_rls.sql
-- products (§4.1 direct)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON products
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- product_variants (§4.1 direct — own store_id)
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON product_variants
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- product_variant_options (§4.1 direct — own store_id)
ALTER TABLE product_variant_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant_options FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON product_variant_options
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- product_variant_combinations (§4.1 direct — own store_id)
ALTER TABLE product_variant_combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant_combinations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON product_variant_combinations
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```

Roles/grants come from `scripts/rls-roles.ts` (Phase 0) — verify all four tables
are already granted DML to `app_tenant` / `app_admin`; if any are missing, add
the grant to `rls-roles.ts` (not to this migration). The migration carries only
`ENABLE`/`FORCE`/policy statements. `dbAdmin` (`app_admin`, BYPASSRLS) paths
(the superAdmin product count) are unaffected by these policies.

## 4. Refactor — `withTenant` threading

Context primitive (unchanged, parent spec §3): `withTenant(storeId, fn)` opens
`db.transaction`, issues
`SELECT set_config('app.tenant_id', storeId, true)` (transaction-local;
resets at COMMIT/ROLLBACK → safe on pooled connections), and forwards the tx
to `fn`.

**Wrapping pattern (unchanged):** wrap at the **service-entry / operation
level** (parent spec §3). Each service entry's existing `db.transaction`
*becomes* the withTenant tx (not nested in one). Nested `withTenant` (a
wrapped service called from inside another wrapped service's tx) is safe and
already precedented (cart→couponService): Drizzle nested transactions become
SAVEPOINTs on the same connection, and re-setting `app.tenant_id` to the same
value is a no-op.

### 4.1 `product.repo.ts` + `product.service.ts`

- `product.repo`: **no signature change** (already threads `tx` on all
  methods, verified). `findById` loads `category`/`subcategory`/`variants`/
  `modifierGroups` relations on the withTenant tx → the RLS-gated parts
  (`products`, `product_variants`, `product_variant_options`) are visible; the
  non-RLS parts (`categories`, `subcategories`, `modifier_groups`,
  `modifier_options`) load regardless. Correct.
- `product.service`: each entry →
  `withTenant(storeId, async (tx) => productRepo.<method>(..., tx))`.
  - `findByStoreId(storeId, options)` →
    `withTenant(storeId, (tx) => productRepo.findByStoreId(storeId, options, tx))`.
  - `findById(id, storeId)` →
    `withTenant(storeId, (tx) => productRepo.findById(id, storeId, tx))`.
  - `create(data)` → `withTenant(data.storeId, (tx) => productRepo.create(data, tx))`
    (insert passes `WITH CHECK`).
  - `update(id, storeId, data)` →
    `withTenant(storeId, (tx) => productRepo.update(id, storeId, data, tx))`.
  - `delete(id, storeId)` →
    `withTenant(storeId, (tx) => productRepo.delete(id, storeId, tx))`.
  - `createVariant(data)` →
    `withTenant(data.storeId, (tx) => productRepo.createVariant(data, tx))`.
  - `updateVariant`/`deleteVariant(id, storeId, …)` →
    `withTenant(storeId, (tx) => productRepo.<method>(id, storeId, …, tx))`.
  - `createVariantOption(data)` →
    `withTenant(data.storeId, (tx) => productRepo.createVariantOption(data, tx))`.
  - `updateVariantOption`/`deleteVariantOption(id, storeId, …)` →
    `withTenant(storeId, (tx) => productRepo.<method>(id, storeId, …, tx))`.
  - `search(storeId, opts)` →
    `withTenant(storeId, (tx) => productRepo.search(storeId, opts, tx))`.

### 4.2 `pricing.repo.ts` + `pricing.service.ts` (Approach A)

- `pricing.repo`: add `tx?: DbOrTx` + `const executor = tx ?? db;` to all six
  methods. Replace each `db.query.…` / `db.select()` with `executor.…`. No
  behavior change when `tx` is absent (RLS off during refactor → suite stays
  green).
- `pricing.service`:
  - `computeItemPrice(params)` →
    `withTenant(params.storeId, async (tx) => { … })`, threading `tx` into
    `pricingRepo.findProductById`, `findVariantOptionsByIds`, `findVariantsByIds`,
    `findCombination`, `findModifierOptionsByIds`, `findModifierGroupsByIds`.
    (The `bundleRepo.findById(params.bundleId, storeId)` call inside
    `computeItemPrice` stays **bare** — `product_bundles` has no RLS this phase
    and `bundleRepo.findById` does not accept a `tx` param; do not pass one.
    It will be threaded in the future bundles-RLS phase. It runs inside the
    withTenant tx body but on bare `db`, which is correct for a non-RLS table.)
    All pure-CPU decimal math runs inside the tx harmlessly (mirrors
    `auth.service.verifyCustomerCredentials` running bcrypt inside the tx).
  - `computeOrderPricing(params)` →
    `withTenant(params.storeId, async (tx) => { … })`. The per-item
    `computeItemPrice` calls become nested `withTenant` (safe — same value).
    Alternatively, refactor `computeItemPrice` to accept an optional `tx` and
    call it directly with the outer tx to avoid nested transactions; either is
    correct. **Recommended:** keep `computeItemPrice` self-wrapped (simplest,
    matches the "service owns the tx" rule) — the nested-withTenant overhead is
    negligible and already precedented.
    - The cross-module `couponService` / `shippingService` / `taxService` calls
      inside `computeOrderPricing` are themselves wrapped from prior phases;
      they become nested `withTenant` (same value, no-op re-set). Safe.
  - `convertOrderPricing(pricing, targetCurrency)` — touches only
    `currencyService` (no catalog read) → **no wrap**.

### 4.3 `cart.service.ts` — thread `tx` into direct product reads

- `:173` `productRepo.findManyByIds(productIds, storeId)` →
  `productRepo.findManyByIds(productIds, storeId, tx)` (inside the existing
  `mergeCartOnLogin` `withTenant` block). Update the stale comment at `:170-171`.
- `:332` `productRepo.findById(params.productId, storeId)` →
  `productRepo.findById(params.productId, storeId, tx)` (inside the existing
  `addItem` `withTenant` block). Update the stale comment at `:310-313`.
- The `pricingService.computeItemPrice` calls at `:193`/`:347` need **no
  change** — `pricing.service` is now self-wrapped (Approach A).

### 4.4 `order.route.public.ts` — wrap product-verification block

Lines ~49–89 (the `productRows` lookup + per-item price/stock verification
before `orderService.create`) → wrap in
`withTenant(storeId, async (tx) => { const productRows = await
productRepo.findManyByIds(productIds, storeId, tx); … })`. Early
`reply.status(400).send(...)` inside the block becomes `return` from the
`withTenant` fn. `orderService.create` (already wrapped, orders phase) runs
after, unchanged. (The dead `purchasePrice` fallback at `:73` — `product.salePrice || product.purchasePrice || '0'`
— is a deferred P2 from the commerce-path audit; not touched this phase. It is
unreachable because `salePrice` is `notNull`.)

### 4.5 `cart.repo.ts` + `order.repo.ts` — audit (implementation task 0)

Both repos were tx-threaded in prior phases, but products had **no RLS then**,
so bare `db` product reads may linger inside their `withTenant` blocks. Audit:
- `cart.repo` — any `db.query.products` / `products` relation load
  (`with: { product: true }` on cart items) must run on the threaded `tx` (or
  the executor the repo already resolves). If a relation load uses bare `db`
  inside a method that received `tx`, switch it to the executor.
- `order.repo` — any `db.select().from(products)` / `db.query.products` must
  use the threaded `tx`. `restoreInventory` (`:297`) already does (verified).
  Verify no other bare product read exists.

Any fix here is a pure refactor (RLS off → suite stays green).

### 4.6 `db/seed.ts` — catalog inserts → `dbOwner`

`db.insert(schema.products)` (447), `db.insert(schema.productVariants)` (457),
`db.insert(schema.productVariantOptions)` (466) → `dbOwner.insert`. Under
catalog-RLS, an `app_tenant` insert with no `app.tenant_id` hits `WITH CHECK`
and fails; `dbOwner` (BYPASSRLS) bypasses it. Same fix Phase 1 applied to the
orders + coupons + customers seeds. (`modifierGroups`/`modifierOptions`/`reviews`
inserts stay on `db` — no RLS this phase.)

## 5. Sequencing (parent spec §5)

Per-module rule: (1) migrate repos/services to `withTenant` with RLS still OFF
(behavior identical — `set_config` is a no-op for non-RLS tables), (2) enable
RLS via migration `0028`, (3) negative real-DB test. A missed `withTenant`
path returns zero rows and surfaces immediately in the existing test suite
(fail-closed by design).

Implementation order (each task independently testable):

1. **Audit `cart.repo` + `order.repo`** for bare `products` reads inside
   `withTenant` blocks; thread `tx` where found. Pure refactor. Run full suite
   (RLS off → 1003 stays green).
2. **`pricing.repo` tx threading** (6 methods) + **`cart.service` direct
   product calls** (`:173`, `:332` + comment updates) + **`order.route.public`
   product-verification wrap**. Pure refactor (RLS off). Run full suite.
3. **`pricing.service` → `withTenant`** (computeItemPrice + computeOrderPricing)
   + `pricing.service.withTenant.test.ts` (sentinel-tx pattern).
4. **`product.service` → `withTenant`** (12 entries) + `product.service.withTenant.test.ts`.
5. **`seed.ts`** catalog inserts → `dbOwner`.
6. **Migration `0028`** (ENABLE+FORCE+policy on the 4 tables; verify
   `rls-roles.ts` grants) + `catalog.rls.test.ts` negative test (real-DB,
   mirrors `customers.rls.test.ts`).

Tasks 1–5 are pure refactor (RLS off → 1003-suite stays green, behavior
identical). Task 6 flips RLS on and adds the negative test.

## 6. Testing

- **Existing suite (1003 tests):** must stay green throughout tasks 1–5
  (behavior-identical with RLS off). This is the primary regression gate.
  The mock-based `product.service.test.ts`, `product.route.merchant.test.ts`,
  `product.repo.test.ts`, and `pricing.service` tests need the
  `withTenant` sentinel-tx pattern from `order.service.withTenant.test.ts`
  (`vi.mock('../../lib/withTenant.js', …)` invoking `fn` with a sentinel
  `{ __sentinel: 'tx' }` so callers can assert repos received it). Update
  mocks that asserted `productRepo.findById(id, storeId)` to expect the
  trailing `tx` sentinel arg.
- **`cart.service.withTenant.test.ts`** — update to assert `productRepo.findManyByIds`
  / `findById` now receive the sentinel tx (currently asserts bare calls per
  the stale "no RLS this phase" comments).
- **`order.route.public.withTenant.test.ts`** — extend to assert the product
  verification block runs inside `withTenant(storeId)` and `findManyByIds`
  receives the sentinel tx.
- **`pricing.service.withTenant.test.ts` (new, task 3):** sentinel-tx pattern;
  assert `pricingRepo.findProductById` etc. receive the sentinel tx.
- **`catalog.rls.test.ts` (new, task 6):** real-DB test connecting as
  `app_tenant` (mirrors `customers.rls.test.ts` / `orders.rls.test.ts`),
  needs live Postgres with the roles applied:
  - fail-closed: `app_tenant` with no `app.tenant_id` → 0 rows on all 4
    tables.
  - single-tenant visibility: with `app.tenant_id = A` → sees only store A's
    products + their variants/options/combinations.
  - cross-tenant isolation: store A context cannot see store B's catalog rows.
  - `WITH CHECK` reject: insert a row with `store_id` ≠ context → rejected on
    all 4 tables; matching `store_id` → accepted.
  - residue-robust `beforeAll` pre-cleanup via distinct `rls-%` domains /
    store slugs (Phase 1 convention).
  - Seed the RLS-enabled tables via `dbOwner` (BYPASSRLS) in the test setup,
    not `db` — or the seed insert hits `WITH CHECK`.
- **Per-task TDD:** each task writes/extends the behavioral + repo tests for
  the methods it touches, using the existing mock-`db` + sentinel-tx pattern
  where the change is routing-only; real-DB only for the RLS test in task 6.

## 7. Environment & infra

No new env vars. Roles `app_tenant` / `app_admin` already exist (Phase 0).
`dbOwner` / `dbAdmin` clients already wired (Phase 0 / Phase 2a). Migration
`0028` runs via `dbOwner` (`runMigrations`). `.sql` files are gitignored →
`git add -f` the migration. Journal entry in
`apps/backend/drizzle/meta/_journal.json` (idx + 1 beyond `0027`).

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Checkout 400s "Product not found" + cart stale prices (pricing bare) | Fixed structurally by §4.2 `withTenant(storeId)` wrap on `pricing.service`; `pricing.service.withTenant.test.ts` asserts it; checkout/cart full-suite paths surface a miss immediately. |
| Public + merchant product routes empty/404 (product.service bare) | `withTenant(storeId)` wrap on all 12 `productService` entries (§4.1); existing product tests stay green via sentinel-tx pattern. |
| Cart finds products on bare `db` inside withTenant (stale comments) | Thread `tx` at `cart.service:173,332` (§4.3); `cart.service.withTenant.test.ts` updated to assert tx. |
| Guest order tracking/creation can't resolve products | Wrap `order.route.public:49-89` in `withTenant(storeId)` (§4.4); `order.route.public.withTenant.test.ts` extended. |
| `cart.repo`/`order.repo` bare product reads linger (products had no RLS when wrapped) | Audit task 0 (§4.5) threads `tx`; full-suite gate (RLS off) catches behavior drift. |
| Seed catalog inserts hit `WITH CHECK` | Switch to `dbOwner` (§4.6) — same fix Phase 1 applied to orders + coupons + customers seeds. |
| Nested `withTenant` (cart→pricing, pricing→coupon/shipping/tax) | Already precedented (cart→coupon); Drizzle nested tx = SAVEPOINT, re-set `app.tenant_id` to same value = no-op. Safe. |
| `payment.webhook` decrement doesn't pass `tx` | Verify the `tx` arg at `:176`/`:294` during task 1 (intent `:94` confirmed passing `tx`); if missing, thread it — the service is already wrapped. |
| Missed `withTenant` path in prod | Fail-closed by design; surfaces immediately in the 1003-suite during refactor; negative RLS test in task 6; Phase 3 cutover audit. |
| `rls-roles.ts` missing DML grant on one of the 4 tables | Verify in task 6 before enabling; add grant to `rls-roles.ts` (not the migration) if missing. |

## 9. Out of scope (explicit non-goals)

- `categories`/`subcategories`/`modifier_groups`/`modifier_options`/
  `product_bundles`/`product_bundle_items`/`reviews` RLS — later phases per
  parent spec §5. The commerce-path P2 "nested storeId leak via
  `sanitizePublicProduct`" is **not** closed this phase (those tables still
  carry `storeId` in nested relations); deferred to the categories/modifier
  RLS phase.
- `shipping`/`tax`/`payments`/`webhooks`/`support`/`invoices`/`returns`-table/
  `cms`/`apiKeys` RLS — later phases.
- `order.service` / `cart.service` / `coupon.service` / `payment` /
  `analytics` / `pos` / `return.service` paths — **already RLS-safe** from
  prior Phase 1 modules; no change except the `cart.service` direct
  `productRepo` tx threading (§4.3) and the `order.route.public` wrap (§4.4).
- Removing the app-layer `where eq(storeId)` filters — explicitly **not** done;
  they stay as defense-in-depth (RLS is the second layer).
- Per-request `request.db` transaction model (parent spec §3 deferred
  alternative) — post-Phase-3.
- The dead `purchasePrice` price fallback at `order.route.public.ts:73`
  (deferred P2 from the commerce-path audit; unreachable because `salePrice`
  is `notNull`) — not touched.
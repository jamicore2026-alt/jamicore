# RLS Phase 1 — customers (module design)

> Applies the locked primitives from the parent spec
> `docs/superpowers/specs/2026-06-27-rls-design.md` (§3 context primitive, §4.1
> tenant-table policy, §5 per-module sequencing) to the **customers** module.
> Read that spec first; this document only specifies the customers-specific
> application and the precise blast radius. It mirrors the structure of
> `docs/superpowers/specs/2026-06-28-rls-phase1-cart-coupons-design.md` (the
> Phase 1 cart/coupons module), which shipped green.

## 1. Goal & threat model

Enable PostgreSQL Row-Level Security on `customers` and `customer_addresses`
so a missed `store_id` filter in the application layer returns **zero rows,
not another tenant's data** — defense-in-depth on top of the existing
`where eq(storeId)` filters (which are retained; one missing filter is also
*added* — see §1 "Already safe" below).

`customers` is the most far-reaching Phase 1 module so far: it is read from
**many auth paths**, including pre-auth token-based paths that carry no
`storeId` in the request. The real risks are **zero-out**, not leakage.

- **Zero-out risk #1 (worst) — every authenticated customer request 401s.**
  The customer scope hook (`scopes/customer.ts:89`) calls
  `authService.findCustomerForVerification(decoded.customerId)` →
  `authRepo.findCustomerById` on bare `db` with no tenant context. Under
  customers-RLS this returns `undefined` → the scope hook sends
  `401 Customer not found` on **every** authenticated customer request.
  Structural fix: wrap the call in `withTenant(decoded.storeId, …)` and
  thread `storeId` + `tx` into `findCustomerForVerification` / `findCustomerById`.

- **Zero-out risk #2 — login / register / forgot-password break.**
  `verifyCustomerCredentials`, `registerCustomer`, `requestPasswordReset` all
  read `customers` on bare `db`. These are pre-auth paths; `storeId` comes
  from `resolveStoreId(request)` (host header). Fix: wrap each in
  `withTenant(storeId, …)`.

- **Zero-out risk #3 — verify-email / reset-password break (the trickiest).**
  `authService.verifyEmail` / `resetPassword` run
  `db.transaction(async (tx) => { … })` and read/update `customers` via
  `authRepo.updateCustomerVerified` / `updateCustomerPassword` /
  `findCustomerByEmailAndStoreId` on `tx` with **no tenant context** → zero
  rows match → verify-email throws "Customer not found"; reset-password
  silently no-ops. These paths have **no `storeId` in the request** — the
  `storeId` lives in the `verificationTokens` row read at the top of the same
  transaction. Fix: after the token read, issue
  `tx.execute(sql\`SELECT set_config('app.tenant_id', ${record[0].storeId}, true)\`)`
  on the existing tx (the `db.transaction` *becomes* the withTenant tx — same
  "existing tx becomes the withTenant tx" pattern as cart/coupons, just inlined
  because `storeId` is only known mid-tx). The `withTenant` helper cannot be
  used here since `storeId` is unknown at tx-open.

- **Zero-out risk #4 — MFA enable/disable, /me, profile, GDPR, merchant
  customer routes break.** All read `customers` via `authRepo` / `customerRepo`
  on bare `db`. These are authenticated; `request.storeId` comes from the JWT.
  Fix: wrap the service entries in `withTenant(request.storeId, …)`.

- **Zero-out risk #5 — merchant dashboard analytics.**
  `analytics.repo.ts` reads `customers` (this phase) plus `orders` /
  `orderItems` (already RLS from the orders phase) on bare `db` with **zero
  test coverage**; merchant dashboard counts are likely already silently
  zeroing out for orders since the orders phase shipped. Fix: wrap all
  `analyticsService` entry points in `withTenant(storeId)` — fixes customer
  reads this phase **and** the latent orders/orderItems zero-out (bonus);
  `products` reads are a no-op until catalog-RLS.

- **Already safe — `findCustomerById` has NO `storeId` filter today** (latent
  cross-tenant read: `where eq(customers.id, customerId)` only). RLS will fix
  this automatically (tenant context gates it). Per the parent spec "keep
  app-layer `where` filters as defense-in-depth," this phase **adds** the
  missing `eq(customers.storeId, storeId)` and threads `storeId` through
  `findCustomerForVerification` / `findCustomerById`, so the application layer
  also enforces it (and mock-based tests can assert it).

- **Already safe (no change needed):**
  - `superAdmin.repo.ts:64` — `dbAdmin.select({count}).from(customers).where(eq(customers.storeId, storeId))` is already on the BYPASSRLS client.
  - `services/abandonedCartProcessor.service.ts:32` — already runs inside `withTenant(storeId, …)` (wrapped in the cart/coupons phase), so its `tx.select().from(customers)` will be visible post-customers-RLS with no change.

## 2. Scope

**Tables receiving RLS (this phase, migration `0027`):**

| Table | `storeId` column | Policy shape |
|---|---|---|
| `customers` | `storeId uuid notNull` (`schema.ts:325`) | §4.1 direct + FORCE |
| `customer_addresses` | `storeId uuid notNull` (`schema.ts:350`) | §4.1 direct + FORCE |

> `customer_addresses` has its **own** `storeId notNull`, so it is a §4.1
> direct tenant table with a **direct** policy — **not** a §4.2 subquery child
> of `customers`. (Its `customerId` FK → `customers.id` is irrelevant to the
> policy; the table already carries `storeId`.)

**Repos refactored with `tx?: DbOrTx` threading:**

- `customer.repo.ts` — all methods already take `tx?: DbExecutor`. No signature
  change; the `withTransaction` in `create` *becomes* the withTenant tx (not
  nested in one).
- `auth.repo.ts` — customer methods already take `tx?: DbExecutor`:
  `findCustomerByEmailAndStoreId`, `findCustomerById`,
  `findCustomerByEmailAndStoreIdForResetCheck`, `createCustomer`,
  `updateCustomerPassword`, `updateCustomerVerified`, `updateCustomerLastLogin`,
  `updateCustomerMfaStatus`. **`findCustomerById` gains a `storeId` param**
  (defense-in-depth fix above); its `where` adds `eq(customers.storeId, storeId)`.
- `analytics.repo.ts` — all methods currently on bare `db`; add `tx?: DbOrTx`
  and `const executor = tx ?? db;` to `countCustomers`,
  `getNewVsReturningCustomers`, **and** the orders/orderItems methods
  (`countOrders`, `getRevenueStats`, `countRecentOrders`, `getRecentRevenue`,
  `getRevenueByPeriod`, `getTopProducts`, `getOrdersByStatus`) so the bonus
  fix lands consistently. (`countProducts` is also threaded — no-op until
  catalog-RLS.)

**Services wrapped in `withTenant(storeId, fn)` at entry:**

- `customer.service.ts` — `findByStoreId`, `findById`, `create` (the existing
  `withTransaction` *becomes* the withTenant tx — not nested), `update`,
  `findByEmail`, `gdprExport`, `deleteProfile`. Each entry:
  `withTenant(storeId, async (tx) => customerRepo.<method>(..., tx))`.
- `auth.service.ts` customer methods — `verifyCustomerCredentials`,
  `registerCustomer`, `getCustomerProfile`, `findCustomerForVerification`
  (gains `storeId`), `updateCustomerLastLogin`, `requestPasswordReset`,
  `resendVerification`, `enableCustomerMfa`, `disableCustomerMfa`.
  `verifyEmail` / `resetPassword` use **inline `set_config`** (not the
  `withTenant` helper) per §1 risk #3.
- `analytics.service.ts` — `getDashboardStats`, `getPublicStats`,
  `getTopProducts`, `getOrderStatusBreakdown`, `getCustomerInsights`,
  `getRevenueByPeriod`. Each wraps its repo calls in
  `withTenant(storeId, async (tx) => repo.<method>(storeId, …, tx))`; the
  cache `get`/`set` stays **outside** the tx (external Redis op).

**Routes (route-level wraps where the route calls a repo/auth method
directly, not via an already-wrapped service):**

- `scopes/customer.ts:89` —
  `findCustomerForVerification(decoded.customerId)` →
  `withTenant(decoded.storeId, (tx) => authService.findCustomerForVerification(decoded.customerId, decoded.storeId, tx))`.
  Imports `withTenant` into the scope file.
- `auth.route.session.ts` `/me` — `getCustomerProfile(customerId)` → thread
  `request.storeId`; `updateCustomerLastLogin` runs inside the login
  `withTenant`.
- `auth.route.password.ts` `/resend-verification` —
  `findCustomerForVerification` → `withTenant(request.storeId, …)`.
- `auth.route.mfa.ts` `/mfa/resend`, `/mfa/enable`, `/mfa/disable` —
  `getCustomerProfile` / `verifyCustomerCredentials` / `enableCustomerMfa` /
  `disableCustomerMfa` → `withTenant(request.storeId, …)`.
- `customer.route.customer.ts`, `customer.route.gdpr.ts`,
  `customer.route.merchant.ts` — call the (now-wrapped) `customerService` →
  no route change needed.

**Seed:**

- `db/seed.ts` — `db.insert(schema.customers)` (line 572),
  `db.query.customers.findFirst` (576, 577), `db.insert(schema.customerAddresses)`
  (584, 613) → `dbOwner` (BYPASSRLS) so the seed insert passes `WITH CHECK`
  under customers-RLS. Same fix Phase 1 applied to the orders + coupons seeds.

**Explicitly out of scope (deferred):**

- `products`, `product_variants`, catalog, reviews, shipping, tax, payments,
  webhooks, support, invoices, returns, cms, apiKeys — later phases per
  parent spec §5. `productRepo` / `shippingService` / `reviewRepo` reads stay
  on bare `db` until then; safe because `set_config('app.tenant_id', …)` is a
  no-op for tables without RLS.
- `verification_tokens` RLS-exemption + grant removal (Phase 2 edge case).
  `verifyEmail` / `resetPassword` raw `tx.select().from(verificationTokens)`
  still works today (the table is still granted to `app_tenant`); will be
  revisited in Phase 2.
- Per-request `request.db` transaction model (parent spec §3 deferred
  alternative) — post-Phase-3.
- Removing the app-layer `where eq(storeId)` filters — explicitly **not** done
  (this phase *adds* the missing one on `findCustomerById`; the rest stay as
  defense-in-depth).
- `findCartBySessionId` dead-code / abandoned-cart dir consolidation —
  deferred (carried over from the cart/coupons spec; not a customers concern).

## 3. Policy (migration `0027`)

Two §4.1 direct policies, `NULLIF`-hardened so an unset/empty/NULL context
yields zero rows cleanly instead of `''::uuid` throwing a 500 (mirrors
migrations `0024`–`0026`):

```sql
-- 0027_customers_rls.sql
-- customers (§4.1 direct)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON customers
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- customer_addresses (§4.1 direct — own store_id, not a child of customers)
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON customer_addresses
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```

Roles/grants come from `scripts/rls-roles.ts` (Phase 0) — both tables are
already granted DML to `app_tenant` / `app_admin`, so the migration carries
only `ENABLE`/`FORCE`/policy statements. `dbAdmin` (`app_admin`, BYPASSRLS)
paths (the superAdmin customer count) are unaffected by these policies.

## 4. Refactor — `withTenant` threading

Context primitive (unchanged, parent spec §3): `withTenant(storeId, fn)`
opens `db.transaction`, issues
`SELECT set_config('app.tenant_id', storeId, true)` (transaction-local;
resets at COMMIT/ROLLBACK → safe on pooled connections), and forwards the tx
to `fn`.

**Wrapping pattern (unchanged):** wrap at the **service-entry / operation
level** (parent spec §3). Each service entry's existing `db.transaction`
*becomes* the withTenant tx (not nested in one). The single deliberate
deviation is `verifyEmail` / `resetPassword` (§1 risk #3), which inline
`set_config` mid-tx because `storeId` is read from the token inside the tx.

### 4.1 `customer.repo.ts` + `customer.service.ts`

- `customer.repo`: no signature change (already threads `tx`). `create`'s
  `withTransaction(async (tx) => …)` becomes the withTenant tx — the service
  wraps it: `withTenant(storeId, async (tx) => customerRepo.create(..., tx))`
  and `withTransaction` is replaced by direct `tx` use (or kept as a thin
  alias that forwards the tx) — implementation choice, behavior identical.
- `customer.service`: each entry →
  `withTenant(storeId, async (tx) => customerRepo.<method>(..., tx))`.
  `findById` and `gdprExport` load relations (`addresses`, `orders`, `reviews`,
  `couponUsages`); these load on the withTenant tx → visible under
  `customer_addresses`-RLS and the already-enabled `orders` / `coupon_usages`
  RLS. `reviews` are a no-op today (no RLS), correct post-reviews-RLS.

### 4.2 `auth.repo.ts` + `auth.service.ts` (customer methods)

- `auth.repo.findCustomerById(customerId, storeId, tx?)` — add `storeId` param
  and `eq(customers.storeId, storeId)` to the `where` (defense-in-depth fix
  for the latent cross-tenant read). All other customer methods keep their
  existing signatures (they already filter by `storeId`).
- `auth.service` customer entries → `withTenant(storeId, async (tx) => …)`:
  - `verifyCustomerCredentials(email, password, storeId)` →
    `withTenant(storeId, async (tx) => { const customer = await authRepo.findCustomerByEmailAndStoreId(email, storeId, tx); … bcrypt.compare … return customer; })`.
    (bcrypt is pure CPU — runs inside the tx harmlessly, or after; either is
    fine. Keep the existing structure: read inside tx, compare inside tx.)
  - `registerCustomer(data)` → existence-check read + `createCustomer` insert
    both inside `withTenant(data.storeId, …)` so the insert passes `WITH CHECK`.
  - `getCustomerProfile(customerId, storeId)` →
    `withTenant(storeId, (tx) => authRepo.findCustomerById(customerId, storeId, tx))`.
  - `findCustomerForVerification(customerId, storeId)` →
    `withTenant(storeId, (tx) => authRepo.findCustomerById(customerId, storeId, tx))`.
  - `updateCustomerLastLogin(customerId, storeId)` →
    `withTenant(storeId, (tx) => authRepo.updateCustomerLastLogin(customerId, storeId, tx))`.
  - `requestPasswordReset` (customer branch) →
    `withTenant(storeId, (tx) => authRepo.findCustomerByEmailAndStoreId(email, storeId, tx))`.
  - `resendVerification` (customer branch) →
    `withTenant(storeId, (tx) => authRepo.findCustomerByEmailAndStoreIdForResetCheck(email, storeId, tx))`.
  - `enableCustomerMfa` / `disableCustomerMfa` →
    `withTenant(storeId, (tx) => authRepo.updateCustomerMfaStatus(customerId, enabled, tx))`
    (thread `storeId` into these service methods; callers in the MFA route
    have `request.storeId`). Note: `updateCustomerMfaStatus` currently filters
    only by `id`; under RLS the tenant context gates it — consider also adding
    `eq(storeId)` for defense-in-depth (the route has `storeId`).
  - `verifyEmail` / `resetPassword` — **inline `set_config`** (§1 risk #3):
    after `const record = await tx.select().from(verificationTokens)… .for('update')`
    and the empty-record guard, add
    `await tx.execute(sql\`SELECT set_config('app.tenant_id', ${record[0].storeId}, true)\`)`
    before the customer reads/writes. The rest of the tx body runs with tenant
    context set. `record[0].storeId` is `string | null` from the token row;
    the customer branch is gated on `record[0].storeId` truthy, so the cast is
    safe.

### 4.3 `scopes/customer.ts` — scope hook wrap

Line 89: `const customer = await fastify.authService.findCustomerForVerification(decoded.customerId);`
→ `const customer = await withTenant(decoded.storeId, (tx) => fastify.authService.findCustomerForVerification(decoded.customerId, decoded.storeId, tx));`.
Import `withTenant` from `../lib/withTenant.js`. `decoded.storeId` is already
verified non-empty (the scope hook checks `decoded.customerId && decoded.storeId`
just above). This is the load-bearing fix for §1's worst risk.

### 4.4 `analytics.repo.ts` + `analytics.service.ts`

- `analytics.repo`: add `tx?: DbOrTx` + `executor = tx ?? db` to every method
  (they are standalone `export async function`s, not a repo object). The
  orders/orderItems methods get the same treatment so the latent zero-out is
  fixed uniformly.
- `analytics.service`: each entry →
  `withTenant(storeId, async (tx) => repo.<method>(storeId, …, tx))`. The
  cache `get`/`set` wraps the whole entry (cache lookup before, cache set
  after) and stays **outside** the tx. `getCustomerInsights` /
  `getDashboardStats` call multiple repo methods — all share one
  `withTenant(storeId, async (tx) => Promise.all([…]))` so a single
  transaction-local context covers them.

### 4.5 `db/seed.ts` — customers + addresses seed → `dbOwner`

`db.insert(schema.customers)` (572), `db.query.customers.findFirst` (576,
577), `db.insert(schema.customerAddresses)` (584, 613) → `dbOwner` /
`dbOwner.query`. Under customers-RLS, an `app_tenant` insert with no
`app.tenant_id` hits `WITH CHECK` and fails; `dbOwner` (BYPASSRLS) bypasses
it. Same fix Phase 1 applied to the orders + coupons seeds.

## 5. Sequencing (parent spec §5)

Per-module rule: (1) migrate repos/services to `withTenant` with RLS still
OFF (behavior identical — `set_config` is a no-op for non-RLS tables), (2)
enable RLS via migration `0027`, (3) negative real-DB test. A missed
`withTenant` path returns zero rows and surfaces immediately in the existing
test suite (fail-closed by design).

Implementation order (each task independently testable):

1. `customer.repo` verify tx threading (already present) +
   `customer.service` → `withTenant` (7 entries) +
   `customer.service.withTenant.test.ts`.
2. `auth.repo.findCustomerById` gains `storeId` + defense-in-depth `where`;
   `auth.service` customer methods → `withTenant`
   (login/register/profile/MFA/reset-request/resend) +
   `auth.service.withTenant.test.ts`.
3. `auth.service.verifyEmail` / `resetPassword` inline `set_config` +
   test asserting customer rows are visible inside the tx.
4. `scopes/customer.ts` scope hook wrap + `auth.route.session/password/mfa`
   route wraps + tests (sentinel-tx pattern).
5. `analytics.repo` tx threading + `analytics.service` → `withTenant` +
   new `analytics.service.withTenant.test.ts` (asserts wrap + non-zero counts
   under tenant context — closes the latent zero-out gap).
6. `seed.ts` customers + addresses → `dbOwner`.
7. Migration `0027` (ENABLE+FORCE+policy on the 2 tables) +
   `customers.rls.test.ts` negative test.

Tasks 1–6 are pure refactor (RLS off → 956-suite stays green, behavior
identical). Task 7 flips RLS on and adds the negative test.

## 6. Testing

- **Existing suite (956 tests):** must stay green throughout tasks 1–6
  (behavior-identical with RLS off). This is the primary regression gate.
  The mock-based `auth.service.test.ts`, `auth.route.customer.test.ts`, and
  `customer.service` tests need `withTenant` mocked with the sentinel-tx
  pattern from `order.service.withTenant.test.ts`
  (`vi.mock('../../lib/withTenant.js', …)` invoking `fn` with a sentinel
  `{ __sentinel: 'tx' }` so callers can assert repos received it).
  `findCustomerForVerification` / `getCustomerProfile` gain a `storeId` arg —
  update the mocks in `auth.route.customer.test.ts:19,649,697`.

- **`customers.rls.test.ts` (new, task 7):** real-DB test connecting as
  `app_tenant` (mirrors `orders.rls.test.ts` / `wishlist.rls.test.ts`), needs
  live Postgres with the roles applied:
  - fail-closed: `app_tenant` with no `app.tenant_id` → 0 rows on `customers`
    and `customer_addresses`.
  - single-tenant visibility: with `app.tenant_id = A` → sees only store A's
    customers + their addresses.
  - cross-tenant isolation: store A context cannot see store B's
    customers / addresses.
  - `WITH CHECK` reject: insert a `customers` / `customer_addresses` row with
    `store_id` ≠ context → rejected; matching `store_id` → accepted.
  - residue-robust `beforeAll` pre-cleanup via distinct `rls-%` domains
    (Phase 1 convention).
  - Seed the RLS-enabled tables via `dbOwner` (BYPASSRLS) in the test setup,
    not `db` — or the seed insert hits `WITH CHECK`.

- **New analytics tests (task 5):** `analytics.service.withTenant.test.ts`
  using the sentinel-tx pattern; additionally at least one real-DB assertion
  that `getDashboardStats` / `getCustomerInsights` return non-zero counts under
  tenant context (closes the latent zero-out gap that has no coverage today).

- **Per-task TDD:** each task writes/extends the behavioral + repo tests for
  the methods it touches, using the existing mock-`db` + sentinel-tx pattern
  where the change is routing-only; real-DB only for the RLS test in task 7.

## 7. Environment & infra

No new env vars. Roles `app_tenant` / `app_admin` already exist (Phase 0).
`dbOwner` / `dbAdmin` clients already wired (Phase 0 / Phase 2a). Migration
`0027` runs via `dbOwner` (`runMigrations`). `.sql` files are gitignored →
`git add -f` the migration. Journal entry in
`apps/backend/drizzle/meta/_journal.json` (idx + 1 beyond `0026`).

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Every customer request 401s (scope hook zero-out) | Fixed structurally by §4.3 `withTenant(decoded.storeId)` wrap; `auth.route.customer.test.ts` (sentinel-tx) asserts it; the full suite's customer routes surface a miss immediately. |
| Login/register/forgot-password zero-out | `withTenant(storeId)` wrap on the auth-service entries (§4.2); existing auth tests must stay green. |
| verify-email / reset-password zero-out (token-based, no storeId in request) | Inline `set_config` mid-tx using `record[0].storeId` (§4.2); test asserts customer rows visible inside the tx. |
| MFA enable/disable / /me / profile / GDPR / merchant routes zero-out | `withTenant(request.storeId)` wraps (§4.2 + routes); existing tests stay green. |
| Merchant dashboard analytics zero-out (customers + latent orders) | `analyticsService` entry-point wraps (§4.4); new analytics tests assert non-zero counts under context. |
| `findCustomerById` latent cross-tenant read (no `storeId` filter) | RLS gates it automatically; **plus** add `eq(storeId)` app-layer filter + thread `storeId` (§4.2) for defense-in-depth. |
| `seed.ts` customers/addresses insert hits `WITH CHECK` | Switch to `dbOwner` (§4.5) — same fix Phase 1 applied to orders + coupons seeds. |
| `verifyEmail`/`resetPassword` raw `tx.select().from(verificationTokens)` breaks if Phase 2 removes the `app_tenant` grant | Out of scope this phase (table still granted today); flagged for Phase 2 (`verification_tokens` edge case). The inline `set_config` runs *after* the token read, so ordering is correct. |
| `record[0].storeId` is `string \| null` | The customer branch is gated on `record[0].storeId` truthy before `set_config`; the cast is safe. |
| Missed `withTenant` path in prod | Fail-closed by design; surfaces immediately in the 956-suite during refactor; negative RLS test in task 7; Phase 3 cutover audit. |

## 9. Out of scope (explicit non-goals)

- products/catalog/reviews/shipping/tax/payments/webhooks/support/invoices/
  returns-table/cms/apiKeys RLS — later phases per parent spec §5.
- `verification_tokens` RLS-exemption + grant removal — Phase 2 edge case.
- `order.service` / `cart.service` / `coupon.service` paths — **already
  RLS-safe** from prior Phase 1 modules; no change.
- Removing the app-layer `where eq(storeId)` filters — explicitly **not** done;
  they stay as defense-in-depth (this phase *adds* the missing one on
  `findCustomerById`).
- Per-request `request.db` transaction model (parent spec §3 deferred
  alternative) — post-Phase-3.
- `findCartBySessionId` dead-code / abandoned-cart dir consolidation —
  deferred (carried over from the cart/coupons spec).
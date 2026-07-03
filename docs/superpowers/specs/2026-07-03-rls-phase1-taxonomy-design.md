# RLS Phase 1 — taxonomy (categories / subcategories / modifierGroups / modifierOptions / productBundles / productBundleItems) Design

**Date:** 2026-07-03
**Branch:** `fix/domain-feature-p0` (PR #16)
**Predecessors:** RLS Phase 0 (wishlists pilot), Phase 1 orders (0025), cart+coupons (0026), customers (0027), catalog product-tables (0028).

## 1. Goal

Enable PostgreSQL row-level security on the 6 taxonomy tables so the database enforces tenant isolation independently of the application layer, and thread a tenant-scoped transaction (`withTenant`) through every application read/write of those tables.

Tables in scope (Drizzle symbol → Postgres name):
- `categories` → `categories`
- `subcategories` → `subcategories`
- `modifierGroups` → `modifier_groups`
- `modifierOptions` → `modifier_options`
- `productBundles` → `product_bundles`
- `productBundleItems` → `product_bundle_items`

All 6 carry their own `storeId notNull` → **§4.1 direct tenant-table policy** (same as the catalog product-tables phase). No §4.2 subquery children in this cluster.

Per the master RLS design §5 ordering (`products → orders → cart/coupons → customers → catalog (categories/subcategories/modifiers/bundles) → reviews/wishlists → shipping/tax/payments → …`), this is the spec's "catalog" cluster. The previous phase shipped under the name "catalog" but covered the **product** tables (products/variants/options/combinations, migration 0028); this phase covers the **taxonomy** tables that the spec groups under "catalog". Named "taxonomy" to disambiguate.

## 2. Architecture

**Approach A — service owns the transaction** (same as all prior phases). Each service entry is wrapped in `withTenant(storeId, (tx) => repo.<method>(..., tx))`. `withTenant` opens a `db.transaction`, calls `set_config('app.tenant_id', storeId, true)` (transaction-local), and forwards the tx to the repo. Repos accept `tx?: DbOrTx` and use `const executor = tx ?? db;`. Nested `withTenant` with the same storeId is a safe no-op re-set (precedent: cart → couponService, pricing → nested).

`DbOrTx = typeof db | Transaction` from `apps/backend/src/modules/_shared/db-types.ts`.

**RLS policy shape (NULLIF-hardened §4.1, both USING + WITH CHECK):**
```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <table> FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON <table>;
CREATE POLICY tenant_iso ON <table>
  FOR ALL
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```
NULLIF-hardening means an unset/NULL `app.tenant_id` yields zero rows instead of `''::uuid` throwing — fail-closed for code paths that forget `withTenant`.

`dbOwner`/`dbAdmin` (BYPASSRLS) are used for seed inserts and cross-tenant/admin reads. `db` is the `app_tenant` client (RLS-enforced). `rls-roles.ts` grants DML on ALL tables in `public` generically → migration 0029 carries only ENABLE/FORCE/policy, no GRANT changes.

## 3. Audit findings (load-bearing input)

Bare-db audit across all 12 source files that reference the 6 tables:

### 3.1 Needs tx threading (BARE → THREADED)

**`modules/category/category.repo.ts`** — 9 access points, no method takes `tx` today.
- `categories`: `findManyByStoreId` (L13 `db.query.categories.findMany`), `countByStoreId` (L26 `db.select().from(categories)`), `findById` (L32 `db.query.categories.findFirst`), `create` (L41 `db.insert`), `update` (L45 `db.update`), `delete` (L53 `db.delete`).
- `subcategories`: `createSubcategory` (L62 `db.insert`), `updateSubcategory` (L66 `db.update`), `deleteSubcategory` (L73 `db.delete`).
- Action: add `tx?: DbOrTx` (last arg) to all 9 methods + `const executor = tx ?? db;` + `db.`→`executor.`.

**`modules/category/category.service.ts`** — pure delegation to repo, no `withTenant`.
- Action: wrap every entry in `withTenant(storeId, (tx) => categoryRepo.<method>(..., tx))`. Import `withTenant` from `../../lib/withTenant.js`.

**`modules/modifier/modifier.repo.ts`** — 11 access points, no method takes `tx` today.
- `modifierGroups`: `findGroupsByStoreId` (L12), count (L24), `findGroupById` (L33), `findGroupsByProductId` (L44), `insertGroup` (L58), `updateGroup` (L67), `deleteGroup` (L76).
- `modifierOptions`: `findOptionById` (L86), `insertOption` (L92), `updateOption` (L101), `deleteOption` (L110).
- Action: add `tx?: DbOrTx` to all 11 methods + `executor = tx ?? db`.

**`modules/modifier/modifier.service.ts`** — pure delegation, no `withTenant`.
- Action: wrap every entry in `withTenant`, thread `tx`.

**`modules/bundle/bundle.service.ts`** — reads pass no `tx`; writes use bare `db.transaction` (no tenant context).
- Read methods (`list`, `getById`, `findBundlesByProductId`) call `bundleRepo` without `tx` → executor falls back to bare `db` → BARE.
- Write methods (`create`, `update`, `delete`) use bare `db.transaction` and pass that `tx` to `bundleRepo` — but a bare `db.transaction` has no `app.tenant_id` set, so RLS WITH CHECK would reject inserts and USING would hide reads.
- Action: wrap ALL entries in `withTenant(storeId, async (tx) => …)`; use `withTenant`'s tx for all `bundleRepo` calls; remove the inner bare `db.transaction` (withTenant opens its own tx → atomicity preserved for createBundle+createBundleItems).

**`modules/pricing/pricing.service.ts:102`** — `bundleRepo.findById(params.bundleId, storeId)` is inside `withTenant` (L84) but does not pass `tx`. Left bare in the catalog phase because `productBundles` had no RLS then.
- Action: thread `tx` → `bundleRepo.findById(params.bundleId, storeId, tx)`.

### 3.2 Already threaded / wrapped (no change)

- `modules/bundle/bundle.repo.ts` — every method takes `tx?: DbOrTx`, uses `executor = tx ?? db`. ✓ (callers must pass `tx` — addressed by bundle.service wrap above).
- `modules/pricing/pricing.repo.ts` — `findModifierOptionsByIds` (L63) and `findModifierGroupsByIds` (L73) already use `executor = tx ?? db`. ✓ (pricing.service already wrapped in withTenant from catalog phase and passes tx).
- `modules/product/product.repo.ts` — `category`/`subcategory`/`modifierGroups` reads are Drizzle relation `with` clauses on `executor.query.products` (L72/73/78 findById, L331/333 search). ✓ (productService wrapped in withTenant from catalog phase, passes tx → relation loads run on the tenant-scoped executor).
- `modules/seo/seo.route.public.ts` — `categories` sitemap read (L27) already inside `withTenant` (catalog fix wave). ✓

### 3.3 No table access (N/A — strings/paths/delegation only)

- `modules/category/category.route.merchant.ts` — delegates to `categoryService`; no `db`/schema import.
- `modules/modifier/modifier.service.ts` — pure delegation to `modifier.repo`.
- `modules/staff/staff.service.ts` — `'categories:read'` is a permission string (L29), not the table.
- `scopes/merchant.ts` — `'categories:write'` permission string (L19) + `/categories` route prefix (L238).
- `plugins/rateLimit.ts` — `/api/v1/public/categories` URL path string (L34) for rate-limit tiering.

### 3.4 Seed (dbOwner)

**`db/seed.ts`** — `categories` (L288/294/300 inserts, L330–332 ID-resolution reads), `subcategories` (L307/314/321 inserts, L333 read), `modifierGroups` (L503 insert), `modifierOptions` (L515 insert) all use `db`. Neighboring product/variant/customer/order inserts correctly use `dbOwner`.
- Action: switch these to `dbOwner` for consistency and correctness under a real `app_tenant` role. `productBundles`/`productBundleItems` are not seeded.

### 3.5 Public-scope reads

The only public route referencing these tables is `seo.route.public.ts` (sitemap, already wrapped). Public product-detail pages load `category`/`subcategory`/`modifierGroups` via `product.repo` relations (threaded through `productService.findById` → `withTenant`, done in catalog phase). No public route reads these 6 tables directly. (Note: `rateLimit.ts` references a `/api/v1/public/categories` URL path but no corresponding route file exists that reads the `categories` table directly — categories are merchant-managed and surfaced via product relations.)

## 4. Migration

`apps/backend/drizzle/0029_taxonomy_rls.sql` (gitignored → `git add -f`):
- `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` + `DROP POLICY IF EXISTS tenant_iso` + `CREATE POLICY tenant_iso` (§4.1 NULLIF-hardened, both USING + WITH CHECK) on all 6 tables.
- No GRANT changes (rls-roles.ts is generic).
- Journal: append `idx: 30, version: 7, when: <timestamp>, tag: "0029_taxonomy_rls", breakpoints: true` to `apps/backend/drizzle/meta/_journal.json`.

## 5. Testing

- **`apps/backend/src/modules/taxonomy/taxonomy.rls.test.ts`** (new) — real-DB RLS test mirroring `catalog.rls.test.ts` / `customers.rls.test.ts`. Connects as `app_tenant` via `postgres(tenantUrl(), { max: 1 })`, uses `RLS_TENANT_PASSWORD`, `dbOwner` seeding, `rls-tax-a.test`/`rls-tax-b.test` domains, FK-respecting self-cleanup (productBundleItems → productBundles → products → categories → stores; modifierOptions → modifierGroups → products/categories → stores; subcategories → categories → stores). 6 cases: fail-closed, single-tenant, cross-tenant isolation, store-B visibility, WITH CHECK reject (all 6 tables), WITH CHECK accept (all 6 tables).
- **Sentinel-tx withTenant tests** (new): `category.service.withTenant.test.ts`, `modifier.service.withTenant.test.ts`, `bundle.service.withTenant.test.ts`. Pattern: `vi.mock('../../lib/withTenant.js', …)` invokes `fn({ __sentinel: 'tx' })`; tests assert `withTenantMock(storeId)` called AND repo/query received the sentinel tx.
- **Existing service tests** — for each `*.service.test.ts` that uses `toHaveBeenCalledWith` style, append `, expect.objectContaining({ __sentinel: 'tx' })` to repo-call assertions; for files that use `mockResolvedValueOnce` + return-shape (no `toHaveBeenCalledWith` on the repo mock), only add the withTenant sentinel mock at top (as pricing did). Verify each file's mock style before editing — do not loosen existing assertions.
- **Goal**: all test files green, `1036+` assertions pass with RLS ON; `pnpm --filter backend typecheck` 0 errors; no `console.log`; no `any` in source.

## 6. Fix-wave lesson applied upfront

The catalog phase's 4 merge-blockers came from trusting "already safe" for modules that read newly-RLS'd tables. This phase the audit (§3) already enumerated every reader of all 6 tables, so the cross-module reads — `bundle.service` (all entries) and `pricing.service:102` (`bundleRepo.findById`) — are folded into the main task list, not deferred to a fix wave. A final opus whole-branch review still runs to catch anything per-task reviews miss.

## 7. Execution

Subagent-Driven Development (fresh implementer subagent per task + task reviewer per task + final opus whole-branch review), per the established RLS-phase pattern. Commit only on user request; never push without explicit user request.

## 8. Out of scope

- `stores` RLS (still no policy; `dbAdmin` prerequisite done in Phase 2a). Not this phase.
- reviews / shipping / tax / payments / webhooks / support / invoices / returns / cms / apiKeys — later phases per §5.
- The `db.insert(stores)` at `seo.route.public.ts:16` (bare stores read pre-tenant for domain resolution) — unchanged until stores gets RLS.
- `users` RLS — separate phase (planLimits users-count read left bare with in-source follow-up comment from catalog phase).
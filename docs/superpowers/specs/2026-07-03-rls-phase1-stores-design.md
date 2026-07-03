# RLS Phase 1 — stores (tenant root) Design Spec

**Date:** 2026-07-03
**Branch:** fix/domain-feature-p0 (PR #16, not merged)
**Predecessor:** RLS Phase 1 shipping/tax/review (commit be3fca6; 24 tables now have RLS)

## 1. Goal

Enable PostgreSQL Row-Level Security on the `stores` table — the tenant root —
so that a forgotten-`WHERE`/wrong-client bug on `stores` fails closed (zero rows)
instead of leaking every tenant's store record (name, ownerEmail, domain, plan,
customDomain, counters). Production-ready, 0 TS errors, all tests green with
RLS ON.

## 2. Why `stores` is different from every prior phase

`stores` is the tenant root: its `id` IS the tenant id that every other table
references via `store_id`. It has **no `store_id` column**. Therefore:

- The standard §4.1 policy `store_id = NULLIF(app.tenant_id)::uuid` is
  **impossible** here. The policy must be **`id = NULLIF(current_setting('app.tenant_id', true), '')::uuid`** (USING + WITH CHECK).
- Almost every access to `stores` is **pre-tenant or cross-tenant by design**:
  - Public host-header resolution (`scopes/public.ts` → `storeService.findByDomain`) runs on every public request *before* `request.storeId` exists.
  - Merchant registration (`auth.repo` trio) runs before any storeId exists.
  - superAdmin management is cross-tenant by design (all already on `dbAdmin`).
  - The background domain-verification job + admin domain route run with no request tenant context.
  - Auth/session/scope hooks resolve the store from a JWT/domain before request handling.

These paths **cannot use `withTenant`** (no storeId yet, or intentionally
cross-tenant) and **must use `dbAdmin`/`dbOwner` (BYPASSRLS)**.

The only merchant-scoped reads (`store.route.merchant` GET/PATCH own store) use
`WHERE id = request.storeId` with storeId from the JWT — already safe without
RLS enforcement.

## 3. Approach chosen: minimal-bypass (Option 2)

Move **every** bare-`db` access on `stores` to `dbAdmin` (runtime BYPASSRLS) or
`dbOwner` (seed/bootstrap BYPASSRLS). No `withTenant` wrapping is added in this
phase. The RLS policy acts as a **fail-closed backstop**: any future code that
uses bare `db` on `stores` (forgetting `dbAdmin`) gets zero rows instead of all
rows.

### Why not Option 1 (withTenant on merchant reads)

- The marginal security gain is ~zero: merchant reads already use `WHERE id =
  storeId` with storeId from the JWT (trusted).
- Adding a `tx?` param to `storeService.findById/update` cascades into ~10
  existing test assertions (`store.service.test.ts`, `store.route.merchant.test.ts`)
  and risks nested-`withTenant` transactions (e.g. `currency.service` callers).
- `stores` is fundamentally a bypass-heavy table; pretending otherwise adds
  complexity without a real threat mitigated.

The fail-closed backstop is the real value of RLS-on-stores; Option 2 captures
it with the least risk and no test churn.

### 3a. Tracked prerequisite — already satisfied

The earlier memory note (`rls_phase2a_domain_repo_followup`) flagged that
`domain.repo`'s cross-tenant reads (`findPendingVerifications`,
`checkDomainExists`, `findStoresWithCustomDomains`) must move to `dbAdmin`
before `stores` gets RLS. The audit confirms **all three are already on
`dbAdmin`** today. Prerequisite satisfied; proceed directly.

## 4. Access inventory + remediation

| File | Access | Today | After |
|---|---|---|---|
| store.repo.ts `findByDomain` (22) | host-header resolution (pre-tenant) | `tx ?? db` | `tx ?? dbAdmin` |
| store.repo.ts `findById` (11) | auth/scope/public/admin/merchant | `tx ?? db` | `tx ?? dbAdmin` |
| store.repo.ts `findByOwnerId` (29) | registration | `tx ?? db` | `tx ?? dbAdmin` |
| store.repo.ts `create` (36) | registration | `tx ?? db` | `tx ?? dbAdmin` |
| store.repo.ts `update` (41) | merchant PATCH / admin PATCH | `tx ?? db` | `tx ?? dbAdmin` |
| auth.repo.ts `findStoreByOwnerEmail` (43) | registration | `tx ?? db` | `tx ?? dbAdmin` |
| auth.repo.ts `findStoreByDomain` (50) | registration | `tx ?? db` | `tx ?? dbAdmin` |
| auth.repo.ts `createStore` (57) | registration | `tx ?? db` | `tx ?? dbAdmin` |
| domain.service.ts 5 reads (52, 89, 130, 244, 293) | merchant + job + admin | `db.query.stores` | `dbAdmin.query.stores` |
| domain.service.ts 2 tx (100, 146) | updateSubdomain / addCustomDomain | `db.transaction` | `dbAdmin.transaction` |
| domain.repo.ts `updateStoreDomain` (103) | stores UPDATE | `tx ?? db` | `tx ?? dbAdmin` |
| domain.repo.ts `updateStoreCustomDomain` (113) | stores UPDATE | `tx ?? db` | `tx ?? dbAdmin` |
| domain.repo.ts `clearStoreCustomDomain` (133) | stores UPDATE | `tx ?? db` | `tx ?? dbAdmin` |
| seed.ts (178, 209, 232, 253, 916) | dev/test seed | `db` | `dbOwner` |
| superAdmin.repo.ts (all) | cross-tenant admin | `dbAdmin` | `dbAdmin` (unchanged) |
| domain.repo.ts 3 cross-tenant reads (24, 30, 146) | admin/job | `dbAdmin` | `dbAdmin` (unchanged) |

**No call-site changes** are required at the dozens of `storeService.findById/
findByDomain` callers (scopes, auth routes, public routes, currency, theme,
index.ts): swapping the repo default to `dbAdmin` makes them all BYPASSRLS
automatically. `storeService` signatures are unchanged → existing route/service
tests are unaffected.

### 4.1 Relation-load safety (verified)

A grep for `with: { store: ... }` finds relation loads only in
`superAdmin.repo.ts` (dbAdmin). No bare-`db` or `withTenant`-wrapped service
loads a `store` relation, so the RLS policy cannot break a nested relation read.

## 5. Migration

`0031_stores_rls.sql` — ENABLE + FORCE ROW LEVEL SECURITY on `stores`, DROP
POLICY IF EXISTS `tenant_iso`, CREATE POLICY `tenant_iso` FOR ALL:

```sql
USING (id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
WITH CHECK (id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
```

NULLIF-hardened (both USING + WITH CHECK) → fail-closed when `app.tenant_id` is
unset/NULL. No GRANT changes (`rls-roles.ts` grants DML on all tables
generically). Journal idx 32.

## 6. Tests

- **`stores.rls.test.ts`** (real-DB, 6 cases): connects as `app_tenant` on a
  `max:1` connection; seeds storeA + storeB via `dbOwner`; self-cleans.
  1. fail-closed: `RESET app.tenant_id` → `findMany()` → 0 rows.
  2. single-tenant: `setTenant(storeAId)` → 1 row, id === storeAId.
  3. cross-tenant isolation: `setTenant(storeAId)` → every returned row id === storeAId.
  4. admin-bypass: `dbAdmin.query.stores.findMany()` → returns storeA AND storeB
     (proves BYPASSRLS paths still work).
  5. WITH CHECK reject: `setTenant(storeAId)`; insert store with `id: storeBId`
     → throws (id ≠ app.tenant_id).
  6. registration/seed insert via `dbOwner` → succeeds (BYPASSRLS).
- **Existing tests:** `store.service.test.ts` + `store.route.merchant.test.ts`
  are unaffected (no signature change). `domain.service` / `auth.repo` tests
  that mock the DB client will be updated if they assert on `db` specifically
  (TDD: run, fix what breaks). No new sentinel-tx tests (no `withTenant` added).

## 7. Risks

- **Public host-lookup breakage:** if `store.repo.findByDomain` is not on
  `dbAdmin` before migration 0031, every public request 404s. Mitigation: TDD
  order — complete all `db`→`dbAdmin` swaps (Tasks 1-4) BEFORE applying
  migration 0031 (Task 5). Full suite must stay green after the swaps and
  before the migration.
- **`db.transaction` in domain.service:** swapping to `dbAdmin.transaction`
  keeps the inner `domainRepo` store-writes on a BYPASSRLS tx. The
  `domain_verifications` writes inside the same tx are also BYPASSRLS (that
  table is not RLS-enabled this phase) — fine.
- **Registration:** `auth.repo.createStore` → `dbAdmin` insert. `dbAdmin`
  (app_admin) has DML grant on `stores` (rls-roles.ts) → succeeds under RLS.

## 8. Out of scope

- `domain_verifications` RLS (its reads are already single-storeId or
  `dbAdmin`; defer to a later small phase).
- `withTenant` wrapping of merchant own-store reads (Option 1) — explicitly
  rejected (§3).
- Push/PR — standing rule: no push without explicit user request.
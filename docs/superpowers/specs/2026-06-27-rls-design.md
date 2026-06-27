# RLS Design — DB-enforced tenant isolation for jamicore

- **Date:** 2026-06-27
- **Branch:** `fix/domain-feature-p0`
- **Audit origin:** `docs/audit/audit_2026_06_26_realworld.md`, deferred item #35 (RLS)
- **Status:** Design approved 2026-06-27; implementation to follow via phased plan

## 1. Goal & threat model

Today, tenant isolation in jamicore is **application-layer only**. Fastify scope
hooks (`scopes/public.ts`, `scopes/merchant.ts`, `scopes/customer.ts`) resolve
`request.storeId` from the host header or JWT, and every `*.repo.ts` method
hand-writes `where eq(table.storeId, storeId)`. A forgotten `where` is a
cross-tenant data leak, and several already exist in the current code:

- `order.repo.ts` — `findAll` (no `storeId`), `findByIdAdmin` (id-only),
  `findOrderItems` (id-only), `findCouponById` (id-only)
- `apiKey.repo.ts` — `touchLastUsed` (id-only); `findByKeyHash` is intentionally
  global (pre-tenant auth lookup)
- All child-table repos (`cart_items`, `return_items`, `ticket_replies`,
  `webhook_deliveries`) — operate by parent id only; the table has no `storeId`
- `superAdmin.repo.ts` — entirely and intentionally cross-tenant

The goal of this work is to move the isolation guarantee into PostgreSQL via
**Row-Level Security (RLS)**, so a missed filter returns **zero rows, not
another tenant's data** — defense-in-depth. The existing application-layer
`where` filters are **retained** (they are cheap, keep repo intent legible, and
protect the not-yet-RLS-enabled tables during rollout).

## 2. Role & connection model — two runtime roles + owner

Three PostgreSQL roles, three small `postgres.js` clients in `db/index.ts`:

| Client     | Role        | Privileges                         | RLS            | Used by                                                       | Env var (new)        |
|------------|-------------|------------------------------------|----------------|---------------------------------------------------------------|----------------------|
| `dbOwner`  | owner       | DDL + DML, `BYPASSRLS`             | bypass (FORCE) | `runMigrations`, `scripts/backup.ts`, backfills               | `DATABASE_URL` (existing) |
| `db`       | `app_tenant`| `USAGE` schema + DML on tenant tbl | **subject** (`FORCE`) | public / merchant / customer scopes, via `withTenant(storeId, fn)` | `DATABASE_URL_TENANT` |
| `dbAdmin`  | `app_admin` | DML on tenant tbl, `BYPASSRLS`     | bypass         | superAdmin scope + `apiKey.findByKeyHash` auth-lookup           | `DATABASE_URL_ADMIN`  |

- **`app_tenant`** — non-owner; granted `USAGE` on the schema and DML on the
  tenant tables; **does not have `BYPASSRLS`**. Subject to RLS and
  `FORCE ROW LEVEL SECURITY` on every tenant table.
- **`app_admin`** — non-owner; granted DML; **has `BYPASSRLS`**. Serves the
  inherently cross-tenant runtime paths: the superAdmin scope and the API-key
  auth lookup that runs *before* the tenant is known.
- **owner** — retains DDL privileges for migrations; given `BYPASSRLS` so
  `FORCE ROW LEVEL SECURITY` does not block migrations/backfills. Used only by
  the migrator, the backup script, and one-off backfills — never for request
  serving.

The migrator switches from the current `db` to `dbOwner` (the owner client) so
that `CREATE ROLE` / `GRANT` / `CREATE POLICY` / `ALTER TABLE … FORCE` succeed.

## 3. Tenant context — `withTenant` + `set_config(..., true)` (transaction-local)

```ts
// apps/backend/src/lib/withTenant.ts
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import type { DbOrTx } from '../modules/_shared/db-types.js';

export async function withTenant<T>(
  storeId: string,
  fn: (tx: DbOrTx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    // true => local to this transaction (resets at COMMIT/ROLLBACK)
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${storeId}, true)`);
    return fn(tx);
  });
}
```

(`DbOrTx` is the existing shared type in `apps/backend/src/modules/_shared/db-types.ts`.)

`set_config(name, value, true)` sets a **transaction-local** GUC. This is safe
with a pooled connection because the value resets at transaction end — unlike
`SET SESSION`, which would leak across tenants when a pooled connection is
reused by a different request.

Every request's DB work — reads included — runs inside a `withTenant`
transaction, so a query can never execute without a tenant context set.

**Wrapping pattern (chosen):** wrap at the **service-entry / operation level**,
not as a single per-request transaction. This composes with the existing
per-module `db.transaction` usage (service entry points call `withTenant`,
inner `db.transaction` calls become savepoints) and maps 1:1 onto per-table
RLS enablement in the phased cutover.

> **Alternative considered (not chosen):** a single per-request `request.db`
> transaction opened in a `preHandler` and committed in `onResponse`/`onError`.
> This makes leakage impossible by construction (no unscoped `db` is reachable
> by repos) and is a clean long-term end-state, but it is more all-or-nothing
> and a poorer fit for the per-table, fail-closed cutover. It remains a viable
> follow-up after Phase 3.

## 4. Policy shapes

All `storeId` columns are `uuid` referencing `stores.id`, so the policy cast is
`::uuid`.

### 4.1 Tenant table (43 tables, `storeId uuid notNull`)

```sql
ALTER TABLE <T> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <T> FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON <T>
  FOR ALL TO app_tenant
  USING    (store_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (store_id = current_setting('app.tenant_id', true)::uuid);
```

### 4.2 Child table without `storeId` (4 tables — subquery to parent, no schema change)

`cart_items` → `carts`; `ticket_replies` → `support_tickets`;
`return_items` → `returns`; `webhook_deliveries` → `webhooks`.

```sql
-- example: cart_items
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON cart_items
  FOR ALL TO app_tenant
  USING    (EXISTS (SELECT 1 FROM carts c
                    WHERE c.id = cart_items.cart_id
                      AND c.store_id = current_setting('app.tenant_id', true)::uuid))
  WITH CHECK (EXISTS (SELECT 1 FROM carts c
                    WHERE c.id = cart_items.cart_id
                      AND c.store_id = current_setting('app.tenant_id', true)::uuid));
```

The parent FK is indexed (PK), so the `EXISTS` is a cheap index lookup.
`WITH CHECK` on `INSERT` references the parent row, which exists in the same
transaction.

### 4.3 Special tables

| Table | Treatment | Rationale |
|---|---|---|
| `stores` (tenant entity) | id-based policy: `USING (id = current_setting('app.tenant_id', true)::uuid)` + FORCE | A tenant reads/updates only its own store row. |
| `exchange_rates` (nullable `storeId`: global rates + per-store overrides) | `USING (store_id = current_setting(...) OR store_id IS NULL)` + FORCE | Allow global rates plus the tenant's own overrides. |
| `verification_tokens` (nullable `storeId`, pre-auth) | RLS-exempt + **no grant to `app_tenant`**; accessed via `dbAdmin` | Signup/verify/MFA flows have no authenticated tenant yet; lookups go through the bypass client. |
| `merchant_plans` (catalog) | `SELECT` grant to `app_tenant`, no RLS | Plan catalog is not tenant-sensitive; referenced from `stores.plan_id`. |
| `super_admins`, `platform_settings`, `admin_notifications` | **No grant to `app_tenant`** | `app_tenant` cannot reach them at all; super-admin paths use `dbAdmin`. |

## 5. Phased build (per-table enablement, fail-closed)

**Sequencing rule:** for each module, (1) migrate the repo to `withTenant`
first, (2) ship a migration that enables + forces RLS and adds the policy for
that table, (3) add a non-owner negative test. Tables not yet migrated keep
current app-layer filtering — unchanged and safe.

**Fail-closed guarantee:** after RLS is enabled on a table, any code path that
misses `withTenant` gets zero rows, which surfaces immediately in tests rather
than leaking silently.

### Phase 0 — Foundation + pilot (`products` + `stores`)
- Create roles `app_tenant`, `app_admin`; grant `USAGE` + DML; give owner
  `BYPASSRLS`.
- `db/index.ts`: add `dbOwner` (owner) and `dbAdmin` (app_admin) clients;
  switch `db` to the `app_tenant` role; switch the migrator to `dbOwner`.
- `lib/withTenant.ts` helper.
- Migration `0024_rls_foundation.sql`: roles, grants, `stores` (id-based) and
  `products` policies + ENABLE/FORCE.
- `config/env.ts`: validate `DATABASE_URL_TENANT` / `DATABASE_URL_ADMIN`
  (prod-required).
- Non-owner test role/connection + helper; negative cross-tenant test on
  `products` (tenant A cannot see tenant B; no-context query returns zero rows).
- Migrate `product.repo.ts` + the products service entry points to `withTenant`.

### Phase 1 — Per-module rollout
Each module is its own spec → plan → migration → negative test. Order:
products (done in Phase 0) → orders → cart/coupons → customers → catalog
(categories/subcategories/modifiers/bundles) → reviews/wishlists →
shipping/tax/payments → webhooks → support/invoices/returns → cms/apiKeys/
the remaining tenant tables.

### Phase 2 — Edge cases
- 4 child-table subquery policies (`cart_items`, `ticket_replies`,
  `return_items`, `webhook_deliveries`).
- `superAdmin.repo.ts` → `dbAdmin` (entire file is cross-tenant by design).
- `apiKey.findByKeyHash` + `touchLastUsed` → `dbAdmin`.
- `verification_tokens` auth flows → `dbAdmin`.
- Fix the existing unscoped `order.repo.ts` reads (`findAll`, `findByIdAdmin`,
  `findOrderItems`, `findCouponById`) — route to `dbAdmin` where they are
  super-admin paths, or scope them where they are tenant paths.

### Phase 3 — Cutover & hardening
- Final audit that every tenant table has `FORCE` + a policy; no tenant table
  left in a permissive or no-policy state.
- Expand non-owner negative tests across all modules.
- Keep the app-layer `where eq(storeId, …)` filters as defense-in-depth.
- Optional follow-up: migrate to the per-request `request.db` transaction
  model described in §3 if the team wants the construction-level guarantee.

## 6. Testing

- **Existing 854 tests** run as the **owner** (bypass RLS) and keep passing
  unchanged — they test application logic, not isolation.
- **New non-owner tests** connect as `app_tenant` (via
  `DATABASE_URL_TENANT`) and assert, per module:
  1. with `app.tenant_id` set, only the tenant's rows are visible;
  2. **without** `app.tenant_id` set, queries return zero rows (fail-closed);
  3. a tenant-A connection cannot see tenant-B rows (cross-tenant isolation).
- These negative tests are the proof that RLS actually holds; they are added
  alongside each module's migration in Phase 1 and consolidated in Phase 3.

## 7. Migration tooling

- Ship as new `apps/backend/drizzle/NNNN_*.sql` files. Drizzle-kit's migrator
  runs raw SQL verbatim (already proven by `0022_perf_005_indexes.sql`), so
  `CREATE ROLE` / `GRANT` / `CREATE POLICY` / `ALTER TABLE … FORCE` are all
  expressible. Statements separated by `--> statement-breakpoint`.
- Each new migration gets a `meta/_journal.json` entry (and a snapshot where
  drizzle-kit expects one). The migrator runs them as the **owner** client.
- Role/password bootstrap for local dev is a plan-level decision (either the
  `docker-compose.yml` dev postgres creates the roles with passwords via an
  init script, or migration `0024` creates the roles and passwords are set
  out-of-band). Deferred to the implementation plan.

## 8. Environment & infra

- New env vars (Zod-validated in `config/env.ts`): `DATABASE_URL_TENANT`,
  `DATABASE_URL_ADMIN`; required in production, with dev defaults in
  `test-setup.ts` / `.env`.
- `docker-compose.yml` (dev) and `docker-compose.prod.yml` (prod): provide the
  two extra connection strings. `.dockerignore` and Dockerfiles are unaffected
  (no new runtime deps).
- `scripts/backup.ts` and any backfills use `dbOwner`.

## 9. Out of scope / explicit non-goals

- **#35 RLS is the only audit item this work closes.** It does not change the
  4-scope auth model, pricing, or any business logic.
- The per-request `request.db` transaction model (§3 alternative) is a possible
  future refactor, not part of this work.
- Removing the app-layer `where storeId` filters is explicitly **not** done —
  they stay as defense-in-depth.
- String translation / i18n, frontend changes, and any non-isolation backend
  work are unrelated.

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Forgetting `withTenant` on a path after RLS is enabled → zero rows in prod | Fail-closed by design; per-module negative tests; Phase 3 final audit. |
| `SET SESSION` used instead of `set_config(…, true)` → cross-tenant leak on pooled reuse | The `withTenant` helper is the only sanctioned primitive; code review + a grep guard for bare `SET`/`set_config(…, false)`. |
| `FORCE` blocks an owner backfill | Owner has `BYPASSRLS`; backfills run on `dbOwner`. |
| A tenant table left without a policy under `FORCE` → default-deny → broken app | Per-table enablement ships policy + ENABLE + FORCE together in one migration; Phase 3 audit. |
| `superAdmin` accidentally routed through `db` (app_tenant) → sees zero rows | `superAdmin.repo.ts` moves wholesale to `dbAdmin` in Phase 2; the superAdmin scope binds `dbAdmin`. |
| Drizzle nested `db.transaction` after `withTenant` savepoint semantics | Verify savepoint behavior in Phase 0 pilot before scaling. |
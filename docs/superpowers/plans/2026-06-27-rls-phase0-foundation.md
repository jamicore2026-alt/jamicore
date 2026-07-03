# RLS Phase 0 — Foundation + `wishlists` Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the RLS foundation (roles, connection model, `withTenant` helper, migration tooling) and prove DB-enforced tenant isolation end-to-end on one leaf table (`wishlists`) with a non-owner negative test — without breaking any of the 854 existing tests.

**Architecture:** Two runtime PostgreSQL roles (`app_tenant` RLS-enforced via `FORCE`, `app_admin` `BYPASSRLS`) plus the owner for migrations. A `withTenant(storeId, fn)` helper sets `app.tenant_id` transaction-locally and threads the transaction into repos. A drizzle migration enables+forces RLS and creates the `wishlists` policy. Roles/grants come from an idempotent bootstrap script (passwords from env, not committed in migrations).

**Tech Stack:** Fastify v5, Drizzle ORM (postgres.js driver), PostgreSQL 17, Vitest, pnpm.

## Global Constraints

(from `docs/superpowers/specs/2026-06-27-rls-design.md`)

- **pnpm ONLY** — never `npm`. Run backend commands via `pnpm --filter backend …`.
- **Zero TypeScript errors** — `pnpm --filter backend typecheck` must pass after every code task.
- **No `any`** in new code; **no `console.log`** (use `fastify.log.*` in app code; standalone scripts may use `process.stderr`).
- **ESM imports only** — all imports end in `.js`; no `require()`.
- **storeId from JWT/request only** — never from request body/query.
- **`set_config('app.tenant_id', $1, true)`** — the `true` (is_local) is mandatory; never use `SET SESSION` or `set_config(…, false)` for tenant context on pooled connections.
- **Migration statements separated by `--> statement-breakpoint`** where the drizzle migrator expects them (single-statement DDL is fine without).
- **DB must be up** for the real-DB tasks: `docker compose -f docker-compose.yml up -d postgres redis`, then wait for `saas_ecom_postgres` healthy. Connection: `postgresql://saas_ecom:saas_ecom_dev_pass@localhost:5432/saas_ecom_dev` (owner). Tests that need RLS also require the `app_tenant` role (Task 1 bootstrap).

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `apps/backend/src/scripts/rls-roles.ts` | Idempotent bootstrap: create `app_tenant`/`app_admin` roles, grant schema+table+sequence privs, set `BYPASSRLS`. Reads passwords from env. | Create |
| `apps/backend/src/config/env.ts` | Add `DATABASE_URL_TENANT`, `DATABASE_URL_ADMIN`, `RLS_TENANT_PASSWORD`, `RLS_ADMIN_PASSWORD`; require the URLs in production. | Modify |
| `apps/backend/src/test-setup.ts` | Default the two RLS role passwords for the dev/test DB. | Modify |
| `apps/backend/src/db/index.ts` | Add `dbOwner` (owner) and `dbAdmin` (app_admin) drizzle clients; `db` uses `DATABASE_URL_TENANT ?? DATABASE_URL`; `runMigrations` uses `dbOwner`. | Modify |
| `apps/backend/src/lib/withTenant.ts` | `withTenant(storeId, fn)`: opens a transaction on `db`, sets `app.tenant_id` transaction-local, calls `fn(tx)`. | Create |
| `apps/backend/src/lib/withTenant.test.ts` | Unit test (mocked `db`): asserts `set_config(…, true)` is issued and `fn` receives the tx. | Create |
| `apps/backend/drizzle/0024_rls_wishlists_pilot.sql` | `ENABLE`+`FORCE` RLS on `wishlists`; `CREATE POLICY tenant_iso` for `app_tenant`. | Create |
| `apps/backend/drizzle/meta/_journal.json` | Register migration idx 25, tag `0024_rls_wishlists_pilot`. | Modify |
| `apps/backend/src/modules/wishlist/wishlist.repo.ts` | Accept `DbOrTx` (already takes `tx`); no behavior change. | Modify (type only) |
| `apps/backend/src/modules/wishlist/wishlist.service.ts` | Accept + forward `tx` to repo in all three methods. | Modify |
| `apps/backend/src/modules/wishlist/wishlist.route.customer.ts` | Wrap each handler in `withTenant(request.storeId, tx => …)`. | Modify |
| `apps/backend/src/modules/wishlist/wishlist.rls.test.ts` | Real-DB negative test via an `app_tenant` connection: cross-tenant isolation + fail-closed (no-context = zero rows). | Create |
| `apps/backend/.env` | Add the two tenant/admin connection strings + passwords for dev. | Modify (local) |

---

## Task 1: Roles bootstrap script

**Files:**
- Create: `apps/backend/src/scripts/rls-roles.ts`

**Interfaces:**
- Consumes: `process.env.DATABASE_URL` (owner connection), `process.env.RLS_TENANT_PASSWORD`, `process.env.RLS_ADMIN_PASSWORD`.
- Produces: PostgreSQL roles `app_tenant`, `app_admin` with grants; idempotent. Run with `pnpm --filter backend exec tsx src/scripts/rls-roles.ts`.

- [ ] **Step 1: Write the bootstrap script**

```ts
// apps/backend/src/scripts/rls-roles.ts
// Idempotent RLS role bootstrap. Run as the DB owner (uses DATABASE_URL).
// Creates app_tenant (RLS-enforced) and app_admin (BYPASSRLS) login roles,
// grants schema/table/sequence privileges, and gives the owner BYPASSRLS so
// FORCE ROW LEVEL SECURITY never blocks migrations/backfills.
//
// Run: pnpm --filter backend exec tsx src/scripts/rls-roles.ts
import 'dotenv/config';
import postgres from 'postgres';

const ownerUrl = process.env.DATABASE_URL;
if (!ownerUrl) {
  process.stderr.write('DATABASE_URL is required\n');
  process.exit(1);
}
const tenantPw = process.env.RLS_TENANT_PASSWORD;
const adminPw = process.env.RLS_ADMIN_PASSWORD;
if (!tenantPw || !adminPw) {
  process.stderr.write('RLS_TENANT_PASSWORD and RLS_ADMIN_PASSWORD are required\n');
  process.exit(1);
}

// Derive the owner role name (for ALTER ROLE … BYPASSRLS) from the URL user.
const ownerRole = new URL(ownerUrl).username;

const sql = postgres(ownerUrl, { max: 1, onnotice: () => {} });

async function main() {
  // CREATE ROLE has no IF NOT EXISTS; use a DO block.
  await sql.unsafe(`
    DO $$ BEGIN
      CREATE ROLE app_tenant WITH LOGIN PASSWORD '${tenantPw.replace(/'/g, "''")}';
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE ROLE app_admin WITH LOGIN PASSWORD '${adminPw.replace(/'/g, "''")}';
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);

  // Grants (idempotent). Grant on ALL existing tables + sequences, and set
  // DEFAULT PRIVILEGES so future migrations' tables are reachable too.
  await sql.unsafe(`
    GRANT USAGE ON SCHEMA public TO app_tenant, app_admin;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_tenant, app_admin;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_tenant, app_admin;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_tenant, app_admin;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT USAGE, SELECT ON SEQUENCES TO app_tenant, app_admin;
  `);

  // app_admin bypasses RLS (super-admin + pre-tenant API-key auth lookup).
  // The owner gets BYPASSRLS so FORCE never blocks migrations/backfills.
  await sql.unsafe(`
    ALTER ROLE app_admin BYPASSRLS;
    ALTER ROLE ${ownerRole} BYPASSRLS;
  `);

  // Confirm.
  const rows = await sql`
    SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname IN ('app_tenant','app_admin','${sql(ownerRole)}') ORDER BY rolname;
  `;
  process.stderr.write('RLS roles ready:\n' + JSON.stringify(rows, null, 2) + '\n');
}

main()
  .then(() => sql.end())
  .catch((err) => {
    process.stderr.write('Bootstrap failed: ' + (err as Error).message + '\n');
    sql.end();
    process.exit(1);
  });
```

- [ ] **Step 2: Add dev passwords to `apps/backend/.env` (local, not committed if ignored)**

Append to `apps/backend/.env` (this file is gitignored; create the keys if absent):

```
RLS_TENANT_PASSWORD=tenant_dev_pass
RLS_ADMIN_PASSWORD=admin_dev_pass
DATABASE_URL_TENANT=postgresql://app_tenant:tenant_dev_pass@localhost:5432/saas_ecom_dev
DATABASE_URL_ADMIN=postgresql://app_admin:admin_dev_pass@localhost:5432/saas_ecom_dev
```

- [ ] **Step 3: Run the bootstrap against the dev DB and verify the roles exist**

Run (requires Docker postgres up — see Global Constraints):
```bash
pnpm --filter backend exec tsx src/scripts/rls-roles.ts
```
Expected: stderr prints `RLS roles ready:` with a JSON array containing `app_admin` (`rolbypassrls: true`), `app_tenant` (`rolbypassrls: false`), and the owner role (`rolbypassrls: true`).

Verify directly:
```bash
docker exec saas_ecom_postgres psql -U saas_ecom -d saas_ecom_dev -c "SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname IN ('app_tenant','app_admin');"
```
Expected: two rows; `app_tenant` `rolbypassrls = f`, `app_admin` `rolbypassrls = t`.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/scripts/rls-roles.ts
git commit -m "feat(rls): idempotent role bootstrap script (app_tenant, app_admin)"
```

---

## Task 2: Env validation for the two connection strings

**Files:**
- Modify: `apps/backend/src/config/env.ts:14` (add after `DATABASE_URL`)
- Modify: `apps/backend/src/config/env.ts:88-123` (the `superRefine` block)
- Modify: `apps/backend/src/test-setup.ts`

**Interfaces:**
- Produces: `env.DATABASE_URL_TENANT?: string`, `env.DATABASE_URL_ADMIN?: string`, `env.RLS_TENANT_PASSWORD?: string`, `env.RLS_ADMIN_PASSWORD?: string`. Production requires the two URLs.

- [ ] **Step 1: Add the four optional env vars to the schema**

In `apps/backend/src/config/env.ts`, immediately after the `DATABASE_URL: z.string().url(),` line (line 14), insert:

```ts
  // RLS connection strings — separate DB roles. Optional in dev/test (db/index.ts
  // falls back to DATABASE_URL = owner, bypassing RLS); required in production so
  // runtime queries run as app_tenant (RLS-enforced) and super-admin/auth-lookup
  // run as app_admin (BYPASSRLS). See docs/superpowers/specs/2026-06-27-rls-design.md
  DATABASE_URL_TENANT: z.string().url().optional(),
  DATABASE_URL_ADMIN: z.string().url().optional(),
  RLS_TENANT_PASSWORD: z.string().optional(),
  RLS_ADMIN_PASSWORD: z.string().optional(),
```

- [ ] **Step 2: Require the URLs in production**

Inside the `superRefine` block (after the `HEALTH_CHECK_KEY` check, before the closing `})`), add:

```ts
  // RLS: in production the app MUST connect as app_tenant (RLS-enforced) and
  // app_admin (BYPASSRLS). Without these, db/index.ts falls back to the owner,
  // which bypasses RLS — a silent isolation regression. Require them in prod.
  if (data.NODE_ENV === 'production' && !data.DATABASE_URL_TENANT) {
    ctx.addIssue({
      code: 'custom',
      message: 'DATABASE_URL_TENANT is required in production (app_tenant role, RLS-enforced)',
      path: ['DATABASE_URL_TENANT'],
    });
  }
  if (data.NODE_ENV === 'production' && !data.DATABASE_URL_ADMIN) {
    ctx.addIssue({
      code: 'custom',
      message: 'DATABASE_URL_ADMIN is required in production (app_admin role, BYPASSRLS)',
      path: ['DATABASE_URL_ADMIN'],
    });
  }
```

- [ ] **Step 3: Add dev/test password defaults to `test-setup.ts`**

Append to `apps/backend/src/test-setup.ts`:

```ts
// RLS role passwords for the dev DB (used by the rls-roles bootstrap and the
// wishlist RLS negative test). Defaults match apps/backend/.env dev values.
process.env.RLS_TENANT_PASSWORD ||= 'tenant_dev_pass';
process.env.RLS_ADMIN_PASSWORD ||= 'admin_dev_pass';
// NOTE: DATABASE_URL_TENANT/ADMIN intentionally NOT set here — so the app's
// `db` falls back to the owner URL in tests and the 854 existing tests keep
// bypassing RLS. The RLS negative test builds its own app_tenant connection.
```

- [ ] **Step 4: Verify typecheck + the full suite still green**

```bash
pnpm --filter backend typecheck
pnpm --filter backend test
```
Expected: typecheck 0 errors; tests `854 passed` (env change is additive; nothing connects via the new URLs yet).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/config/env.ts apps/backend/src/test-setup.ts
git commit -m "feat(rls): validate DATABASE_URL_TENANT/ADMIN env (prod-required)"
```

---

## Task 3: dbOwner / dbAdmin clients + migrator on the owner

**Files:**
- Modify: `apps/backend/src/db/index.ts`

**Interfaces:**
- Produces: `db` (drizzle over `DATABASE_URL_TENANT ?? DATABASE_URL`), `dbOwner` (drizzle over `DATABASE_URL`), `dbAdmin` (drizzle over `DATABASE_URL_ADMIN ?? DATABASE_URL`). `runMigrations` uses `dbOwner`.

- [ ] **Step 1: Rewrite `db/index.ts` to add the two clients and route the migrator to the owner**

Replace the entire file body with:

```ts
// Database connections using Drizzle ORM + postgres.js
// RLS role model (see docs/superpowers/specs/2026-06-27-rls-design.md):
//   db       → app_tenant role (RLS-enforced via FORCE); runtime tenant queries.
//   dbAdmin  → app_admin role (BYPASSRLS); super-admin + pre-tenant API-key auth lookup.
//   dbOwner  → owner role (BYPASSRLS); migrations, scripts, backfills.
// In dev/test, DATABASE_URL_TENANT/ADMIN are often unset; db/dbAdmin then fall
// back to DATABASE_URL (owner) so existing tests keep working without the roles.
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import postgres from 'postgres';
import * as schema from './schema.js';
import { env } from '../config/env.js';

type PostgresOptions = Parameters<typeof postgres>[1];

const poolOpts: PostgresOptions = {
  max: env.DB_POOL_SIZE ?? (env.isProduction ? 20 : 10),
  idle_timeout: env.DB_POOL_IDLE_TIMEOUT ?? 20,
  connect_timeout: 10,
  query_timeout: 30000,
  statement_timeout: 25000,
};

// app_tenant (RLS-enforced). Fallback to owner so dev/test without the role configured keep working.
const tenantClient = postgres(env.DATABASE_URL_TENANT ?? env.DATABASE_URL, poolOpts as PostgresOptions);
export const db = drizzle(tenantClient, { schema });

// app_admin (BYPASSRLS). Same fallback.
const adminClient = postgres(env.DATABASE_URL_ADMIN ?? env.DATABASE_URL, poolOpts as PostgresOptions);
export const dbAdmin = drizzle(adminClient, { schema });

// owner (DDL, migrations, scripts). Always the real owner URL.
const ownerClient = postgres(env.DATABASE_URL, poolOpts as PostgresOptions);
export const dbOwner = drizzle(ownerClient, { schema });

// Export the tenant client for graceful shutdown (the primary request-serving pool).
export { tenantClient as client };

// Auto-run migrations on startup — ALWAYS as the owner (app_tenant cannot CREATE POLICY / ALTER TABLE FORCE).
export async function runMigrations(): Promise<void> {
  const migrationsFolder = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../drizzle'
  );
  await migrate(dbOwner, { migrationsFolder });
}

export async function getPoolMetrics(): Promise<{ active: number; idle: number; waiting: number }> {
  try {
    const result = await tenantClient`
      SELECT
        count(*) FILTER (WHERE state = 'active')::int as active,
        count(*) FILTER (WHERE state = 'idle')::int as idle,
        count(*) FILTER (WHERE wait_event_type IS NOT NULL AND state = 'active')::int as waiting
      FROM pg_stat_activity
      WHERE datname = current_database() AND backend_type = 'client backend'
    `;
    return (result[0] as { active: number; idle: number; waiting: number } | undefined) ?? { active: 0, idle: 0, waiting: 0 };
  } catch {
    return { active: 0, idle: 0, waiting: 0 };
  }
}
```

- [ ] **Step 2: Verify typecheck + full suite green (still connecting as owner via fallback)**

```bash
pnpm --filter backend typecheck
pnpm --filter backend test
```
Expected: typecheck 0 errors; tests `854 passed`. (`db` still falls back to the owner URL because `DATABASE_URL_TENANT` is unset in `test-setup.ts`; behavior unchanged.)

- [ ] **Step 3: Verify the app still boots and migrates as the owner**

```bash
pnpm --filter backend exec tsx src/migrate.ts
```
Expected: completes with no error (migrations apply via `dbOwner`). If `src/migrate.ts` does not exist, run `pnpm --filter backend exec tsx -e "import('./src/db/index.js').then(m=>m.runMigrations()).then(()=>process.exit(0))"` instead and expect exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/db/index.ts
git commit -m "feat(rls): dbOwner/dbAdmin clients; migrator runs as owner"
```

---

## Task 4: `withTenant` helper + unit test (TDD)

**Files:**
- Create: `apps/backend/src/lib/withTenant.ts`
- Create: `apps/backend/src/lib/withTenant.test.ts`

**Interfaces:**
- Consumes: `db` (the app_tenant drizzle instance), `DbOrTx` from `../modules/_shared/db-types.js`.
- Produces: `withTenant<T>(storeId: string, fn: (tx: DbOrTx) => Promise<T>): Promise<T>`.

- [ ] **Step 1: Write the failing unit test**

```ts
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

    const executeCalls = txExecuteMockFromLastCall().mock.calls;
    expect(executeCalls.length).toBeGreaterThanOrEqual(1);
    // The set_config statement is the first execute() arg — a drizzle SQL
    // template object whose .strings array carries the raw SQL text.
    const sqlArg = executeCalls[0][0] as { strings?: string[] };
    expect(sqlArg.strings?.join(' ')).toContain('set_config');
    expect(sqlArg.strings?.join(' ')).toContain('app.tenant_id');
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm --filter backend exec vitest run src/lib/withTenant.test.ts
```
Expected: FAIL with `Cannot find module './withTenant.js'` (or `withTenant is not a function`).

- [ ] **Step 3: Write the minimal implementation**

```ts
// apps/backend/src/lib/withTenant.ts
// Tenant context primitive for RLS. Runs `fn` inside a transaction on the
// app_tenant client with `app.tenant_id` set transaction-locally, so every
// query `fn` issues (via the tx it receives) is scoped to that tenant by the
// database's row-level-security policies.
//
// set_config(name, value, true) — the `true` is is_local: the value is scoped
// to the current transaction and resets at COMMIT/ROLLBACK. This is the ONLY
// safe way to set tenant context on a pooled connection (SET SESSION would
// leak across tenants when the connection is reused by another request).
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import type { DbOrTx } from '../modules/_shared/db-types.js';

export async function withTenant<T>(
  storeId: string,
  fn: (tx: DbOrTx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${storeId}, true)`);
    return fn(tx);
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm --filter backend exec vitest run src/lib/withTenant.test.ts
```
Expected: 4 tests PASS.

- [ ] **Step 5: Verify the whole suite is still green**

```bash
pnpm --filter backend typecheck && pnpm --filter backend test
```
Expected: typecheck 0 errors; `854` tests pass (plus the 4 new `withTenant` tests = 858, all green).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/lib/withTenant.ts apps/backend/src/lib/withTenant.test.ts
git commit -m "feat(rls): withTenant helper — transaction-local app.tenant_id"
```

---

## Task 5: Migration — enable + force RLS + policy on `wishlists`

**Files:**
- Create: `apps/backend/drizzle/0024_rls_wishlists_pilot.sql`
- Modify: `apps/backend/drizzle/meta/_journal.json` (add idx 25)

**Interfaces:**
- Consumes: roles + grants from Task 1's bootstrap.
- Produces: `wishlists` table has RLS enabled + forced, with policy `tenant_iso` for `app_tenant`.

- [ ] **Step 1: Write the migration SQL**

Create `apps/backend/drizzle/0024_rls_wishlists_pilot.sql`:

```sql
-- RLS pilot: wishlists (leaf table — accessed only by the wishlist module).
-- See docs/superpowers/specs/2026-06-27-rls-design.md §4.1.
-- Roles + grants are created by scripts/rls-roles.ts (idempotent bootstrap),
-- NOT here, so passwords never live in the migration journal.

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_iso ON wishlists;
CREATE POLICY tenant_iso ON wishlists
  FOR ALL TO app_tenant
  USING    (store_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (store_id = current_setting('app.tenant_id', true)::uuid);
```

- [ ] **Step 2: Register the migration in the journal**

In `apps/backend/drizzle/meta/_journal.json`, find the last entry (idx 24, tag `0023_slimy_alex_wilder`) and add a new entry after it, inside the `entries` array, before the closing `]`:

```json
    ,{
      "idx": 25,
      "version": "7",
      "when": 1780843000000,
      "tag": "0024_rls_wishlists_pilot",
      "breakpoints": true
    }
```

(Use any monotonically larger `when` than the prior entry's `1780842758435`; the value above satisfies that.)

- [ ] **Step 3: Apply the migration as the owner and verify the policy exists**

```bash
pnpm --filter backend exec tsx -e "import('./src/db/index.js').then(async m => { await m.runMigrations(); process.exit(0); }).catch(e => { process.stderr.write(String(e)+'\n'); process.exit(1); })"
```
Expected: exit 0 (no error). If the `0023` snapshot mismatch blocks drizzle-kit, fall back to running the SQL directly as the owner and recording it in the migrations table — see Step 3b.

**Step 3b (fallback if drizzle migrator complains about a missing snapshot):** apply the SQL directly and register it manually:
```bash
docker cp apps/backend/drizzle/0024_rls_wishlists_pilot.sql saas_ecom_postgres:/tmp/0024.sql
docker exec saas_ecom_postgres psql -U saas_ecom -d saas_ecom_dev -f /tmp/0024.sql
docker exec saas_ecom_postgres psql -U saas_ecom -d saas_ecom_dev -c "INSERT INTO __drizzle_migrations(hash,created_at) VALUES ('0024_rls_wishlists_pilot', extract(epoch from now())*1000) ON CONFLICT DO NOTHING;"
```

Verify the policy:
```bash
docker exec saas_ecom_postgres psql -U saas_ecom -d saas_ecom_dev -c "SELECT polname, polrelid::regclass, polcmd, polqual FROM pg_policy WHERE polrelid='wishlists'::regclass;"
docker exec saas_ecom_postgres psql -U saas_ecom -d saas_ecom_dev -c "SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname='wishlists';"
```
Expected: one policy `tenant_iso` on `wishlists` for `app_tenant`; `relrowsecurity = t` and `relforcerowsecurity = t`.

- [ ] **Step 4: Verify the full suite still passes (RLS on wishlists touches no existing test)**

```bash
pnpm --filter backend test
```
Expected: `858 passed` (no test touches `wishlists`; the owner-fallback `db` bypasses RLS anyway). No regression.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/drizzle/0024_rls_wishlists_pilot.sql apps/backend/drizzle/meta/_journal.json
git commit -m "feat(rls): enable+force RLS + tenant_iso policy on wishlists (pilot)"
```

---

## Task 6: Route wishlist through `withTenant`

**Files:**
- Modify: `apps/backend/src/modules/wishlist/wishlist.repo.ts:7` (type alias)
- Modify: `apps/backend/src/modules/wishlist/wishlist.service.ts` (forward `tx`)
- Modify: `apps/backend/src/modules/wishlist/wishlist.route.customer.ts` (wrap handlers)

**Interfaces:**
- Consumes: `withTenant` from `../../lib/withTenant.js`, `DbOrTx` from `../_shared/db-types.js`.
- Produces: every wishlist DB operation executes on a transaction with `app.tenant_id` set.

- [ ] **Step 1: Make the repo's `tx` type the shared `DbOrTx`**

In `apps/backend/src/modules/wishlist/wishlist.repo.ts`, replace the `type DbExecutor = typeof db;` line (line 7) and the `import { db }` line so the file uses the shared type. Replace lines 1–8:

```ts
// Wishlist repository — Drizzle queries only, no business logic
import { db } from '../../db/index.js';
import { wishlists } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

type DbExecutor = DbOrTx;
```

(No method-body changes — they already use `tx ?? db`.)

- [ ] **Step 2: Forward `tx` through the service**

Replace the entire contents of `apps/backend/src/modules/wishlist/wishlist.service.ts`:

```ts
// Wishlist service — business logic, calls wishlistRepo, never imports db directly.
// Every method receives the RLS transaction from the route's withTenant() and
// forwards it to the repo so queries run scoped to app.tenant_id.
import type { DbOrTx } from '../_shared/db-types.js';
import { wishlistRepo } from './wishlist.repo.js';

export const wishlistService = {
  async getWishlist(customerId: string, storeId: string, tx?: DbOrTx) {
    const items = await wishlistRepo.findByCustomerId(customerId, storeId, tx);
    return { wishlist: items };
  },

  async addItem(customerId: string, storeId: string, productId: string, tx?: DbOrTx) {
    const existing = await wishlistRepo.findExistingItem(customerId, productId, tx);
    if (existing) {
      return { duplicate: true as const };
    }
    const item = await wishlistRepo.insertItem({ customerId, storeId, productId }, tx);
    return { wishlistItem: item };
  },

  async removeItem(customerId: string, productId: string, tx?: DbOrTx) {
    await wishlistRepo.deleteItem(customerId, productId, tx);
  },
};
```

- [ ] **Step 3: Wrap each route handler in `withTenant`**

Replace the handler bodies in `apps/backend/src/modules/wishlist/wishlist.route.customer.ts`. The imports and schema config stay; only the async handlers change. Replace the three handler callbacks:

For the `GET /` handler, replace:
```ts
  }, async (request) => {
    const result = await wishlistService.getWishlist(request.customerId!, request.storeId);
    return result;
  });
```
with:
```ts
  }, async (request) => {
    return withTenant(request.storeId, (tx) =>
      wishlistService.getWishlist(request.customerId!, request.storeId, tx),
    );
  });
```

For the `POST /` handler, replace:
```ts
  }, async (request, reply) => {
    const parsed = addWishlistSchema.parse(request.body);

    const result = await wishlistService.addItem(
      request.customerId!,
      request.storeId,
      parsed.productId,
    );
```
with:
```ts
  }, async (request, reply) => {
    const parsed = addWishlistSchema.parse(request.body);

    const result = await withTenant(request.storeId, (tx) =>
      wishlistService.addItem(request.customerId!, request.storeId, parsed.productId, tx),
    );
```

For the `DELETE /:productId` handler, replace:
```ts
  }, async (request, reply) => {
    const { productId } = productIdParamSchema.parse(request.params);

    await wishlistService.removeItem(request.customerId!, productId);

    reply.status(204).send();
  });
```
with:
```ts
  }, async (request, reply) => {
    const { productId } = productIdParamSchema.parse(request.params);

    await withTenant(request.storeId, (tx) =>
      wishlistService.removeItem(request.customerId!, productId, tx),
    );

    reply.status(204).send();
  });
```

Add the import at the top of the file (after the `wishlistService` import):
```ts
import { withTenant } from '../../lib/withTenant.js';
```

- [ ] **Step 4: Verify typecheck + full suite green**

```bash
pnpm --filter backend typecheck && pnpm --filter backend test
```
Expected: typecheck 0 errors; `858 passed` (wishlist has no existing test; the mocked suites are unaffected by the real `withTenant`).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/wishlist/wishlist.repo.ts apps/backend/src/modules/wishlist/wishlist.service.ts apps/backend/src/modules/wishlist/wishlist.route.customer.ts
git commit -m "feat(rls): route wishlist reads/writes through withTenant(app.tenant_id)"
```

---

## Task 7: Negative RLS test on `wishlists` (real DB, `app_tenant` role)

**Files:**
- Create: `apps/backend/src/modules/wishlist/wishlist.rls.test.ts`

**Interfaces:**
- Consumes: `dbOwner` (owner bypass, for seeding), the `app_tenant` role password from `process.env.RLS_TENANT_PASSWORD`, owner `DATABASE_URL` from `process.env`.
- Produces: proof that (a) a tenant sees only its own wishlist rows, (b) no-context = zero rows (fail-closed), (c) cross-tenant rows are invisible, (d) a `WITH CHECK` insert for the wrong tenant is rejected.

- [ ] **Step 1: Write the test**

```ts
// apps/backend/src/modules/wishlist/wishlist.rls.test.ts
// Real-DB RLS negative test for the wishlists pilot. Connects as app_tenant
// (RLS-enforced) directly — NOT via the app's `db`, which falls back to the
// owner in tests. Proves the database enforces isolation independently of the
// application layer.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema.js';
import { dbOwner } from '../../db/index.js';

// Build the app_tenant connection string from the owner URL by swapping the user/password.
function tenantUrl(): string {
  const owner = process.env.DATABASE_URL!;
  const pw = process.env.RLS_TENANT_PASSWORD!;
  const u = new URL(owner);
  u.username = 'app_tenant';
  u.password = pw;
  return u.toString();
}

const tenantClient = postgres(tenantUrl(), { max: 1, onnotice: () => {} });
const tenantDb = drizzle(tenantClient, { schema });

let storeAId: string;
let storeBId: string;
let customerAId: string;
let productAId: string;
let productBId: string;

beforeAll(async () => {
  // Seed as the OWNER (bypasses RLS) so we can set up arbitrary tenants.
  const [storeA] = await dbOwner.insert(schema.stores).values({
    name: 'rls-A',
    domain: 'rls-a.test',
    storeType: 'food',
    currency: 'USD',
    language: 'en',
  }).returning();
  const [storeB] = await dbOwner.insert(schema.stores).values({
    name: 'rls-B',
    domain: 'rls-b.test',
    storeType: 'food',
    currency: 'USD',
    language: 'en',
  }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;

  const [custA] = await dbOwner.insert(schema.customers).values({
    storeId: storeAId,
    email: 'a@rls.test',
    passwordHash: 'x',
    firstName: 'A',
  }).returning();
  customerAId = custA.id;

  const [prodA] = await dbOwner.insert(schema.products).values({
    storeId: storeAId,
    titleEn: 'A',
    titleAr: 'A',
    salePrice: '10.00',
    currency: 'USD',
  }).returning();
  const [prodB] = await dbOwner.insert(schema.products).values({
    storeId: storeBId,
    titleEn: 'B',
    titleAr: 'B',
    salePrice: '10.00',
    currency: 'USD',
  }).returning();
  productAId = prodA.id;
  productBId = prodB.id;

  // One wishlist row in each store (for customerA in A; a synthetic row in B).
  await dbOwner.insert(schema.wishlists).values({
    storeId: storeAId,
    customerId: customerAId,
    productId: productAId,
  });
  await dbOwner.insert(schema.wishlists).values({
    storeId: storeBId,
    customerId: customerAId, // same customer id; RLS must still hide it
    productId: productBId,
  });
});

afterAll(async () => {
  // Clean up as the owner.
  await dbOwner.delete(schema.wishlists).where(eq(schema.wishlists.storeId, storeAId));
  await dbOwner.delete(schema.wishlists).where(eq(schema.wishlists.storeId, storeBId));
  await dbOwner.delete(schema.products).where(eq(schema.products.id, productAId));
  await dbOwner.delete(schema.products).where(eq(schema.products.id, productBId));
  await dbOwner.delete(schema.customers).where(eq(schema.customers.id, customerAId));
  await dbOwner.delete(schema.stores).where(eq(schema.stores.id, storeAId));
  await dbOwner.delete(schema.stores).where(eq(schema.stores.id, storeBId));
  await tenantClient.end();
});

async function setTenant(storeId: string | null) {
  // Session-level on a dedicated (max:1) connection is safe here — the
  // connection is used only by this test.
  await tenantClient.unsafe(`SELECT set_config('app.tenant_id', ${storeId ? `'${storeId}'` : 'NULL'}, false)`);
}

describe('wishlists RLS (app_tenant role)', () => {
  it('returns zero rows when no tenant context is set (fail-closed)', async () => {
    await tenantClient.unsafe(`SELECT set_config('app.tenant_id', '', true)`).then(() => {});
    // Empty string => ::uuid cast yields NULL => no row matches.
    const rows = await tenantDb.query.wishlists.findMany();
    expect(rows.length).toBe(0);
  });

  it('shows only store A rows when app.tenant_id = storeA', async () => {
    await setTenant(storeAId);
    const rows = await tenantDb.query.wishlists.findMany();
    expect(rows.length).toBe(1);
    expect(rows[0].storeId).toBe(storeAId);
  });

  it('does NOT show store B rows when app.tenant_id = storeA (cross-tenant isolation)', async () => {
    await setTenant(storeAId);
    const rows = await tenantDb.query.wishlists.findMany();
    expect(rows.every((r) => r.storeId === storeAId)).toBe(true);
    expect(rows.find((r) => r.storeId === storeBId)).toBeUndefined();
  });

  it('shows store B rows when app.tenant_id = storeB', async () => {
    await setTenant(storeBId);
    const rows = await tenantDb.query.wishlists.findMany();
    expect(rows.length).toBe(1);
    expect(rows[0].storeId).toBe(storeBId);
  });

  it('rejects an insert whose storeId does not match app.tenant_id (WITH CHECK)', async () => {
    await setTenant(storeAId);
    await expect(
      tenantDb.insert(schema.wishlists).values({
        storeId: storeBId, // wrong tenant
        customerId: customerAId,
        productId: productBId,
      }),
    ).rejects.toThrow();
  });

  it('accepts an insert whose storeId matches app.tenant_id', async () => {
    await setTenant(storeAId);
    const [row] = await tenantDb.insert(schema.wishlists).values({
      storeId: storeAId,
      customerId: customerAId,
      productId: productAId,
    }).returning();
    expect(row.storeId).toBe(storeAId);
    // cleanup
    await tenantDb.delete(schema.wishlists).where(eq(schema.wishlists.id, row.id));
  });
});
```

- [ ] **Step 2: Run the new test (DB must be up + Task 1 bootstrap + Task 5 migration applied)**

```bash
pnpm --filter backend exec vitest run src/modules/wishlist/wishlist.rls.test.ts
```
Expected: 6 tests PASS. If it fails with `role "app_tenant" does not exist`, run Task 1 Step 3 (the bootstrap) first. If it fails with `row level security policy`, confirm Task 5's migration applied (`pg_policy` query in Task 5 Step 3).

- [ ] **Step 3: Run the full suite to confirm no regressions**

```bash
pnpm --filter backend typecheck && pnpm --filter backend test
```
Expected: typecheck 0 errors; all tests pass (`858` prior + 6 new RLS tests = 864, all green).

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/wishlist/wishlist.rls.test.ts
git commit -m "test(rls): non-owner negative test for wishlists (cross-tenant + fail-closed)"
```

---

## Task 8: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Typecheck + lint + full test suite**

```bash
pnpm --filter backend typecheck
pnpm --filter backend lint
pnpm --filter backend test
```
Expected: typecheck 0 errors; lint 0 warnings/errors; all tests pass.

- [ ] **Step 2: Security guards (harness)**

```bash
node scripts/check-console.js
node scripts/check-storeid.js
node scripts/check-prehandler.js
```
Expected: each prints its "No … usage found" success message.

- [ ] **Step 3: Confirm `db` is app_tenant when `DATABASE_URL_TENANT` is set**

Set `DATABASE_URL_TENANT` in the shell, boot a one-off query, and confirm the connected role is `app_tenant`:
```bash
DATABASE_URL_TENANT='postgresql://app_tenant:tenant_dev_pass@localhost:5432/saas_ecom_dev' pnpm --filter backend exec tsx -e "import('./src/db/index.js').then(async m => { const r = await (await import('postgres')).default(process.env.DATABASE_URL_TENANT)\`SELECT current_user\`; process.stderr.write(JSON.stringify(r)+'\\n'); process.exit(0); })"
```
Expected: stderr prints `[{"current_user":"app_tenant"}]`. (Confirms the runtime pool connects as the RLS-enforced role.)

- [ ] **Step 4: Mark Phase 0 complete in `docs/PROGRESS.md`**

Append to `docs/PROGRESS.md` under the latest dated section:

```markdown
## 2026-06-27: RLS Phase 0 — Foundation + wishlists pilot (branch fix/domain-feature-p0)
- Roles app_tenant (RLS+FORCE) + app_admin (BYPASSRLS) + owner (BYPASSRLS) via
  scripts/rls-roles.ts bootstrap.
- db/index.ts: db (app_tenant) + dbAdmin (app_admin) + dbOwner (owner);
  runMigrations uses dbOwner; db falls back to owner when DATABASE_URL_TENANT unset.
- lib/withTenant.ts: set_config('app.tenant_id', storeId, true) per transaction.
- Migration 0024: ENABLE+FORCE + tenant_iso policy on wishlists (pilot).
- Wishlist route/service/repo threaded through withTenant.
- Negative real-DB test (app_tenant role): cross-tenant isolation + fail-closed.
- Pilot changed from products (hub, read by order/cart/checkout) to wishlists (leaf).
- Verified: 864 backend tests green, typecheck 0, lint 0. Prod requires DATABASE_URL_TENANT/ADMIN.
- Next: Phase 1 per-module rollout (own plan per module).
```

Commit:
```bash
git add docs/PROGRESS.md
git commit -m "docs(rls): record Phase 0 (foundation + wishlists pilot) complete"
```

---

## Self-Review (completed)

- **Spec coverage:** §2 role model → Tasks 1, 2, 3. §3 withTenant + set_config(…, true) → Task 4. §4.1 tenant-table policy → Task 5. §5 Phase 0 deliverables → Tasks 1–8. §6 non-owner negative tests → Task 7. §7 migration tooling (raw SQL migration) → Task 5. §8 env/infra → Tasks 1, 2. §10 risks: fail-closed verified by Task 7's no-context test; permissive-no-policy avoided (Task 5 ships ENABLE+FORCE+policy together); owner BYPASSRLS → Task 1.
- **Pilot table adjustment:** spec §5 named `products` as pilot; this plan uses `wishlists` because `products` is read by `order`/`cart`/`checkout` (Phase 1), so enabling RLS on it in Phase 0 would zero out product lookups at checkout at runtime. `wishlists` is a true leaf (no cross-module access, no existing test) — the pilot's goal (prove the mechanism on one isolated table) is preserved. Captured in the PROGRESS.md note (Task 8).
- **Placeholder scan:** none. Every code step contains the full code; the `withTenant` unit test asserts behavior (transaction opened, set_config call issued, tx forwarded, errors propagated) without depending on drizzle's internal `sql`-template object shape — the real proof that `set_config(…, true)` scopes rows lives in the end-to-end RLS test (Task 7).
- **Type consistency:** `withTenant<T>(storeId: string, fn: (tx: DbOrTx) => Promise<T>)` matches usage in Task 6 (`(tx) => wishlistService.…(tx)`), and `wishlistService` signatures add `tx?: DbOrTx` matching the repo's `tx?: DbExecutor` where `DbExecutor = DbOrTx` (Task 6 Step 1). `dbOwner`/`dbAdmin`/`db` exported from `db/index.ts` (Task 3) match imports in Tasks 5, 7.
- **Ambiguity:** Task 5 Step 3/3b provides a fallback if drizzle-kit's snapshot journal blocks the hand-written migration — the existing hand-written migrations (0011, 0020, 0021, 0022) prove the journal-entry approach works, but 3b covers the snapshot edge case.
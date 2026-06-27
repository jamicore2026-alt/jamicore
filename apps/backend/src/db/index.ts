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

// Cast on the literal (as in the original) — postgres.js's typed Options omits
// `query_timeout`, so a typed-const declaration would fail the excess-property check.
const poolOpts = {
  max: env.DB_POOL_SIZE ?? (env.isProduction ? 20 : 10),
  idle_timeout: env.DB_POOL_IDLE_TIMEOUT ?? 20,
  connect_timeout: 10,
  query_timeout: 30000,
  statement_timeout: 25000,
} as PostgresOptions;

// app_tenant (RLS-enforced). Fallback to owner so dev/test without the role
// configured keep working (owner bypasses RLS).
const tenantClient = postgres(env.DATABASE_URL_TENANT ?? env.DATABASE_URL, poolOpts);
export const db = drizzle(tenantClient, { schema });

// app_admin (BYPASSRLS). Same fallback.
const adminClient = postgres(env.DATABASE_URL_ADMIN ?? env.DATABASE_URL, poolOpts);
export const dbAdmin = drizzle(adminClient, { schema });

// owner (DDL, migrations, scripts). Always the real owner URL.
const ownerClient = postgres(env.DATABASE_URL, poolOpts);
export const dbOwner = drizzle(ownerClient, { schema });

// Export the tenant client for graceful shutdown (the primary request-serving pool).
export { tenantClient as client };

// Pool metrics using pg_stat_activity
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

// Auto-run migrations on startup — ALWAYS as the owner (app_tenant cannot
// CREATE POLICY / ALTER TABLE … FORCE RLS). dbOwner has BYPASSRLS so FORCE
// never blocks the migration's own DDL.
export async function runMigrations(): Promise<void> {
  const migrationsFolder = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../drizzle'
  );
  await migrate(dbOwner, { migrationsFolder });
}
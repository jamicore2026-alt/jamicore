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
  const t = tenantPw.replace(/'/g, "''");
  const a = adminPw.replace(/'/g, "''");
  await sql.unsafe(`
    DO $$ BEGIN
      CREATE ROLE app_tenant WITH LOGIN PASSWORD '${t}';
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE ROLE app_admin WITH LOGIN PASSWORD '${a}';
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
    SELECT rolname, rolbypassrls FROM pg_roles
    WHERE rolname IN ('app_tenant','app_admin','${sql(ownerRole)}')
    ORDER BY rolname;
  `;
  process.stderr.write('RLS roles ready:\n' + JSON.stringify(rows, null, 2) + '\n');
}

main()
  .then(() => sql.end())
  .catch((err) => {
    process.stderr.write('Bootstrap failed: ' + (err as Error).message + '\n');
    void sql.end();
    process.exit(1);
  });
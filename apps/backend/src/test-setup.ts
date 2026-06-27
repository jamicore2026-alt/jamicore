import 'dotenv/config';

// Ensure required env vars exist for tests that load modules importing config/env.ts
process.env.DATABASE_URL ||= 'postgresql://saas_ecom:saas_ecom_dev_pass@localhost:5432/saas_ecom_dev';
process.env.REDIS_URL ||= 'redis://localhost:6379';
process.env.JWT_SECRET ||= 'test-secret-that-is-at-least-32-characters-long';
process.env.PAYMENT_CONFIG_ENCRYPTION_KEY ||= '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';

// RLS role passwords for the dev DB (used by the rls-roles bootstrap and the
// wishlist RLS negative test). Defaults match apps/backend/.env dev values.
process.env.RLS_TENANT_PASSWORD ||= 'tenant_dev_pass';
process.env.RLS_ADMIN_PASSWORD ||= 'admin_dev_pass';
// NOTE: `import 'dotenv/config'` above loads apps/backend/.env, which sets
// DATABASE_URL_TENANT. Because the `||=` defaults below do NOT unset it, the
// app's `db` connects as app_tenant (RLS-enforced) in the test env — NOT as
// the owner-fallback. Therefore real-DB integration tests that seed RLS-
// enabled tables (orders, order_items, wishlists) MUST seed via `dbOwner`
// (BYPASSRLS), not `db`, or the inserts will zero out / be policy-blocked.
// The RLS negative test builds its own app_tenant connection.

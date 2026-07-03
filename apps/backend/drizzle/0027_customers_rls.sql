-- RLS Phase 1: customers + customer_addresses.
-- Both are §4.1 tenant tables (storeId uuid notNull) → direct policy.
-- customer_addresses has its OWN storeId (not a subquery child of customers).
-- See docs/superpowers/specs/2026-06-28-rls-phase1-customers-design.md §3.
-- Roles + grants are created by src/scripts/rls-roles.ts (idempotent bootstrap,
-- grants DML on ALL tables in public to app_tenant + app_admin), NOT here, so
-- the migration carries only ENABLE/FORCE/policy statements.

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON customers;
CREATE POLICY tenant_iso ON customers
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON customer_addresses;
CREATE POLICY tenant_iso ON customer_addresses
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
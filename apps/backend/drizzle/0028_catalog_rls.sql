-- RLS Phase 1: catalog — products + product_variants + product_variant_options
-- + product_variant_combinations. All four are §4.1 tenant tables (storeId uuid
-- notNull) → direct policy. See
-- docs/superpowers/specs/2026-07-03-rls-phase1-catalog-design.md §3.
-- Roles + grants are created by src/scripts/rls-roles.ts (idempotent bootstrap,
-- grants DML on ALL TABLES in public to app_tenant + app_admin), NOT here, so
-- the migration carries only ENABLE/FORCE/policy statements.

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON products;
CREATE POLICY tenant_iso ON products
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON product_variants;
CREATE POLICY tenant_iso ON product_variants
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE product_variant_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant_options FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON product_variant_options;
CREATE POLICY tenant_iso ON product_variant_options
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE product_variant_combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant_combinations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON product_variant_combinations;
CREATE POLICY tenant_iso ON product_variant_combinations
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
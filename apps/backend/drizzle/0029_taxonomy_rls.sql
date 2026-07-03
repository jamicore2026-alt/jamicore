-- 0029_taxonomy_rls.sql
-- RLS Phase 1 (taxonomy): enable + force row-level security on the 6 taxonomy
-- tables with a NULLIF-hardened §4.1 direct tenant_iso policy (both USING +
-- WITH CHECK). An unset/NULL app.tenant_id yields zero rows instead of
-- ''::uuid throwing — fail-closed for code paths that forget withTenant.
-- No GRANT changes: rls-roles.ts grants DML on ALL tables in public generically.

-- categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON categories;
CREATE POLICY tenant_iso ON categories
  FOR ALL
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- subcategories
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON subcategories;
CREATE POLICY tenant_iso ON subcategories
  FOR ALL
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- modifier_groups
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON modifier_groups;
CREATE POLICY tenant_iso ON modifier_groups
  FOR ALL
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- modifier_options
ALTER TABLE modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_options FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON modifier_options;
CREATE POLICY tenant_iso ON modifier_options
  FOR ALL
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- product_bundles
ALTER TABLE product_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_bundles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON product_bundles;
CREATE POLICY tenant_iso ON product_bundles
  FOR ALL
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- product_bundle_items
ALTER TABLE product_bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_bundle_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON product_bundle_items;
CREATE POLICY tenant_iso ON product_bundle_items
  FOR ALL
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
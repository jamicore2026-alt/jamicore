-- 0030_shipping_tax_review_rls.sql
-- RLS Phase 1 (shipping/tax/review): enable + force row-level security on the
-- 4 store-config/rating tables with a NULLIF-hardened §4.1 direct tenant_iso
-- policy (both USING + WITH CHECK). An unset/NULL app.tenant_id yields zero
-- rows instead of ''::uuid throwing — fail-closed for code paths that forget
-- withTenant. No GRANT changes: rls-roles.ts grants DML on ALL tables in public
-- generically.

-- shipping_zones
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zones FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON shipping_zones;
CREATE POLICY tenant_iso ON shipping_zones
  FOR ALL
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- shipping_rates
ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_rates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON shipping_rates;
CREATE POLICY tenant_iso ON shipping_rates
  FOR ALL
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- tax_rates
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON tax_rates;
CREATE POLICY tenant_iso ON tax_rates
  FOR ALL
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON reviews;
CREATE POLICY tenant_iso ON reviews
  FOR ALL
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
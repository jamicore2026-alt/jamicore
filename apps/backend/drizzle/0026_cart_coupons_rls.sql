-- RLS Phase 1: carts + cart_items + coupons + coupon_usages.
-- carts/coupons/coupon_usages are §4.1 tenant tables (storeId uuid notNull) →
-- direct policy. cart_items has NO storeId → §4.2 subquery-to-carts policy.
-- coupon_usages has its OWN storeId (not a subquery child of coupons).
-- See docs/superpowers/specs/2026-06-28-rls-phase1-cart-coupons-design.md §3.
-- Roles + grants are created by src/scripts/rls-roles.ts (idempotent bootstrap,
-- grants DML on ALL tables in public to app_tenant + app_admin), NOT here, so
-- the migration carries only ENABLE/FORCE/policy statements.

ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON carts;
CREATE POLICY tenant_iso ON carts
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON cart_items;
CREATE POLICY tenant_iso ON cart_items
  FOR ALL TO app_tenant
  USING    (EXISTS (SELECT 1 FROM carts c
                     WHERE c.id = cart_items.cart_id
                       AND c.store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid))
  WITH CHECK (EXISTS (SELECT 1 FROM carts c
                     WHERE c.id = cart_items.cart_id
                       AND c.store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid));

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON coupons;
CREATE POLICY tenant_iso ON coupons
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON coupon_usages;
CREATE POLICY tenant_iso ON coupon_usages
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
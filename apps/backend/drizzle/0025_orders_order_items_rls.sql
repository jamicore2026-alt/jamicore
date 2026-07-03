-- RLS Phase 1: orders + order_items. Both are §4.1 tenant tables (storeId
-- uuid notNull); order_items has its own storeId so it gets a DIRECT policy,
-- not a subquery-via-orders child. See
-- docs/superpowers/specs/2026-06-27-rls-phase1-orders-design.md §3.
-- Roles + grants are created by scripts/rls-roles.ts (idempotent bootstrap),
-- NOT here, so passwords never live in the migration journal.

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON orders;
CREATE POLICY tenant_iso ON orders
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON order_items;
CREATE POLICY tenant_iso ON order_items
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
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
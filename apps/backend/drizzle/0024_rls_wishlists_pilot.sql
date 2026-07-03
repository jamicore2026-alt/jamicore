-- RLS pilot: wishlists (leaf table — accessed only by the wishlist module).
-- See docs/superpowers/specs/2026-06-27-rls-design.md §4.1.
-- Roles + grants are created by scripts/rls-roles.ts (idempotent bootstrap),
-- NOT here, so passwords never live in the migration journal.

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_iso ON wishlists;
-- NULLIF(..., '') makes fail-closed clean: an unset/NULL/empty app.tenant_id
-- (e.g. a code path that forgot withTenant) yields NULL::uuid = NULL → no row
-- matches → zero rows, instead of ''::uuid throwing a 500. A valid uuid still
-- matches. (Garbage non-uuid strings would still throw, but withTenant only
-- ever sets a valid uuid storeId, so that can't happen in practice.)
CREATE POLICY tenant_iso ON wishlists
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
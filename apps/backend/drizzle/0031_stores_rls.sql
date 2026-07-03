-- 0031_stores_rls.sql
-- RLS Phase 1 (stores): enable + force row-level security on the tenant-root
-- table. stores has no store_id column — its id IS the tenant id — so the
-- tenant_iso policy keys on id, not store_id. NULLIF-hardened (both USING +
-- WITH CHECK): an unset/NULL app.tenant_id yields zero rows instead of
-- ''::uuid throwing — fail-closed for code paths that forget dbAdmin/dbOwner.
-- All real access is via dbAdmin/dbOwner (BYPASSRLS); this policy is the
-- fail-closed backstop. No GRANT changes (rls-roles.ts grants DML generically).

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON stores;
CREATE POLICY tenant_iso ON stores
  FOR ALL
  USING (id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
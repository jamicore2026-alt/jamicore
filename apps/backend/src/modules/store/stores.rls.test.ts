// Real-DB RLS test for stores (tenant root). Connects as app_tenant
// (RLS-enforced) via a dedicated (max: 1) connection so session-level
// set_config is safe. Proves the id-based tenant_iso policy fails closed and
// isolates tenants, while dbAdmin/dbOwner (BYPASSRLS) still work for the
// pre-tenant/cross-tenant/registration paths. Mirrors shipping_tax_review.rls.test.ts.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema.js';
import { dbOwner, dbAdmin } from '../../db/index.js';

function tenantUrl(): string {
  const owner = process.env.DATABASE_URL!;
  const pw = process.env.RLS_TENANT_PASSWORD!;
  const u = new URL(owner);
  u.username = 'app_tenant';
  u.password = pw;
  return u.toString();
}

const tenantClient = postgres(tenantUrl(), { max: 1, onnotice: () => {} });
const tenantDb = drizzle(tenantClient, { schema });

let storeAId: string;
let storeBId: string;
const DOMAIN_A = 'rls-stores-a.test';
const DOMAIN_B = 'rls-stores-b.test';

beforeAll(async () => {
  // Self-cleaning pre-pass (dbOwner, BYPASSRLS) for re-runnability.
  for (const domain of [DOMAIN_A, DOMAIN_B]) {
    await dbOwner.delete(schema.stores).where(eq(schema.stores.domain, domain));
  }
  await dbOwner.delete(schema.stores).where(eq(schema.stores.domain, 'rls-stores-owner.test'));
  await dbOwner.delete(schema.stores).where(eq(schema.stores.domain, 'reject.stores.test'));

  // Seed as the OWNER (bypasses RLS). stores requires notNull name, domain, ownerEmail.
  const [storeA] = await dbOwner.insert(schema.stores).values({
    name: 'rls-stores-A', domain: DOMAIN_A, ownerEmail: 'a@rls-stores-a.test',
    storeType: 'food', currency: 'USD', language: 'en',
  }).returning();
  const [storeB] = await dbOwner.insert(schema.stores).values({
    name: 'rls-stores-B', domain: DOMAIN_B, ownerEmail: 'b@rls-stores-b.test',
    storeType: 'food', currency: 'USD', language: 'en',
  }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;
});

afterAll(async () => {
  await dbOwner.delete(schema.stores).where(eq(schema.stores.id, storeAId));
  await dbOwner.delete(schema.stores).where(eq(schema.stores.id, storeBId));
  await tenantClient.end();
});

async function setTenant(storeId: string | null) {
  if (storeId === null) {
    await tenantClient.unsafe('RESET app.tenant_id');
    return;
  }
  await tenantClient.unsafe(`SELECT set_config('app.tenant_id', '${storeId}', false)`);
}

describe('stores RLS (app_tenant role)', () => {
  it('returns zero rows when no tenant context is set (fail-closed)', async () => {
    await setTenant(null);
    expect((await tenantDb.query.stores.findMany()).length).toBe(0);
  });

  it('shows only store A when app.tenant_id = storeA (single-tenant)', async () => {
    await setTenant(storeAId);
    const rows = await tenantDb.query.stores.findMany();
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe(storeAId);
  });

  it('does NOT show store B when app.tenant_id = storeA (cross-tenant isolation)', async () => {
    await setTenant(storeAId);
    expect((await tenantDb.query.stores.findMany()).every((r) => r.id === storeAId)).toBe(true);
  });

  it('dbAdmin bypasses RLS and sees both stores', async () => {
    const rows = await dbAdmin.query.stores.findMany({
      where: eq(schema.stores.domain, DOMAIN_A),
    });
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe(storeAId);
    const both = await dbAdmin.query.stores.findMany();
    expect(both.map((r) => r.id)).toContain(storeAId);
    expect(both.map((r) => r.id)).toContain(storeBId);
  });

  it('rejects inserts whose id does not match app.tenant_id (WITH CHECK reject)', async () => {
    await setTenant(storeAId);
    // Fresh id + fresh domain/ownerEmail so the ONLY possible failure reason
    // is the RLS WITH CHECK (id != app.tenant_id), not a pre-existing-row
    // unique violation that could fire before the policy is evaluated.
    await expect(
      tenantDb.insert(schema.stores).values({
        id: randomUUID(), name: 'Reject', domain: 'reject.stores.test', ownerEmail: 'r@reject.test',
        storeType: 'food', currency: 'USD', language: 'en',
      }),
    ).rejects.toThrow();
  });

  it('registration/seed insert via dbOwner succeeds (BYPASSRLS)', async () => {
    const [store] = await dbOwner.insert(schema.stores).values({
      name: 'rls-stores-owner', domain: 'rls-stores-owner.test', ownerEmail: 'o@rls-stores-owner.test',
      storeType: 'food', currency: 'USD', language: 'en',
    }).returning();
    expect(store.id).toBeDefined();
    await dbOwner.delete(schema.stores).where(eq(schema.stores.id, store.id));
  });
});
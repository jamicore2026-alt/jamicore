// apps/backend/src/modules/wishlist/wishlist.rls.test.ts
// Real-DB RLS negative test for the wishlists pilot. Connects as app_tenant
// (RLS-enforced) directly — NOT via the app's `db`, which falls back to the
// owner in tests. Proves the database enforces isolation independently of the
// application layer.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema.js';
import { dbOwner } from '../../db/index.js';

// Build the app_tenant connection string from the owner URL by swapping the
// user/password. Uses a dedicated (max: 1) connection so session-level
// set_config is safe here — the connection is used only by this test.
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
let customerAId: string;
let productAId: string;
let productBId: string;
let categoryAId: string;
let categoryBId: string;

beforeAll(async () => {
  // Seed as the OWNER (bypasses RLS) so we can set up arbitrary tenants.
  const [storeA] = await dbOwner.insert(schema.stores).values({
    name: 'rls-A',
    domain: 'rls-a.test',
    ownerEmail: 'a@rls-a.test',
    storeType: 'food',
    currency: 'USD',
    language: 'en',
  }).returning();
  const [storeB] = await dbOwner.insert(schema.stores).values({
    name: 'rls-B',
    domain: 'rls-b.test',
    ownerEmail: 'b@rls-b.test',
    storeType: 'food',
    currency: 'USD',
    language: 'en',
  }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;

  const [catA] = await dbOwner.insert(schema.categories).values({
    storeId: storeAId,
    nameEn: 'cat-A',
  }).returning();
  const [catB] = await dbOwner.insert(schema.categories).values({
    storeId: storeBId,
    nameEn: 'cat-B',
  }).returning();
  categoryAId = catA.id;
  categoryBId = catB.id;

  const [custA] = await dbOwner.insert(schema.customers).values({
    storeId: storeAId,
    email: 'a@rls.test',
    password: 'x',
    firstName: 'A',
    lastName: 'Last',
  }).returning();
  customerAId = custA.id;

  const [prodA] = await dbOwner.insert(schema.products).values({
    storeId: storeAId,
    categoryId: categoryAId,
    titleEn: 'A',
    salePrice: '10.00',
  }).returning();
  const [prodB] = await dbOwner.insert(schema.products).values({
    storeId: storeBId,
    categoryId: categoryBId,
    titleEn: 'B',
    salePrice: '10.00',
  }).returning();
  productAId = prodA.id;
  productBId = prodB.id;

  // One wishlist row in each store. The store-B row points at customerA (who
  // belongs to store A) — RLS must still hide it when app.tenant_id = storeA,
  // because RLS filters on wishlists.store_id, not the customer's store.
  await dbOwner.insert(schema.wishlists).values({
    storeId: storeAId,
    customerId: customerAId,
    productId: productAId,
  });
  await dbOwner.insert(schema.wishlists).values({
    storeId: storeBId,
    customerId: customerAId,
    productId: productBId,
  });
});

afterAll(async () => {
  // Clean up as the owner (RLS-bypass). Order respects FKs.
  await dbOwner.delete(schema.wishlists).where(eq(schema.wishlists.storeId, storeAId));
  await dbOwner.delete(schema.wishlists).where(eq(schema.wishlists.storeId, storeBId));
  await dbOwner.delete(schema.products).where(eq(schema.products.id, productAId));
  await dbOwner.delete(schema.products).where(eq(schema.products.id, productBId));
  await dbOwner.delete(schema.categories).where(eq(schema.categories.id, categoryAId));
  await dbOwner.delete(schema.categories).where(eq(schema.categories.id, categoryBId));
  await dbOwner.delete(schema.customers).where(eq(schema.customers.id, customerAId));
  await dbOwner.delete(schema.stores).where(eq(schema.stores.id, storeAId));
  await dbOwner.delete(schema.stores).where(eq(schema.stores.id, storeBId));
  await tenantClient.end();
});

// Set app.tenant_id session-level on the dedicated connection. The `null` case
// uses RESET (truly unset) — this mimics the real fail-closed scenario: a code
// path that forgets withTenant leaves the GUC unset, so current_setting(...,true)
// returns NULL → store_id = NULL → zero rows. (set_config(..., NULL, false) would
// store '' and '::uuid' would throw, which is a different, noisier failure mode.)
async function setTenant(storeId: string | null) {
  if (storeId === null) {
    await tenantClient.unsafe('RESET app.tenant_id');
    return;
  }
  await tenantClient.unsafe(
    `SELECT set_config('app.tenant_id', '${storeId}', false)`,
  );
}

describe('wishlists RLS (app_tenant role)', () => {
  it('returns zero rows when no tenant context is set (fail-closed)', async () => {
    await setTenant(null);
    const rows = await tenantDb.query.wishlists.findMany();
    expect(rows.length).toBe(0);
  });

  it('shows only store A rows when app.tenant_id = storeA', async () => {
    await setTenant(storeAId);
    const rows = await tenantDb.query.wishlists.findMany();
    expect(rows.length).toBe(1);
    expect(rows[0].storeId).toBe(storeAId);
  });

  it('does NOT show store B rows when app.tenant_id = storeA (cross-tenant isolation)', async () => {
    await setTenant(storeAId);
    const rows = await tenantDb.query.wishlists.findMany();
    expect(rows.every((r) => r.storeId === storeAId)).toBe(true);
    expect(rows.find((r) => r.storeId === storeBId)).toBeUndefined();
  });

  it('shows store B rows when app.tenant_id = storeB', async () => {
    await setTenant(storeBId);
    const rows = await tenantDb.query.wishlists.findMany();
    expect(rows.length).toBe(1);
    expect(rows[0].storeId).toBe(storeBId);
  });

  it('rejects an insert whose storeId does not match app.tenant_id (WITH CHECK)', async () => {
    await setTenant(storeAId);
    await expect(
      tenantDb.insert(schema.wishlists).values({
        storeId: storeBId, // wrong tenant
        customerId: customerAId,
        productId: productBId,
      }),
    ).rejects.toThrow();
  });

  it('accepts an insert whose storeId matches app.tenant_id', async () => {
    await setTenant(storeAId);
    const [row] = await tenantDb.insert(schema.wishlists).values({
      storeId: storeAId,
      customerId: customerAId,
      productId: productAId,
    }).returning();
    expect(row.storeId).toBe(storeAId);
    // cleanup
    await tenantDb.delete(schema.wishlists).where(eq(schema.wishlists.id, row.id));
  });
});
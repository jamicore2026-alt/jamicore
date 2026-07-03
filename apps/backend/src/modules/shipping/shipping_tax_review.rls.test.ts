// apps/backend/src/modules/shipping/shipping_tax_review.rls.test.ts
// Real-DB RLS negative test for shipping_zones, shipping_rates, tax_rates,
// reviews (RLS Phase 1). Connects as app_tenant (RLS-enforced) via a dedicated
// (max: 1) connection so session-level set_config is safe. Proves the database
// enforces tenant isolation independently of the application layer (the
// withTenant refactor in Tasks 1-3 sets app.tenant_id; this test verifies RLS
// actually uses it). Mirrors taxonomy.rls.test.ts.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema.js';
import { dbOwner } from '../../db/index.js';

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
let catAId: string;
let productAId: string;
let customerAId: string;
let zoneAId: string;
let rateAId: string;
let taxAId: string;
let reviewAId: string;

// Distinct domains so this test's residue is identifiable and cleanable.
const DOMAIN_A = 'rls-str-a.test';
const DOMAIN_B = 'rls-str-b.test';

beforeAll(async () => {
  // ─── Self-cleaning pre-pass (FK-respecting) for re-runnability. Owned by
  //   dbOwner (BYPASSRLS). ───
  for (const domain of [DOMAIN_A, DOMAIN_B]) {
    const stores = await dbOwner
      .select({ id: schema.stores.id })
      .from(schema.stores)
      .where(eq(schema.stores.domain, domain));
    for (const s of stores) {
      await dbOwner.delete(schema.reviews).where(eq(schema.reviews.storeId, s.id));
      await dbOwner.delete(schema.shippingRates).where(eq(schema.shippingRates.storeId, s.id));
      await dbOwner.delete(schema.shippingZones).where(eq(schema.shippingZones.storeId, s.id));
      await dbOwner.delete(schema.taxRates).where(eq(schema.taxRates.storeId, s.id));
      await dbOwner.delete(schema.customers).where(eq(schema.customers.storeId, s.id));
      await dbOwner.delete(schema.products).where(eq(schema.products.storeId, s.id));
      await dbOwner.delete(schema.categories).where(eq(schema.categories.storeId, s.id));
    }
    await dbOwner.delete(schema.stores).where(eq(schema.stores.domain, domain));
  }

  // ─── Seed as the OWNER (bypasses RLS) ────────────────────────────────────
  // stores: required notNull name, domain, ownerEmail.
  const [storeA] = await dbOwner.insert(schema.stores).values({
    name: 'rls-str-A', domain: DOMAIN_A, ownerEmail: 'a@rls-str-a.test',
    storeType: 'food', currency: 'USD', language: 'en',
  }).returning();
  const [storeB] = await dbOwner.insert(schema.stores).values({
    name: 'rls-str-B', domain: DOMAIN_B, ownerEmail: 'b@rls-str-b.test',
    storeType: 'food', currency: 'USD', language: 'en',
  }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;

  // categories: required notNull storeId, nameEn (needed for products.categoryId).
  const [catA] = await dbOwner.insert(schema.categories).values({
    storeId: storeAId, nameEn: 'STR Cat A',
  }).returning();
  catAId = catA.id;

  // products: required notNull storeId, categoryId, titleEn, salePrice.
  const [prodA] = await dbOwner.insert(schema.products).values({
    storeId: storeAId, categoryId: catAId, titleEn: 'STR Product A', salePrice: '10.00',
  }).returning();
  productAId = prodA.id;

  // customers: required notNull storeId, email, password, firstName, lastName
  // (mfaEnabled has default false).
  const [custA] = await dbOwner.insert(schema.customers).values({
    storeId: storeAId, email: 'cust-a@rls-str-a.test', password: 'x', firstName: 'A', lastName: 'A',
  }).returning();
  customerAId = custA.id;

  // shipping_zones: required notNull storeId, name (isActive defaults true).
  const [zoneA] = await dbOwner.insert(schema.shippingZones).values({
    storeId: storeAId, name: 'Zone A',
  }).returning();
  zoneAId = zoneA.id;

  // shipping_rates: required notNull storeId, zoneId, name, method, price.
  const [rateA] = await dbOwner.insert(schema.shippingRates).values({
    storeId: storeAId, zoneId: zoneAId, name: 'Rate A', method: 'ground', price: '5.00',
  }).returning();
  rateAId = rateA.id;

  // tax_rates: required notNull storeId, name, rate.
  const [taxA] = await dbOwner.insert(schema.taxRates).values({
    storeId: storeAId, name: 'Tax A', rate: '0.10',
  }).returning();
  taxAId = taxA.id;

  // reviews: required notNull storeId, productId, rating, content (customerId nullable).
  const [reviewA] = await dbOwner.insert(schema.reviews).values({
    storeId: storeAId, productId: productAId, customerId: customerAId,
    rating: 5, content: 'great',
  }).returning();
  reviewAId = reviewA.id;
});

afterAll(async () => {
  // Clean up as the owner (RLS-bypass). Order respects FKs.
  await dbOwner.delete(schema.reviews).where(eq(schema.reviews.id, reviewAId));
  await dbOwner.delete(schema.taxRates).where(eq(schema.taxRates.id, taxAId));
  await dbOwner.delete(schema.shippingRates).where(eq(schema.shippingRates.id, rateAId));
  await dbOwner.delete(schema.shippingZones).where(eq(schema.shippingZones.id, zoneAId));
  await dbOwner.delete(schema.customers).where(eq(schema.customers.id, customerAId));
  await dbOwner.delete(schema.products).where(eq(schema.products.id, productAId));
  await dbOwner.delete(schema.categories).where(eq(schema.categories.id, catAId));
  await dbOwner.delete(schema.stores).where(eq(schema.stores.id, storeAId));
  await dbOwner.delete(schema.stores).where(eq(schema.stores.id, storeBId));
  await tenantClient.end();
});

// Set app.tenant_id session-level on the dedicated connection. null = RESET
// (truly unset) — mimics the real fail-closed scenario.
async function setTenant(storeId: string | null) {
  if (storeId === null) {
    await tenantClient.unsafe('RESET app.tenant_id');
    return;
  }
  await tenantClient.unsafe(`SELECT set_config('app.tenant_id', '${storeId}', false)`);
}

describe('shipping/tax/review RLS (app_tenant role)', () => {
  it('returns zero rows when no tenant context is set (fail-closed)', async () => {
    await setTenant(null);
    expect((await tenantDb.query.shippingZones.findMany()).length).toBe(0);
    expect((await tenantDb.query.shippingRates.findMany()).length).toBe(0);
    expect((await tenantDb.query.taxRates.findMany()).length).toBe(0);
    expect((await tenantDb.query.reviews.findMany()).length).toBe(0);
  });

  it('shows only store A rows when app.tenant_id = storeA (single-tenant)', async () => {
    await setTenant(storeAId);
    const zones = await tenantDb.query.shippingZones.findMany();
    expect(zones.length).toBe(1);
    expect(zones[0].id).toBe(zoneAId);
    const rates = await tenantDb.query.shippingRates.findMany();
    expect(rates.length).toBe(1);
    expect(rates[0].id).toBe(rateAId);
    const taxes = await tenantDb.query.taxRates.findMany();
    expect(taxes.length).toBe(1);
    expect(taxes[0].id).toBe(taxAId);
    const reviews = await tenantDb.query.reviews.findMany();
    expect(reviews.length).toBe(1);
    expect(reviews[0].id).toBe(reviewAId);
  });

  it('does NOT show store B rows when app.tenant_id = storeA (cross-tenant isolation)', async () => {
    await setTenant(storeAId);
    expect((await tenantDb.query.shippingZones.findMany()).every((r) => r.storeId === storeAId)).toBe(true);
    expect((await tenantDb.query.shippingRates.findMany()).every((r) => r.storeId === storeAId)).toBe(true);
    expect((await tenantDb.query.taxRates.findMany()).every((r) => r.storeId === storeAId)).toBe(true);
    expect((await tenantDb.query.reviews.findMany()).every((r) => r.storeId === storeAId)).toBe(true);
  });

  it('shows store B rows when app.tenant_id = storeB', async () => {
    await setTenant(storeBId);
    // store B has no config/rating rows seeded → zero rows each.
    expect((await tenantDb.query.shippingZones.findMany()).length).toBe(0);
    expect((await tenantDb.query.shippingRates.findMany()).length).toBe(0);
    expect((await tenantDb.query.taxRates.findMany()).length).toBe(0);
    expect((await tenantDb.query.reviews.findMany()).length).toBe(0);
  });

  it('rejects inserts whose storeId does not match app.tenant_id (WITH CHECK reject)', async () => {
    await setTenant(storeAId);
    await expect(
      tenantDb.insert(schema.shippingZones).values({ storeId: storeBId, name: 'Reject' }),
    ).rejects.toThrow();
    await expect(
      tenantDb.insert(schema.shippingRates).values({ storeId: storeBId, zoneId: zoneAId, name: 'Reject', method: 'ground', price: '1.00' }),
    ).rejects.toThrow();
    await expect(
      tenantDb.insert(schema.taxRates).values({ storeId: storeBId, name: 'Reject', rate: '0.01' }),
    ).rejects.toThrow();
    await expect(
      tenantDb.insert(schema.reviews).values({ storeId: storeBId, productId: productAId, rating: 1, content: 'reject' }),
    ).rejects.toThrow();
  });

  it('accepts inserts whose storeId matches app.tenant_id (WITH CHECK accept)', async () => {
    await setTenant(storeAId);
    const [zone] = await tenantDb.insert(schema.shippingZones).values({ storeId: storeAId, name: 'OK Zone' }).returning();
    expect(zone.storeId).toBe(storeAId);
    const [rate] = await tenantDb.insert(schema.shippingRates).values({ storeId: storeAId, zoneId: zone.id, name: 'OK Rate', method: 'ground', price: '2.00' }).returning();
    expect(rate.storeId).toBe(storeAId);
    const [tax] = await tenantDb.insert(schema.taxRates).values({ storeId: storeAId, name: 'OK Tax', rate: '0.05' }).returning();
    expect(tax.storeId).toBe(storeAId);
    const [review] = await tenantDb.insert(schema.reviews).values({ storeId: storeAId, productId: productAId, rating: 4, content: 'ok' }).returning();
    expect(review.storeId).toBe(storeAId);

    // cleanup (as the tenant — allowed since storeId matches)
    await tenantDb.delete(schema.reviews).where(eq(schema.reviews.id, review.id));
    await tenantDb.delete(schema.taxRates).where(eq(schema.taxRates.id, tax.id));
    await tenantDb.delete(schema.shippingRates).where(eq(schema.shippingRates.id, rate.id));
    await tenantDb.delete(schema.shippingZones).where(eq(schema.shippingZones.id, zone.id));
  });
});
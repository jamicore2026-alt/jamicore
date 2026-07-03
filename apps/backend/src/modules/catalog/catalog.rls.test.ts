// apps/backend/src/modules/catalog/catalog.rls.test.ts
// Real-DB RLS negative test for the 4 catalog tables (RLS Phase 1).
// Connects as app_tenant (RLS-enforced) via a dedicated (max: 1) connection so
// session-level set_config is safe. Proves the database enforces catalog
// isolation independently of the application layer (the withTenant refactor in
// Tasks 1-5 sets app.tenant_id; this test verifies RLS actually uses it).
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
let productAId: string;
let productBId: string;
let variantAId: string;
let optionAId: string;
let combinationAId: string;

// Distinct domains so this test's residue is identifiable and cleanable.
const DOMAIN_A = 'rls-cat-a.test';
const DOMAIN_B = 'rls-cat-b.test';

beforeAll(async () => {
  // ─── Self-cleaning pre-pass (FK-respecting: options→variants→products→stores,
  //   combinations→products→stores) ─── Delete residue from a prior crashed run
  //   BEFORE inserting, so the test is re-runnable. Owned by dbOwner (BYPASSRLS).
  for (const domain of [DOMAIN_A, DOMAIN_B]) {
    const stores = await dbOwner
      .select({ id: schema.stores.id })
      .from(schema.stores)
      .where(eq(schema.stores.domain, domain));
    for (const s of stores) {
      await dbOwner
        .delete(schema.productVariantCombinations)
        .where(eq(schema.productVariantCombinations.storeId, s.id));
      await dbOwner
        .delete(schema.productVariantOptions)
        .where(eq(schema.productVariantOptions.storeId, s.id));
      await dbOwner
        .delete(schema.productVariants)
        .where(eq(schema.productVariants.storeId, s.id));
      await dbOwner
        .delete(schema.products)
        .where(eq(schema.products.storeId, s.id));
      await dbOwner
        .delete(schema.categories)
        .where(eq(schema.categories.storeId, s.id));
    }
    await dbOwner.delete(schema.stores).where(eq(schema.stores.domain, domain));
  }

  // ─── Seed as the OWNER (bypasses RLS) ────────────────────────────────────
  // Required notNull on stores: name, domain, ownerEmail (storeType, currency,
  // language have defaults — mirror customers.rls.test.ts).
  const [storeA] = await dbOwner.insert(schema.stores).values({
    name: 'rls-cat-A', domain: DOMAIN_A, ownerEmail: 'a@rls-cat-a.test',
    storeType: 'food', currency: 'USD', language: 'en',
  }).returning();
  const [storeB] = await dbOwner.insert(schema.stores).values({
    name: 'rls-cat-B', domain: DOMAIN_B, ownerEmail: 'b@rls-cat-b.test',
    storeType: 'food', currency: 'USD', language: 'en',
  }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;

  // categories: required notNull storeId, nameEn. Need a category per store
  // (products.categoryId notNull, references categories).
  const [catA] = await dbOwner.insert(schema.categories).values({
    storeId: storeAId, nameEn: 'Cat A',
  }).returning();
  const [catB] = await dbOwner.insert(schema.categories).values({
    storeId: storeBId, nameEn: 'Cat B',
  }).returning();

  // products: required notNull storeId, categoryId, titleEn, salePrice.
  const [prodA] = await dbOwner.insert(schema.products).values({
    storeId: storeAId, categoryId: catA.id, titleEn: 'Product A', salePrice: '10.00',
  }).returning();
  const [prodB] = await dbOwner.insert(schema.products).values({
    storeId: storeBId, categoryId: catB.id, titleEn: 'Product B', salePrice: '20.00',
  }).returning();
  productAId = prodA.id;
  productBId = prodB.id;

  // product_variants: required notNull storeId, productId, nameEn.
  const [varA] = await dbOwner.insert(schema.productVariants).values({
    storeId: storeAId, productId: productAId, nameEn: 'Variant A',
  }).returning();
  variantAId = varA.id;

  // product_variant_options: required notNull variantId, storeId, nameEn.
  const [optA] = await dbOwner.insert(schema.productVariantOptions).values({
    variantId: variantAId, storeId: storeAId, nameEn: 'Option A',
  }).returning();
  optionAId = optA.id;

  // product_variant_combinations: required notNull storeId, productId, sku, combinationKey.
  const [comboA] = await dbOwner.insert(schema.productVariantCombinations).values({
    storeId: storeAId, productId: productAId, sku: 'SKU-A', combinationKey: 'key-a',
  }).returning();
  combinationAId = comboA.id;
});

afterAll(async () => {
  // Clean up as the owner (RLS-bypass). Order respects FKs.
  await dbOwner.delete(schema.productVariantCombinations).where(eq(schema.productVariantCombinations.id, combinationAId));
  await dbOwner.delete(schema.productVariantOptions).where(eq(schema.productVariantOptions.id, optionAId));
  await dbOwner.delete(schema.productVariants).where(eq(schema.productVariants.id, variantAId));
  await dbOwner.delete(schema.products).where(eq(schema.products.id, productAId));
  await dbOwner.delete(schema.products).where(eq(schema.products.id, productBId));
  await dbOwner.delete(schema.categories).where(eq(schema.categories.storeId, storeAId));
  await dbOwner.delete(schema.categories).where(eq(schema.categories.storeId, storeBId));
  await dbOwner.delete(schema.stores).where(eq(schema.stores.id, storeAId));
  await dbOwner.delete(schema.stores).where(eq(schema.stores.id, storeBId));
  await tenantClient.end();
});

// Set app.tenant_id session-level on the dedicated connection. The `null` case
// uses RESET (truly unset) — this mimics the real fail-closed scenario: a code
// path that forgets withTenant leaves the GUC unset, so current_setting(...,true)
// returns NULL → store_id = NULL → zero rows.
async function setTenant(storeId: string | null) {
  if (storeId === null) {
    await tenantClient.unsafe('RESET app.tenant_id');
    return;
  }
  await tenantClient.unsafe(
    `SELECT set_config('app.tenant_id', '${storeId}', false)`,
  );
}

describe('catalog RLS (products + variants + options + combinations, app_tenant role)', () => {
  it('returns zero rows when no tenant context is set (fail-closed)', async () => {
    await setTenant(null);
    expect((await tenantDb.query.products.findMany()).length).toBe(0);
    expect((await tenantDb.query.productVariants.findMany()).length).toBe(0);
    expect((await tenantDb.query.productVariantOptions.findMany()).length).toBe(0);
    expect((await tenantDb.query.productVariantCombinations.findMany()).length).toBe(0);
  });

  it('shows only store A rows when app.tenant_id = storeA (single-tenant)', async () => {
    await setTenant(storeAId);
    const products = await tenantDb.query.products.findMany();
    expect(products.length).toBe(1);
    expect(products[0].id).toBe(productAId);
    expect(products[0].storeId).toBe(storeAId);
    const variants = await tenantDb.query.productVariants.findMany();
    expect(variants.length).toBe(1);
    expect(variants[0].id).toBe(variantAId);
    const options = await tenantDb.query.productVariantOptions.findMany();
    expect(options.length).toBe(1);
    expect(options[0].id).toBe(optionAId);
    const combos = await tenantDb.query.productVariantCombinations.findMany();
    expect(combos.length).toBe(1);
    expect(combos[0].id).toBe(combinationAId);
  });

  it('does NOT show store B rows when app.tenant_id = storeA (cross-tenant isolation)', async () => {
    await setTenant(storeAId);
    const products = await tenantDb.query.products.findMany();
    expect(products.find((r) => r.id === productBId)).toBeUndefined();
    expect(products.every((r) => r.storeId === storeAId)).toBe(true);
  });

  it('shows store B rows when app.tenant_id = storeB', async () => {
    await setTenant(storeBId);
    const products = await tenantDb.query.products.findMany();
    expect(products.length).toBe(1);
    expect(products[0].id).toBe(productBId);
    expect(products[0].storeId).toBe(storeBId);
  });

  it('rejects inserts whose storeId does not match app.tenant_id (WITH CHECK)', async () => {
    await setTenant(storeAId);
    // products: wrong storeId → reject
    await expect(
      tenantDb.insert(schema.products).values({
        storeId: storeBId, categoryId: (await dbOwner.select({ id: schema.categories.id }).from(schema.categories).where(eq(schema.categories.storeId, storeAId)).limit(1))[0].id,
        titleEn: 'Reject', salePrice: '1.00',
      }),
    ).rejects.toThrow();
    // product_variants: wrong storeId (productId belongs to store A) → reject
    await expect(
      tenantDb.insert(schema.productVariants).values({
        storeId: storeBId, productId: productAId, nameEn: 'Reject',
      }),
    ).rejects.toThrow();
    // product_variant_options: wrong storeId → reject
    await expect(
      tenantDb.insert(schema.productVariantOptions).values({
        variantId: variantAId, storeId: storeBId, nameEn: 'Reject',
      }),
    ).rejects.toThrow();
    // product_variant_combinations: wrong storeId → reject
    await expect(
      tenantDb.insert(schema.productVariantCombinations).values({
        storeId: storeBId, productId: productAId, sku: 'REJECT', combinationKey: 'reject',
      }),
    ).rejects.toThrow();
  });

  it('accepts inserts whose storeId matches app.tenant_id (WITH CHECK accept)', async () => {
    await setTenant(storeAId);
    const catAId = (await dbOwner.select({ id: schema.categories.id }).from(schema.categories).where(eq(schema.categories.storeId, storeAId)).limit(1))[0].id;
    const [prod] = await tenantDb.insert(schema.products).values({
      storeId: storeAId, categoryId: catAId, titleEn: 'OK', salePrice: '2.00',
    }).returning();
    expect(prod.storeId).toBe(storeAId);
    const [variant] = await tenantDb.insert(schema.productVariants).values({
      storeId: storeAId, productId: prod.id, nameEn: 'OK V',
    }).returning();
    expect(variant.storeId).toBe(storeAId);
    const [option] = await tenantDb.insert(schema.productVariantOptions).values({
      variantId: variant.id, storeId: storeAId, nameEn: 'OK O',
    }).returning();
    expect(option.storeId).toBe(storeAId);
    const [combo] = await tenantDb.insert(schema.productVariantCombinations).values({
      storeId: storeAId, productId: prod.id, sku: 'OK-SKU', combinationKey: 'ok-key',
    }).returning();
    expect(combo.storeId).toBe(storeAId);
    // cleanup (as the tenant — allowed since storeId matches)
    await tenantDb.delete(schema.productVariantCombinations).where(eq(schema.productVariantCombinations.id, combo.id));
    await tenantDb.delete(schema.productVariantOptions).where(eq(schema.productVariantOptions.id, option.id));
    await tenantDb.delete(schema.productVariants).where(eq(schema.productVariants.id, variant.id));
    await tenantDb.delete(schema.products).where(eq(schema.products.id, prod.id));
  });
});
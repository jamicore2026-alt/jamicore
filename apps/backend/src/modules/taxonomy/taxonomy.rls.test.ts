// apps/backend/src/modules/taxonomy/taxonomy.rls.test.ts
// Real-DB RLS negative test for the 6 taxonomy tables (RLS Phase 1).
// Connects as app_tenant (RLS-enforced) via a dedicated (max: 1) connection so
// session-level set_config is safe. Proves the database enforces taxonomy
// isolation independently of the application layer (the withTenant refactor in
// Tasks 1-3 sets app.tenant_id; this test verifies RLS actually uses it).
// Mirrors catalog.rls.test.ts.
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
let catBId: string;
let subAId: string;
let groupAId: string;
let optionAId: string;
let bundleAId: string;
let bundleItemAId: string;
let productAId: string;

// Distinct domains so this test's residue is identifiable and cleanable.
const DOMAIN_A = 'rls-tax-a.test';
const DOMAIN_B = 'rls-tax-b.test';

beforeAll(async () => {
  // ─── Self-cleaning pre-pass (FK-respecting: product_bundle_items →
  //   product_bundles → stores; modifier_options → modifier_groups →
  //   stores; subcategories → categories → stores) ─── Delete residue from a
  //   prior crashed run BEFORE inserting, so the test is re-runnable. Owned by
  //   dbOwner (BYPASSRLS).
  for (const domain of [DOMAIN_A, DOMAIN_B]) {
    const stores = await dbOwner
      .select({ id: schema.stores.id })
      .from(schema.stores)
      .where(eq(schema.stores.domain, domain));
    for (const s of stores) {
      await dbOwner
        .delete(schema.productBundleItems)
        .where(eq(schema.productBundleItems.storeId, s.id));
      await dbOwner
        .delete(schema.productBundles)
        .where(eq(schema.productBundles.storeId, s.id));
      await dbOwner
        .delete(schema.modifierOptions)
        .where(eq(schema.modifierOptions.storeId, s.id));
      await dbOwner
        .delete(schema.modifierGroups)
        .where(eq(schema.modifierGroups.storeId, s.id));
      await dbOwner
        .delete(schema.subcategories)
        .where(eq(schema.subcategories.storeId, s.id));
      await dbOwner
        .delete(schema.categories)
        .where(eq(schema.categories.storeId, s.id));
      // products may have been seeded for bundle items
      await dbOwner
        .delete(schema.products)
        .where(eq(schema.products.storeId, s.id));
    }
    await dbOwner.delete(schema.stores).where(eq(schema.stores.domain, domain));
  }

  // ─── Seed as the OWNER (bypasses RLS) ────────────────────────────────────
  // Required notNull on stores: name, domain, ownerEmail (storeType, currency,
  // language have defaults — mirror catalog.rls.test.ts).
  const [storeA] = await dbOwner.insert(schema.stores).values({
    name: 'rls-tax-A', domain: DOMAIN_A, ownerEmail: 'a@rls-tax-a.test',
    storeType: 'food', currency: 'USD', language: 'en',
  }).returning();
  const [storeB] = await dbOwner.insert(schema.stores).values({
    name: 'rls-tax-B', domain: DOMAIN_B, ownerEmail: 'b@rls-tax-b.test',
    storeType: 'food', currency: 'USD', language: 'en',
  }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;

  // categories: required notNull storeId, nameEn.
  const [catA] = await dbOwner.insert(schema.categories).values({
    storeId: storeAId, nameEn: 'Cat A',
  }).returning();
  const [catB] = await dbOwner.insert(schema.categories).values({
    storeId: storeBId, nameEn: 'Cat B',
  }).returning();
  catAId = catA.id;
  catBId = catB.id;

  // subcategories: required notNull categoryId, storeId, nameEn.
  const [subA] = await dbOwner.insert(schema.subcategories).values({
    categoryId: catAId, storeId: storeAId, nameEn: 'Sub A',
  }).returning();
  subAId = subA.id;

  // A product is needed for product_bundles / modifier_groups (productId) and
  // product_bundle_items (productId). products already has RLS (0028) but we
  // seed via dbOwner here (BYPASSRLS) — this is the test's own fixture, not
  // the app layer. Required notNull: storeId, categoryId, titleEn, salePrice.
  const [prodA] = await dbOwner.insert(schema.products).values({
    storeId: storeAId, categoryId: catAId, titleEn: 'Tax Product A', salePrice: '10.00',
  }).returning();
  productAId = prodA.id;

  // modifier_groups: required notNull storeId, name (applyTo defaults 'product';
  // productId/categoryId nullable; isRequired defaults false).
  const [groupA] = await dbOwner.insert(schema.modifierGroups).values({
    storeId: storeAId, productId: productAId, name: 'Group A',
  }).returning();
  groupAId = groupA.id;

  // modifier_options: required notNull modifierGroupId, storeId, nameEn.
  const [optA] = await dbOwner.insert(schema.modifierOptions).values({
    modifierGroupId: groupAId, storeId: storeAId, nameEn: 'Option A',
  }).returning();
  optionAId = optA.id;

  // product_bundles: required notNull storeId, name, price (isActive defaults true).
  const [bundleA] = await dbOwner.insert(schema.productBundles).values({
    storeId: storeAId, name: 'Bundle A', price: '25.00',
  }).returning();
  bundleAId = bundleA.id;

  // product_bundle_items: required notNull storeId, bundleId, productId (quantity default 1).
  const [bundleItemA] = await dbOwner.insert(schema.productBundleItems).values({
    storeId: storeAId, bundleId: bundleAId, productId: productAId, quantity: 2,
  }).returning();
  bundleItemAId = bundleItemA.id;
});

afterAll(async () => {
  // Clean up as the owner (RLS-bypass). Order respects FKs.
  await dbOwner.delete(schema.productBundleItems).where(eq(schema.productBundleItems.id, bundleItemAId));
  await dbOwner.delete(schema.productBundles).where(eq(schema.productBundles.id, bundleAId));
  await dbOwner.delete(schema.modifierOptions).where(eq(schema.modifierOptions.id, optionAId));
  await dbOwner.delete(schema.modifierGroups).where(eq(schema.modifierGroups.id, groupAId));
  await dbOwner.delete(schema.products).where(eq(schema.products.id, productAId));
  await dbOwner.delete(schema.subcategories).where(eq(schema.subcategories.id, subAId));
  await dbOwner.delete(schema.categories).where(eq(schema.categories.id, catAId));
  await dbOwner.delete(schema.categories).where(eq(schema.categories.id, catBId));
  await dbOwner.delete(schema.stores).where(eq(schema.stores.id, storeAId));
  await dbOwner.delete(schema.stores).where(eq(schema.stores.id, storeBId));
  await tenantClient.end();
});

// Set app.tenant_id session-level on the dedicated connection. The `null` case
// uses RESET (truly unset) — mimics the real fail-closed scenario: a code path
// that forgets withTenant leaves the GUC unset, so current_setting(...,true)
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

describe('taxonomy RLS (categories/subcategories/modifier_groups/modifier_options/product_bundles/product_bundle_items, app_tenant role)', () => {
  it('returns zero rows when no tenant context is set (fail-closed)', async () => {
    await setTenant(null);
    expect((await tenantDb.query.categories.findMany()).length).toBe(0);
    expect((await tenantDb.query.subcategories.findMany()).length).toBe(0);
    expect((await tenantDb.query.modifierGroups.findMany()).length).toBe(0);
    expect((await tenantDb.query.modifierOptions.findMany()).length).toBe(0);
    expect((await tenantDb.query.productBundles.findMany()).length).toBe(0);
    expect((await tenantDb.query.productBundleItems.findMany()).length).toBe(0);
  });

  it('shows only store A rows when app.tenant_id = storeA (single-tenant)', async () => {
    await setTenant(storeAId);
    const cats = await tenantDb.query.categories.findMany();
    expect(cats.length).toBe(1);
    expect(cats[0].id).toBe(catAId);
    expect(cats[0].storeId).toBe(storeAId);
    const subs = await tenantDb.query.subcategories.findMany();
    expect(subs.length).toBe(1);
    expect(subs[0].id).toBe(subAId);
    const groups = await tenantDb.query.modifierGroups.findMany();
    expect(groups.length).toBe(1);
    expect(groups[0].id).toBe(groupAId);
    const opts = await tenantDb.query.modifierOptions.findMany();
    expect(opts.length).toBe(1);
    expect(opts[0].id).toBe(optionAId);
    const bundles = await tenantDb.query.productBundles.findMany();
    expect(bundles.length).toBe(1);
    expect(bundles[0].id).toBe(bundleAId);
    const bundleItems = await tenantDb.query.productBundleItems.findMany();
    expect(bundleItems.length).toBe(1);
    expect(bundleItems[0].id).toBe(bundleItemAId);
  });

  it('does NOT show store B rows when app.tenant_id = storeA (cross-tenant isolation)', async () => {
    await setTenant(storeAId);
    const cats = await tenantDb.query.categories.findMany();
    expect(cats.find((r) => r.id === catBId)).toBeUndefined();
    expect(cats.every((r) => r.storeId === storeAId)).toBe(true);
  });

  it('shows store B rows when app.tenant_id = storeB', async () => {
    await setTenant(storeBId);
    const cats = await tenantDb.query.categories.findMany();
    expect(cats.length).toBe(1);
    expect(cats[0].id).toBe(catBId);
    expect(cats[0].storeId).toBe(storeBId);
  });

  it('rejects inserts whose storeId does not match app.tenant_id (WITH CHECK reject)', async () => {
    await setTenant(storeAId);
    // categories: wrong storeId → reject
    await expect(
      tenantDb.insert(schema.categories).values({
        storeId: storeBId, nameEn: 'Reject',
      }),
    ).rejects.toThrow();
    // subcategories: wrong storeId (categoryId belongs to store A) → reject
    await expect(
      tenantDb.insert(schema.subcategories).values({
        categoryId: catAId, storeId: storeBId, nameEn: 'Reject',
      }),
    ).rejects.toThrow();
    // modifier_groups: wrong storeId → reject
    await expect(
      tenantDb.insert(schema.modifierGroups).values({
        storeId: storeBId, name: 'Reject',
      }),
    ).rejects.toThrow();
    // modifier_options: wrong storeId → reject
    await expect(
      tenantDb.insert(schema.modifierOptions).values({
        modifierGroupId: groupAId, storeId: storeBId, nameEn: 'Reject',
      }),
    ).rejects.toThrow();
    // product_bundles: wrong storeId → reject
    await expect(
      tenantDb.insert(schema.productBundles).values({
        storeId: storeBId, name: 'Reject', price: '1.00',
      }),
    ).rejects.toThrow();
    // product_bundle_items: wrong storeId (bundleId belongs to store A) → reject
    await expect(
      tenantDb.insert(schema.productBundleItems).values({
        storeId: storeBId, bundleId: bundleAId, productId: productAId,
      }),
    ).rejects.toThrow();
  });

  it('accepts inserts whose storeId matches app.tenant_id (WITH CHECK accept)', async () => {
    await setTenant(storeAId);
    const [cat] = await tenantDb.insert(schema.categories).values({
      storeId: storeAId, nameEn: 'OK Cat',
    }).returning();
    expect(cat.storeId).toBe(storeAId);

    const [sub] = await tenantDb.insert(schema.subcategories).values({
      categoryId: cat.id, storeId: storeAId, nameEn: 'OK Sub',
    }).returning();
    expect(sub.storeId).toBe(storeAId);

    const [group] = await tenantDb.insert(schema.modifierGroups).values({
      storeId: storeAId, name: 'OK Group',
    }).returning();
    expect(group.storeId).toBe(storeAId);

    const [opt] = await tenantDb.insert(schema.modifierOptions).values({
      modifierGroupId: group.id, storeId: storeAId, nameEn: 'OK Opt',
    }).returning();
    expect(opt.storeId).toBe(storeAId);

    const [bundle] = await tenantDb.insert(schema.productBundles).values({
      storeId: storeAId, name: 'OK Bundle', price: '2.00',
    }).returning();
    expect(bundle.storeId).toBe(storeAId);

    const [bundleItem] = await tenantDb.insert(schema.productBundleItems).values({
      storeId: storeAId, bundleId: bundle.id, productId: productAId,
    }).returning();
    expect(bundleItem.storeId).toBe(storeAId);

    // cleanup (as the tenant — allowed since storeId matches)
    await tenantDb.delete(schema.productBundleItems).where(eq(schema.productBundleItems.id, bundleItem.id));
    await tenantDb.delete(schema.productBundles).where(eq(schema.productBundles.id, bundle.id));
    await tenantDb.delete(schema.modifierOptions).where(eq(schema.modifierOptions.id, opt.id));
    await tenantDb.delete(schema.modifierGroups).where(eq(schema.modifierGroups.id, group.id));
    await tenantDb.delete(schema.subcategories).where(eq(schema.subcategories.id, sub.id));
    await tenantDb.delete(schema.categories).where(eq(schema.categories.id, cat.id));
  });
});
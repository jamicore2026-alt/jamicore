// apps/backend/src/modules/cart/cart_coupons.rls.test.ts
// Real-DB RLS negative test for carts + cart_items + coupons + coupon_usages
// (RLS Phase 1). Connects as app_tenant (RLS-enforced) directly via a dedicated
// (max: 1) connection so session-level set_config is safe. Proves the database
// enforces isolation independently of the application layer (the withTenant
// refactor in Tasks 1-7 sets app.tenant_id; this test verifies RLS actually
// uses it).
//
// NEW coverage vs. the orders pilot: the cart_items §4.2 subquery policy —
// both USING (read-filter) and WITH CHECK (insert-guard) — since cart_items has
// no storeId and resolves tenancy via its parent carts row.
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
let categoryAId: string;
let categoryBId: string;
let productAId: string;
let productBId: string;
let customerAId: string;
let customerBId: string;
let orderAId: string;
let orderBId: string;
let cartAId: string;
let cartBId: string;
let cartItemAId: string;
let cartItemBId: string;
let couponAId: string;
let couponBId: string;
let couponUsageAId: string;
let couponUsageBId: string;

// Distinct domains so this test's residue is identifiable and cleanable.
const DOMAIN_A = 'rls-cart-a.test';
const DOMAIN_B = 'rls-cart-b.test';

beforeAll(async () => {
  // ─── Self-cleaning pre-pass ───────────────────────────────────────────
  // Delete any residue from a prior crashed run BEFORE inserting, so the test
  // is re-runnable even if a previous beforeAll died mid-seed. Order respects
  // FKs (coupon_usages → coupons/orders/customers/stores; cart_items →
  // carts/products; carts → stores). Owned by dbOwner (BYPASSRLS).
  const staleStores = await dbOwner
    .select({ id: schema.stores.id })
    .from(schema.stores)
    .where(eq(schema.stores.domain, DOMAIN_A));
  const staleStoresB = await dbOwner
    .select({ id: schema.stores.id })
    .from(schema.stores)
    .where(eq(schema.stores.domain, DOMAIN_B));
  const staleIds = [...staleStores, ...staleStoresB].map((s) => s.id);
  if (staleIds.length > 0) {
    for (const sid of staleIds) {
      await dbOwner.delete(schema.couponUsages).where(eq(schema.couponUsages.storeId, sid));
      await dbOwner.delete(schema.coupons).where(eq(schema.coupons.storeId, sid));
      // carts cascade-delete cart_items (onDelete: cascade).
      await dbOwner.delete(schema.carts).where(eq(schema.carts.storeId, sid));
      await dbOwner.delete(schema.orderItems).where(eq(schema.orderItems.storeId, sid));
      await dbOwner.delete(schema.orders).where(eq(schema.orders.storeId, sid));
      await dbOwner.delete(schema.customers).where(eq(schema.customers.storeId, sid));
      await dbOwner.delete(schema.products).where(eq(schema.products.storeId, sid));
      await dbOwner.delete(schema.categories).where(eq(schema.categories.storeId, sid));
    }
    await dbOwner.delete(schema.stores).where(eq(schema.stores.domain, DOMAIN_A));
    await dbOwner.delete(schema.stores).where(eq(schema.stores.domain, DOMAIN_B));
  }

  // ─── Seed as the OWNER (bypasses RLS) ────────────────────────────────
  // FK-respecting order: stores → categories → products → customers → orders
  // → carts → cart_items → coupons → coupon_usages.
  const [storeA] = await dbOwner.insert(schema.stores).values({
    name: 'rls-cart-A',
    domain: DOMAIN_A,
    ownerEmail: 'a@rls-cart-a.test',
    storeType: 'food',
    currency: 'USD',
    language: 'en',
  }).returning();
  const [storeB] = await dbOwner.insert(schema.stores).values({
    name: 'rls-cart-B',
    domain: DOMAIN_B,
    ownerEmail: 'b@rls-cart-b.test',
    storeType: 'food',
    currency: 'USD',
    language: 'en',
  }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;

  // One category per store (products.categoryId notNull FK→categories).
  const [catA] = await dbOwner.insert(schema.categories).values({
    storeId: storeAId,
    nameEn: 'rls-cat-A',
  }).returning();
  const [catB] = await dbOwner.insert(schema.categories).values({
    storeId: storeBId,
    nameEn: 'rls-cat-B',
  }).returning();
  categoryAId = catA.id;
  categoryBId = catB.id;

  // One product per store (required notNull: storeId, categoryId, titleEn,
  // salePrice).
  const [prodA] = await dbOwner.insert(schema.products).values({
    storeId: storeAId,
    categoryId: categoryAId,
    titleEn: 'rls-prod-A',
    salePrice: '10.00',
  }).returning();
  const [prodB] = await dbOwner.insert(schema.products).values({
    storeId: storeBId,
    categoryId: categoryBId,
    titleEn: 'rls-prod-B',
    salePrice: '20.00',
  }).returning();
  productAId = prodA.id;
  productBId = prodB.id;

  // One customer per store (required notNull: storeId, email, password,
  // firstName, lastName, mfaEnabled).
  const [custA] = await dbOwner.insert(schema.customers).values({
    storeId: storeAId,
    email: 'a@rls-cart-a.test',
    password: 'x',
    firstName: 'A',
    lastName: 'Cust',
  }).returning();
  const [custB] = await dbOwner.insert(schema.customers).values({
    storeId: storeBId,
    email: 'b@rls-cart-b.test',
    password: 'x',
    firstName: 'B',
    lastName: 'Cust',
  }).returning();
  customerAId = custA.id;
  customerBId = custB.id;

  // One order per store (required notNull: storeId, orderNumber, email,
  // currency, subtotal, total).
  const [orderA] = await dbOwner.insert(schema.orders).values({
    storeId: storeAId,
    orderNumber: `RLS-CART-A-${Date.now()}`,
    email: 'a@rls-cart-a.test',
    currency: 'USD',
    subtotal: '100.00',
    total: '100.00',
  }).returning();
  const [orderB] = await dbOwner.insert(schema.orders).values({
    storeId: storeBId,
    orderNumber: `RLS-CART-B-${Date.now()}`,
    email: 'b@rls-cart-b.test',
    currency: 'USD',
    subtotal: '50.00',
    total: '50.00',
  }).returning();
  orderAId = orderA.id;
  orderBId = orderB.id;

  // One cart per store (required notNull: storeId, sessionId).
  const [cartA] = await dbOwner.insert(schema.carts).values({
    storeId: storeAId,
    sessionId: `rls-sess-${crypto.randomUUID()}`,
  }).returning();
  const [cartB] = await dbOwner.insert(schema.carts).values({
    storeId: storeBId,
    sessionId: `rls-sess-${crypto.randomUUID()}`,
  }).returning();
  cartAId = cartA.id;
  cartBId = cartB.id;

  // One cart_item per cart (required notNull: cartId, productId, quantity,
  // price, total).
  const [itemA] = await dbOwner.insert(schema.cartItems).values({
    cartId: cartAId,
    productId: productAId,
    quantity: 1,
    price: '10.00',
    total: '10.00',
  }).returning();
  const [itemB] = await dbOwner.insert(schema.cartItems).values({
    cartId: cartBId,
    productId: productBId,
    quantity: 1,
    price: '20.00',
    total: '20.00',
  }).returning();
  cartItemAId = itemA.id;
  cartItemBId = itemB.id;

  // One coupon per store (required notNull: storeId, code, type, value).
  const [couponA] = await dbOwner.insert(schema.coupons).values({
    storeId: storeAId,
    code: `RLS-A-${Date.now()}`,
    type: 'percent',
    value: '10.00',
  }).returning();
  const [couponB] = await dbOwner.insert(schema.coupons).values({
    storeId: storeBId,
    code: `RLS-B-${Date.now()}`,
    type: 'percent',
    value: '5.00',
  }).returning();
  couponAId = couponA.id;
  couponBId = couponB.id;

  // One coupon_usage per coupon (required notNull: couponId, customerId,
  // orderId, storeId).
  const [usageA] = await dbOwner.insert(schema.couponUsages).values({
    couponId: couponAId,
    customerId: customerAId,
    orderId: orderAId,
    storeId: storeAId,
  }).returning();
  const [usageB] = await dbOwner.insert(schema.couponUsages).values({
    couponId: couponBId,
    customerId: customerBId,
    orderId: orderBId,
    storeId: storeBId,
  }).returning();
  couponUsageAId = usageA.id;
  couponUsageBId = usageB.id;
});

afterAll(async () => {
  // Clean up as the owner (RLS-bypass). Order respects FKs:
  // coupon_usages → cart_items → carts → coupons → orders → customers →
  // products → categories → stores.
  await dbOwner.delete(schema.couponUsages).where(eq(schema.couponUsages.id, couponUsageAId));
  await dbOwner.delete(schema.couponUsages).where(eq(schema.couponUsages.id, couponUsageBId));
  await dbOwner.delete(schema.cartItems).where(eq(schema.cartItems.id, cartItemAId));
  await dbOwner.delete(schema.cartItems).where(eq(schema.cartItems.id, cartItemBId));
  await dbOwner.delete(schema.carts).where(eq(schema.carts.id, cartAId));
  await dbOwner.delete(schema.carts).where(eq(schema.carts.id, cartBId));
  await dbOwner.delete(schema.coupons).where(eq(schema.coupons.id, couponAId));
  await dbOwner.delete(schema.coupons).where(eq(schema.coupons.id, couponBId));
  await dbOwner.delete(schema.orders).where(eq(schema.orders.id, orderAId));
  await dbOwner.delete(schema.orders).where(eq(schema.orders.id, orderBId));
  await dbOwner.delete(schema.customers).where(eq(schema.customers.id, customerAId));
  await dbOwner.delete(schema.customers).where(eq(schema.customers.id, customerBId));
  await dbOwner.delete(schema.products).where(eq(schema.products.id, productAId));
  await dbOwner.delete(schema.products).where(eq(schema.products.id, productBId));
  await dbOwner.delete(schema.categories).where(eq(schema.categories.id, categoryAId));
  await dbOwner.delete(schema.categories).where(eq(schema.categories.id, categoryBId));
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

describe('carts + cart_items + coupons + coupon_usages RLS (app_tenant role)', () => {
  it('returns zero rows when no tenant context is set (fail-closed)', async () => {
    await setTenant(null);
    const carts = await tenantDb.query.carts.findMany();
    const cartItems = await tenantDb.query.cartItems.findMany();
    const coupons = await tenantDb.query.coupons.findMany();
    const couponUsages = await tenantDb.query.couponUsages.findMany();
    expect(carts.length).toBe(0);
    expect(cartItems.length).toBe(0);
    expect(coupons.length).toBe(0);
    expect(couponUsages.length).toBe(0);
  });

  it('shows only store A rows when app.tenant_id = storeA (single-tenant)', async () => {
    await setTenant(storeAId);
    const carts = await tenantDb.query.carts.findMany();
    const cartItems = await tenantDb.query.cartItems.findMany();
    const coupons = await tenantDb.query.coupons.findMany();
    const couponUsages = await tenantDb.query.couponUsages.findMany();
    expect(carts.length).toBe(1);
    expect(carts[0].storeId).toBe(storeAId);
    expect(carts[0].id).toBe(cartAId);
    expect(cartItems.length).toBe(1);
    expect(cartItems[0].cartId).toBe(cartAId);
    expect(cartItems[0].id).toBe(cartItemAId);
    expect(coupons.length).toBe(1);
    expect(coupons[0].storeId).toBe(storeAId);
    expect(coupons[0].id).toBe(couponAId);
    expect(couponUsages.length).toBe(1);
    expect(couponUsages[0].storeId).toBe(storeAId);
    expect(couponUsages[0].id).toBe(couponUsageAId);
  });

  it('does NOT show store B rows when app.tenant_id = storeA (cross-tenant isolation)', async () => {
    await setTenant(storeAId);
    const carts = await tenantDb.query.carts.findMany();
    const cartItems = await tenantDb.query.cartItems.findMany();
    const coupons = await tenantDb.query.coupons.findMany();
    const couponUsages = await tenantDb.query.couponUsages.findMany();
    expect(carts.every((r) => r.storeId === storeAId)).toBe(true);
    expect(carts.find((r) => r.storeId === storeBId)).toBeUndefined();
    // cart_items has no storeId; verify none of its rows belong to store B's
    // parent cart.
    expect(cartItems.every((r) => r.cartId !== cartBId)).toBe(true);
    expect(cartItems.find((r) => r.cartId === cartBId)).toBeUndefined();
    expect(coupons.every((r) => r.storeId === storeAId)).toBe(true);
    expect(coupons.find((r) => r.storeId === storeBId)).toBeUndefined();
    expect(couponUsages.every((r) => r.storeId === storeAId)).toBe(true);
    expect(couponUsages.find((r) => r.storeId === storeBId)).toBeUndefined();
  });

  it('shows store B rows when app.tenant_id = storeB', async () => {
    await setTenant(storeBId);
    const carts = await tenantDb.query.carts.findMany();
    const cartItems = await tenantDb.query.cartItems.findMany();
    const coupons = await tenantDb.query.coupons.findMany();
    const couponUsages = await tenantDb.query.couponUsages.findMany();
    expect(carts.length).toBe(1);
    expect(carts[0].storeId).toBe(storeBId);
    expect(carts[0].id).toBe(cartBId);
    expect(cartItems.length).toBe(1);
    expect(cartItems[0].cartId).toBe(cartBId);
    expect(cartItems[0].id).toBe(cartItemBId);
    expect(coupons.length).toBe(1);
    expect(coupons[0].storeId).toBe(storeBId);
    expect(coupons[0].id).toBe(couponBId);
    expect(couponUsages.length).toBe(1);
    expect(couponUsages[0].storeId).toBe(storeBId);
    expect(couponUsages[0].id).toBe(couponUsageBId);
  });

  it('rejects inserts whose storeId (or parent cart) does not match app.tenant_id (WITH CHECK reject)', async () => {
    await setTenant(storeAId);
    // carts: wrong storeId → reject
    await expect(
      tenantDb.insert(schema.carts).values({
        storeId: storeBId,
        sessionId: `rls-rej-cart-${crypto.randomUUID()}`,
      }),
    ).rejects.toThrow();
    // coupons: wrong storeId → reject
    await expect(
      tenantDb.insert(schema.coupons).values({
        storeId: storeBId,
        code: `RLS-REJ-C-${Date.now()}`,
        type: 'percent',
        value: '1.00',
      }),
    ).rejects.toThrow();
    // coupon_usages: wrong storeId → reject
    await expect(
      tenantDb.insert(schema.couponUsages).values({
        couponId: couponBId,
        customerId: customerBId,
        orderId: orderBId,
        storeId: storeBId,
      }),
    ).rejects.toThrow();
    // cart_items: cartId belongs to store B's cart → subquery WITH CHECK
    // rejects (parent cart's storeId ≠ app.tenant_id).
    await expect(
      tenantDb.insert(schema.cartItems).values({
        cartId: cartBId,
        productId: productBId,
        quantity: 1,
        price: '1.00',
        total: '1.00',
      }),
    ).rejects.toThrow();
  });

  it('accepts inserts whose storeId (or parent cart) matches app.tenant_id (WITH CHECK accept)', async () => {
    await setTenant(storeAId);
    // carts: matching storeId → accept
    const [cart] = await tenantDb.insert(schema.carts).values({
      storeId: storeAId,
      sessionId: `rls-ok-cart-${crypto.randomUUID()}`,
    }).returning();
    expect(cart.storeId).toBe(storeAId);
    // cart_items: cartId = the new store-A cart → subquery WITH CHECK accepts.
    const [item] = await tenantDb.insert(schema.cartItems).values({
      cartId: cart.id,
      productId: productAId,
      quantity: 1,
      price: '1.00',
      total: '1.00',
    }).returning();
    expect(item.cartId).toBe(cart.id);
    // coupons: matching storeId → accept
    const [coupon] = await tenantDb.insert(schema.coupons).values({
      storeId: storeAId,
      code: `RLS-OK-C-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: 'percent',
      value: '1.00',
    }).returning();
    expect(coupon.storeId).toBe(storeAId);
    // coupon_usages: matching storeId → accept
    const [usage] = await tenantDb.insert(schema.couponUsages).values({
      couponId: coupon.id,
      customerId: customerAId,
      orderId: orderAId,
      storeId: storeAId,
    }).returning();
    expect(usage.storeId).toBe(storeAId);
    // cleanup (as the tenant — allowed since storeId matches; cleanup order
    // respects FKs: usage → coupon → item → cart).
    await tenantDb.delete(schema.couponUsages).where(eq(schema.couponUsages.id, usage.id));
    await tenantDb.delete(schema.coupons).where(eq(schema.coupons.id, coupon.id));
    await tenantDb.delete(schema.cartItems).where(eq(schema.cartItems.id, item.id));
    await tenantDb.delete(schema.carts).where(eq(schema.carts.id, cart.id));
  });
});
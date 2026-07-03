// apps/backend/src/modules/order/orders.rls.test.ts
// Real-DB RLS negative test for orders + order_items (RLS Phase 1). Connects as
// app_tenant (RLS-enforced) directly via a dedicated (max: 1) connection so
// session-level set_config is safe. Proves the database enforces isolation
// independently of the application layer (the withTenant refactor in Tasks 1-6
// sets app.tenant_id; this test verifies RLS actually uses it).
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
let orderAId: string;
let orderBId: string;
let orderItemAId: string;
let orderItemBId: string;

// Distinct domains so this test's residue is identifiable and cleanable.
const DOMAIN_A = 'rls-ord-a.test';
const DOMAIN_B = 'rls-ord-b.test';

beforeAll(async () => {
  // ─── Self-cleaning pre-pass ───────────────────────────────────────────
  // Delete any residue from a prior crashed run BEFORE inserting, so the test
  // is re-runnable even if a previous beforeAll died mid-seed. Order respects
  // FKs (order_items → orders → stores). Owned by dbOwner (BYPASSRLS).
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
      await dbOwner.delete(schema.orderItems).where(eq(schema.orderItems.storeId, sid));
      await dbOwner.delete(schema.orders).where(eq(schema.orders.storeId, sid));
    }
    await dbOwner.delete(schema.stores).where(eq(schema.stores.domain, DOMAIN_A));
    await dbOwner.delete(schema.stores).where(eq(schema.stores.domain, DOMAIN_B));
  }

  // ─── Seed as the OWNER (bypasses RLS) ────────────────────────────────
  const [storeA] = await dbOwner.insert(schema.stores).values({
    name: 'rls-ord-A',
    domain: DOMAIN_A,
    ownerEmail: 'a@rls-ord-a.test',
    storeType: 'food',
    currency: 'USD',
    language: 'en',
  }).returning();
  const [storeB] = await dbOwner.insert(schema.stores).values({
    name: 'rls-ord-B',
    domain: DOMAIN_B,
    ownerEmail: 'b@rls-ord-b.test',
    storeType: 'food',
    currency: 'USD',
    language: 'en',
  }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;

  // One order per store (required notNull: storeId, orderNumber, email,
  // currency, subtotal, total).
  const [orderA] = await dbOwner.insert(schema.orders).values({
    storeId: storeAId,
    orderNumber: `RLS-A-${Date.now()}`,
    email: 'a@rls-ord-a.test',
    currency: 'USD',
    subtotal: '100.00',
    total: '100.00',
  }).returning();
  const [orderB] = await dbOwner.insert(schema.orders).values({
    storeId: storeBId,
    orderNumber: `RLS-B-${Date.now()}`,
    email: 'b@rls-ord-b.test',
    currency: 'USD',
    subtotal: '50.00',
    total: '50.00',
  }).returning();
  orderAId = orderA.id;
  orderBId = orderB.id;

  // One order_items row per order (required notNull: orderId, storeId,
  // productTitle, quantity, price, total).
  const [itemA] = await dbOwner.insert(schema.orderItems).values({
    orderId: orderAId,
    storeId: storeAId,
    productTitle: 'A-item',
    quantity: 1,
    price: '100.00',
    total: '100.00',
  }).returning();
  const [itemB] = await dbOwner.insert(schema.orderItems).values({
    orderId: orderBId,
    storeId: storeBId,
    productTitle: 'B-item',
    quantity: 1,
    price: '50.00',
    total: '50.00',
  }).returning();
  orderItemAId = itemA.id;
  orderItemBId = itemB.id;
});

afterAll(async () => {
  // Clean up as the owner (RLS-bypass). Order respects FKs.
  await dbOwner.delete(schema.orderItems).where(eq(schema.orderItems.id, orderItemAId));
  await dbOwner.delete(schema.orderItems).where(eq(schema.orderItems.id, orderItemBId));
  await dbOwner.delete(schema.orders).where(eq(schema.orders.id, orderAId));
  await dbOwner.delete(schema.orders).where(eq(schema.orders.id, orderBId));
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

describe('orders + order_items RLS (app_tenant role)', () => {
  it('returns zero rows when no tenant context is set (fail-closed)', async () => {
    await setTenant(null);
    const orders = await tenantDb.query.orders.findMany();
    const items = await tenantDb.query.orderItems.findMany();
    expect(orders.length).toBe(0);
    expect(items.length).toBe(0);
  });

  it('shows only store A rows when app.tenant_id = storeA (single-tenant)', async () => {
    await setTenant(storeAId);
    const orders = await tenantDb.query.orders.findMany();
    const items = await tenantDb.query.orderItems.findMany();
    expect(orders.length).toBe(1);
    expect(orders[0].storeId).toBe(storeAId);
    expect(orders[0].id).toBe(orderAId);
    expect(items.length).toBe(1);
    expect(items[0].storeId).toBe(storeAId);
    expect(items[0].id).toBe(orderItemAId);
  });

  it('does NOT show store B rows when app.tenant_id = storeA (cross-tenant isolation)', async () => {
    await setTenant(storeAId);
    const orders = await tenantDb.query.orders.findMany();
    const items = await tenantDb.query.orderItems.findMany();
    expect(orders.every((r) => r.storeId === storeAId)).toBe(true);
    expect(orders.find((r) => r.storeId === storeBId)).toBeUndefined();
    expect(items.every((r) => r.storeId === storeAId)).toBe(true);
    expect(items.find((r) => r.storeId === storeBId)).toBeUndefined();
  });

  it('shows store B rows when app.tenant_id = storeB', async () => {
    await setTenant(storeBId);
    const orders = await tenantDb.query.orders.findMany();
    const items = await tenantDb.query.orderItems.findMany();
    expect(orders.length).toBe(1);
    expect(orders[0].storeId).toBe(storeBId);
    expect(orders[0].id).toBe(orderBId);
    expect(items.length).toBe(1);
    expect(items[0].storeId).toBe(storeBId);
    expect(items[0].id).toBe(orderItemBId);
  });

  it('rejects inserts whose storeId does not match app.tenant_id (WITH CHECK)', async () => {
    await setTenant(storeAId);
    // orders: wrong storeId → reject
    await expect(
      tenantDb.insert(schema.orders).values({
        storeId: storeBId,
        orderNumber: `RLS-REJ-ORD-${Date.now()}`,
        email: 'reject@rls.test',
        currency: 'USD',
        subtotal: '1.00',
        total: '1.00',
      }),
    ).rejects.toThrow();
    // order_items: wrong storeId (orderId belongs to store A) → reject
    await expect(
      tenantDb.insert(schema.orderItems).values({
        orderId: orderAId,
        storeId: storeBId,
        productTitle: 'reject-item',
        quantity: 1,
        price: '1.00',
        total: '1.00',
      }),
    ).rejects.toThrow();
  });

  it('accepts inserts whose storeId matches app.tenant_id (WITH CHECK accept)', async () => {
    await setTenant(storeAId);
    // orders: matching storeId → accept
    const [ord] = await tenantDb.insert(schema.orders).values({
      storeId: storeAId,
      orderNumber: `RLS-OK-ORD-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      email: 'ok@rls.test',
      currency: 'USD',
      subtotal: '2.00',
      total: '2.00',
    }).returning();
    expect(ord.storeId).toBe(storeAId);
    // order_items: matching storeId + the new order's id → accept
    const [item] = await tenantDb.insert(schema.orderItems).values({
      orderId: ord.id,
      storeId: storeAId,
      productTitle: 'ok-item',
      quantity: 1,
      price: '2.00',
      total: '2.00',
    }).returning();
    expect(item.storeId).toBe(storeAId);
    // cleanup (as the tenant — allowed since storeId matches)
    await tenantDb.delete(schema.orderItems).where(eq(schema.orderItems.id, item.id));
    await tenantDb.delete(schema.orders).where(eq(schema.orders.id, ord.id));
  });
});
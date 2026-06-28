// Integration tests for Return repository — hits the real database.
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { db, dbOwner } from '../../db/index.js';
import { returns, returnItems, stores, orders, orderItems, customers } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { returnRepo } from './return.repo.js';

// ─── Base fixtures (seeded or created in beforeAll) ───
let storeId: string;
let orderId: string;
let customerId: string;
let orderItemId: string;

// Flags so we only delete fixtures we created
let createdStore = false;
let createdCustomer = false;
let createdOrder = false;
let createdOrderItem = false;

// ─── Per-test fixture IDs ───
let testReturnId: string;
let testReturnItemId: string;

beforeAll(async () => {
  // Look for existing seed data first
  let store = await db.query.stores.findFirst();
  // customers/orders/order_items now have RLS (migrations 0025+0027); read
  // seed lookups via dbOwner (BYPASSRLS) so the harness can find pre-existing
  // rows regardless of tenant context.
  let customer = await dbOwner.query.customers.findFirst();
  let order = await dbOwner.query.orders.findFirst();
  let orderItem = await dbOwner.query.orderItems.findFirst();

  if (!store) {
    [store] = await db
      .insert(stores)
      .values({
        name: 'Return Test Store',
        domain: `return-test-${Date.now()}.local`,
        ownerEmail: `return-owner-${Date.now()}@test.local`,
        status: 'active',
      })
      .returning();
    createdStore = true;
  }

  if (!customer) {
    // Seed via dbOwner (BYPASSRLS): app_tenant can't INSERT customers without
    // app.tenant_id set (WITH CHECK), and the test harness isn't a withTenant
    // context. The repo under test still goes through withTenant → RLS-safe.
    [customer] = await dbOwner
      .insert(customers)
      .values({
        storeId: store.id,
        email: `return-customer-${Date.now()}@test.local`,
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      })
      .returning();
    createdCustomer = true;
  }

  if (!order) {
    // Seed via dbOwner (BYPASSRLS): app_tenant can't INSERT orders without
    // app.tenant_id set (WITH CHECK), and the test harness isn't a withTenant
    // context. The service under test still goes through withTenant → RLS-safe.
    [order] = await dbOwner
      .insert(orders)
      .values({
        storeId: store.id,
        customerId: customer.id,
        orderNumber: `RET-ORD-${Date.now()}`,
        email: customer.email,
        currency: 'USD',
        subtotal: '100.00',
        total: '100.00',
      })
      .returning();
    createdOrder = true;
  }

  if (!orderItem) {
    [orderItem] = await dbOwner
      .insert(orderItems)
      .values({
        orderId: order.id,
        storeId: store.id,
        productTitle: 'Return Test Product',
        quantity: 2,
        price: '29.99',
        total: '59.98',
      })
      .returning();
    createdOrderItem = true;
  }

  storeId = store.id;
  customerId = customer.id;
  orderId = order.id;
  orderItemId = orderItem.id;
});

beforeEach(async () => {
  const ret = await returnRepo.create({
    storeId,
    orderId,
    customerId,
    status: 'requested',
    reason: 'Defective item',
    notes: 'Customer wants a replacement',
  });
  testReturnId = ret.id;

  const retItem = await returnRepo.createItem({
    returnId: testReturnId,
    orderItemId,
    quantity: 1,
    reason: 'Broken on arrival',
    condition: 'damaged',
    refundAmount: '29.99',
  });
  testReturnItemId = retItem.id;
});

afterEach(async () => {
  await db.delete(returnItems).where(eq(returnItems.id, testReturnItemId));
  await db.delete(returns).where(eq(returns.id, testReturnId));
});

afterAll(async () => {
  // Cleanup of RLS-enabled tables via dbOwner (BYPASSRLS): a `db` (app_tenant)
  // delete without app.tenant_id would silently no-op (USING filter hides rows).
  if (createdOrderItem) {
    await dbOwner.delete(orderItems).where(eq(orderItems.id, orderItemId));
  }
  if (createdOrder) {
    await dbOwner.delete(orders).where(eq(orders.id, orderId));
  }
  if (createdCustomer) {
    await dbOwner.delete(customers).where(eq(customers.id, customerId));
  }
  if (createdStore) {
    await db.delete(stores).where(eq(stores.id, storeId));
  }
});

// ═══════════════════════════════════════════
// create
// ═══════════════════════════════════════════
describe('create', () => {
  it('inserts a return and returns it', async () => {
    const result = await returnRepo.create({
      storeId,
      orderId,
      customerId,
      status: 'requested',
      reason: 'Defective item',
      notes: 'Customer wants a replacement',
    });

    expect(result).toBeDefined();
    expect(result.storeId).toBe(storeId);
    expect(result.orderId).toBe(orderId);
    expect(result.customerId).toBe(customerId);
    expect(result.status).toBe('requested');
    expect(result.reason).toBe('Defective item');
    expect(result.notes).toBe('Customer wants a replacement');
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);

    // Clean up the extra row created by this test
    await db.delete(returns).where(eq(returns.id, result.id));
  });
});

// ═══════════════════════════════════════════
// createItem
// ═══════════════════════════════════════════
describe('createItem', () => {
  it('inserts a return item and returns it', async () => {
    const result = await returnRepo.createItem({
      returnId: testReturnId,
      orderItemId,
      quantity: 1,
      reason: 'Broken on arrival',
      condition: 'damaged',
      refundAmount: '29.99',
    });

    expect(result).toBeDefined();
    expect(result.returnId).toBe(testReturnId);
    expect(result.orderItemId).toBe(orderItemId);
    expect(result.quantity).toBe(1);
    expect(result.reason).toBe('Broken on arrival');
    expect(result.condition).toBe('damaged');
    expect(result.refundAmount).toBe('29.99');
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeInstanceOf(Date);

    // Clean up the extra row created by this test
    await db.delete(returnItems).where(eq(returnItems.id, result.id));
  });
});

// ═══════════════════════════════════════════
// findById
// ═══════════════════════════════════════════
describe('findById', () => {
  it('returns the correct return', async () => {
    const result = await returnRepo.findById(testReturnId, storeId);
    expect(result).toBeDefined();
    expect(result!.id).toBe(testReturnId);
    expect(result!.storeId).toBe(storeId);
    expect(result!.orderId).toBe(orderId);
    expect(result!.status).toBe('requested');
  });

  it('returns null for nonexistent id', async () => {
    const result = await returnRepo.findById('00000000-0000-0000-0000-000000000000', storeId);
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════
// findByIdWithItems
// ═══════════════════════════════════════════
describe('findByIdWithItems', () => {
  it('returns return with items array', async () => {
    const result = await returnRepo.findByIdWithItems(testReturnId, storeId);
    expect(result).toBeDefined();
    expect(result!.id).toBe(testReturnId);
    expect(Array.isArray(result!.items)).toBe(true);

    const foundItem = result!.items.find((i) => i.id === testReturnItemId);
    expect(foundItem).toBeDefined();
    expect(foundItem!.orderItemId).toBe(orderItemId);
  });

  it('returns null when return not found', async () => {
    const result = await returnRepo.findByIdWithItems('00000000-0000-0000-0000-000000000000', storeId);
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════
// findByStore
// ═══════════════════════════════════════════
describe('findByStore', () => {
  it('returns returns for the given store with total count', async () => {
    const result = await returnRepo.findByStore(storeId, 1, 20);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
    expect(result.data.some((r) => r.id === testReturnId)).toBe(true);
  });

  it('respects pagination', async () => {
    const result = await returnRepo.findByStore(storeId, 1, 1);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeLessThanOrEqual(1);
    expect(result.total).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════
// findByOrder
// ═══════════════════════════════════════════
describe('findByOrder', () => {
  it('returns returns for the given order', async () => {
    const result = await returnRepo.findByOrder(orderId);
    expect(Array.isArray(result)).toBe(true);
    expect(result.some((r) => r.id === testReturnId)).toBe(true);
  });
});

// ═══════════════════════════════════════════
// updateStatus
// ═══════════════════════════════════════════
describe('updateStatus', () => {
  it('updates status and returns the row', async () => {
    const result = await returnRepo.updateStatus(testReturnId, storeId, 'approved', {
      adminNotes: 'Approved after inspection',
    });
    expect(result).toBeDefined();
    expect(result!.id).toBe(testReturnId);
    expect(result!.status).toBe('approved');
    expect(result!.adminNotes).toBe('Approved after inspection');
    expect(result!.updatedAt).toBeInstanceOf(Date);
  });

  it('works without extra fields', async () => {
    const result = await returnRepo.updateStatus(testReturnId, storeId, 'rejected');
    expect(result).toBeDefined();
    expect(result!.status).toBe('rejected');
  });
});

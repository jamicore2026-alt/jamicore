// Integration tests for Return service — hits the real database.
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { db } from '../../db/index.js';
import { returns, returnItems, stores, orders, orderItems, customers } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { returnService } from './return.service.js';
import { returnRepo } from './return.repo.js';

let storeId: string;
let orderId: string;
let customerId: string;
let orderItemId: string;
let createdStore = false;
let createdCustomer = false;
let createdOrder = false;
let createdOrderItem = false;
let testReturnId: string;

beforeAll(async () => {
  let store = await db.query.stores.findFirst();
  let customer = await db.query.customers.findFirst();
  let order = await db.query.orders.findFirst();
  let orderItem = await db.query.orderItems.findFirst();

  if (!store) {
    [store] = await db
      .insert(stores)
      .values({
        name: 'Return Service Test Store',
        domain: `rs-test-${Date.now()}.local`,
        ownerEmail: `rs-owner-${Date.now()}@test.local`,
        status: 'active',
      })
      .returning();
    createdStore = true;
  }
  if (!customer) {
    [customer] = await db
      .insert(customers)
      .values({
        storeId: store.id,
        email: `rs-customer-${Date.now()}@test.local`,
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      })
      .returning();
    createdCustomer = true;
  }
  [order] = await db
    .insert(orders)
    .values({
      storeId: store.id,
      customerId: customer.id,
      orderNumber: `RS-ORD-${Date.now()}`,
      email: customer.email,
      currency: 'USD',
      subtotal: '100.00',
      total: '100.00',
      status: 'fulfilled',
    })
    .returning();
  createdOrder = true;

  [orderItem] = await db
    .insert(orderItems)
    .values({
      orderId: order.id,
      storeId: store.id,
      productTitle: 'RS Test Product',
      quantity: 2,
      price: '29.99',
      total: '59.98',
    })
    .returning();
  createdOrderItem = true;

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
    reason: 'Defective',
    notes: 'Please replace',
  });
  testReturnId = ret.id;

  await returnRepo.createItem({
    returnId: testReturnId,
    orderItemId,
    quantity: 1,
    reason: 'Broken',
    condition: 'damaged',
  });
});

afterEach(async () => {
  await db.delete(returnItems).where(eq(returnItems.returnId, testReturnId));
  await db.delete(returns).where(eq(returns.id, testReturnId));
});

afterAll(async () => {
  if (createdOrderItem) {
    await db.delete(orderItems).where(eq(orderItems.id, orderItemId));
  }
  if (createdOrder) {
    await db.delete(orders).where(eq(orders.id, orderId));
  }
  if (createdCustomer) {
    await db.delete(customers).where(eq(customers.id, customerId));
  }
  if (createdStore) {
    await db.delete(stores).where(eq(stores.id, storeId));
  }
});

// ═══════════════════════════════════════════
// createReturn
// ═══════════════════════════════════════════
describe('createReturn', () => {
  it('creates a return with items for a valid order', async () => {
    const result = await returnService.createReturn({
      storeId,
      orderId,
      customerId,
      reason: 'Too big',
      items: [{ orderItemId, quantity: 1, reason: 'Sizing issue' }],
    });

    expect(result).toBeDefined();
    expect(result!.id).toBeDefined();
    expect(result!.storeId).toBe(storeId);
    expect(result!.status).toBe('requested');
    expect(Array.isArray(result!.items)).toBe(true);
    expect(result!.items.length).toBe(1);

    // Clean up
    const ids = result!.items.map((i) => i.id);
    for (const id of ids) await db.delete(returnItems).where(eq(returnItems.id, id));
    await db.delete(returns).where(eq(returns.id, result!.id));
  });

  it('throws ORDER_NOT_FOUND for nonexistent order', async () => {
    await expect(
      returnService.createReturn({
        storeId,
        orderId: '00000000-0000-0000-0000-000000000000',
        reason: 'Test',
        items: [{ orderItemId, quantity: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' });
  });

  it('throws ORDER_NOT_FOUND for order from different store', async () => {
    await expect(
      returnService.createReturn({
        storeId: '00000000-0000-0000-0000-000000000000',
        orderId,
        reason: 'Test',
        items: [{ orderItemId, quantity: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' });
  });

  it('throws ORDER_CANCELLED for cancelled order', async () => {
    const [cancelledOrder] = await db
      .insert(orders)
      .values({
        storeId,
        customerId,
        orderNumber: `CANCEL-${Date.now()}`,
        email: 'cancel@test.local',
        currency: 'USD',
        subtotal: '10.00',
        total: '10.00',
        status: 'cancelled',
      })
      .returning();

    await expect(
      returnService.createReturn({
        storeId,
        orderId: cancelledOrder.id,
        reason: 'Test',
        items: [{ orderItemId, quantity: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'ORDER_CANCELLED' });

    await db.delete(orders).where(eq(orders.id, cancelledOrder.id));
  });

  it('throws VALIDATION_ERROR when order item does not belong to this order', async () => {
    const [otherOrder] = await db
      .insert(orders)
      .values({
        storeId,
        customerId,
        orderNumber: `OTHER-${Date.now()}`,
        email: 'other@test.local',
        currency: 'USD',
        subtotal: '10.00',
        total: '10.00',
      })
      .returning();

    const [otherOrderItem] = await db
      .insert(orderItems)
      .values({
        orderId: otherOrder.id,
        storeId,
        productTitle: 'Other Product',
        quantity: 1,
        price: '10.00',
        total: '10.00',
      })
      .returning();

    await expect(
      returnService.createReturn({
        storeId,
        orderId,
        reason: 'Test',
        items: [{ orderItemId: otherOrderItem.id, quantity: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    await db.delete(orderItems).where(eq(orderItems.id, otherOrderItem.id));
    await db.delete(orders).where(eq(orders.id, otherOrder.id));
  });

  it('throws VALIDATION_ERROR when return quantity exceeds purchased quantity', async () => {
    // beforeEach already created a return with quantity 1 for an orderItem with quantity 2
    await expect(
      returnService.createReturn({
        storeId,
        orderId,
        reason: 'Test',
        items: [{ orderItemId, quantity: 2 }],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});

// ═══════════════════════════════════════════
// updateStatus
// ═══════════════════════════════════════════
describe('updateStatus', () => {
  it('approves a requested return', async () => {
    const result = await returnService.updateStatus(testReturnId, storeId, 'approved', 'Looks good');
    expect(result).toBeDefined();
    expect(result!.status).toBe('approved');
    expect(result!.adminNotes).toBe('Looks good');
  });

  it('rejects a requested return', async () => {
    const result = await returnService.updateStatus(testReturnId, storeId, 'rejected', 'Bad condition');
    expect(result).toBeDefined();
    expect(result!.status).toBe('rejected');
  });

  it('transitions approved -> received', async () => {
    await returnService.updateStatus(testReturnId, storeId, 'approved');
    const result = await returnService.updateStatus(testReturnId, storeId, 'received');
    expect(result).toBeDefined();
    expect(result!.status).toBe('received');
    expect(result!.receivedAt).toBeInstanceOf(Date);
  });

  it('transitions received -> inspected', async () => {
    await returnService.updateStatus(testReturnId, storeId, 'approved');
    await returnService.updateStatus(testReturnId, storeId, 'received');
    const result = await returnService.updateStatus(testReturnId, storeId, 'inspected');
    expect(result).toBeDefined();
    expect(result!.status).toBe('inspected');
    expect(result!.inspectedAt).toBeInstanceOf(Date);
  });

  it('transitions inspected -> refunded', async () => {
    await returnService.updateStatus(testReturnId, storeId, 'approved');
    await returnService.updateStatus(testReturnId, storeId, 'received');
    await returnService.updateStatus(testReturnId, storeId, 'inspected');
    const result = await returnService.updateStatus(testReturnId, storeId, 'refunded');
    expect(result).toBeDefined();
    expect(result!.status).toBe('refunded');
    expect(result!.refundedAt).toBeInstanceOf(Date);
  });

  it('throws RETURN_INVALID_STATUS for invalid approved -> refunded', async () => {
    await returnService.updateStatus(testReturnId, storeId, 'approved');
    await expect(
      returnService.updateStatus(testReturnId, storeId, 'refunded'),
    ).rejects.toMatchObject({ code: 'RETURN_INVALID_STATUS' });
  });

  it('rejects invalid status transitions', async () => {
    await expect(returnService.updateStatus(testReturnId, storeId, 'refunded')).rejects.toMatchObject({
      code: 'RETURN_INVALID_STATUS',
    });
  });

  it('throws RETURN_NOT_FOUND for wrong store', async () => {
    await expect(
      returnService.updateStatus(testReturnId, '00000000-0000-0000-0000-000000000000', 'approved'),
    ).rejects.toMatchObject({ code: 'RETURN_NOT_FOUND' });
  });
});

// ═══════════════════════════════════════════
// getReturn
// ═══════════════════════════════════════════
describe('getReturn', () => {
  it('returns a return with items', async () => {
    const result = await returnService.getReturn(testReturnId, storeId);
    expect(result).toBeDefined();
    expect(result!.id).toBe(testReturnId);
    expect(Array.isArray(result!.items)).toBe(true);
  });

  it('throws RETURN_NOT_FOUND for wrong store', async () => {
    await expect(returnService.getReturn(testReturnId, '00000000-0000-0000-0000-000000000000')).rejects.toMatchObject({
      code: 'RETURN_NOT_FOUND',
    });
  });
});

// ═══════════════════════════════════════════
// listReturns
// ═══════════════════════════════════════════
describe('listReturns', () => {
  it('returns returns for the store with pagination', async () => {
    const result = await returnService.listReturns(storeId, { page: 1, limit: 20 });
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.pagination.total).toBeGreaterThanOrEqual(1);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(20);
    expect(result.pagination.totalPages).toBeGreaterThanOrEqual(1);
    expect(result.data.some((r) => r.id === testReturnId)).toBe(true);
  });
});

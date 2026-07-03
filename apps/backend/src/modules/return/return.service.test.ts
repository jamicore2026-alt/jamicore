// Integration tests for Return service — hits the real database.
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { db, dbOwner } from '../../db/index.js';
import { returns, returnItems, stores, orders, orderItems, customers } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { returnService } from './return.service.js';
import { returnRepo } from './return.repo.js';

let storeId: string;
let orderId: string;
let customerId: string;
let orderItemId: string;
let testReturnId: string;

beforeAll(async () => {
  // Self-sufficient dedicated fixtures (own store with a unique domain) —
  // mirrors the RLS test pattern. Avoids the shared-store race that broke this
  // suite on a dirty DB: the previous unscoped `db.query.stores.findFirst()`
  // reused whatever store it found (often one another test file created and
  // deletes in its afterAll), so this file's orders/returns FK-failed when that
  // owner deleted the shared store mid-run. All inserts go through dbOwner
  // (BYPASSRLS) because customers/orders/order_items have RLS (migrations
  // 0025+0027) and app_tenant can't INSERT them without app.tenant_id (WITH
  // CHECK). The service under test still goes through withTenant → RLS-safe.
  const [store] = await dbOwner
    .insert(stores)
    .values({
      name: 'Return Service Test Store',
      domain: `rss-test-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.local`,
      ownerEmail: `rss-owner-${Date.now()}@test.local`,
      status: 'active',
    })
    .returning();
  storeId = store.id;

  const [customer] = await dbOwner
    .insert(customers)
    .values({
      storeId,
      email: `rss-customer-${Date.now()}-${crypto.randomUUID().slice(0, 8)}@test.local`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    })
    .returning();
  customerId = customer.id;

  const [order] = await dbOwner
    .insert(orders)
    .values({
      storeId,
      customerId,
      orderNumber: `RSS-ORD-${Date.now()}`,
      email: customer.email,
      currency: 'USD',
      subtotal: '100.00',
      total: '100.00',
      status: 'fulfilled',
    })
    .returning();
  orderId = order.id;

  const [orderItem] = await dbOwner
    .insert(orderItems)
    .values({
      orderId,
      storeId,
      productTitle: 'RSS Test Product',
      quantity: 2,
      price: '29.99',
      total: '59.98',
    })
    .returning();
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
  // Guard against undefined id: if beforeEach's createReturn threw, testReturnId
  // stays undefined and `eq(col, undefined)` throws a Drizzle UNDEFINED_VALUE
  // binding error — masking the real failure. Skip the delete when never set.
  if (testReturnId) {
    await db.delete(returnItems).where(eq(returnItems.returnId, testReturnId));
    await db.delete(returns).where(eq(returns.id, testReturnId));
  }
});

afterAll(async () => {
  // Cleanup of RLS-enabled tables via dbOwner (BYPASSRLS): a `db` (app_tenant)
  // delete without app.tenant_id would silently no-op (USING filter hides rows).
  // Stores has no RLS, but dbOwner is used uniformly for the owned fixtures.
  await dbOwner.delete(orderItems).where(eq(orderItems.id, orderItemId));
  await dbOwner.delete(orders).where(eq(orders.id, orderId));
  await dbOwner.delete(customers).where(eq(customers.id, customerId));
  await dbOwner.delete(stores).where(eq(stores.id, storeId));
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
    // Seed via dbOwner (BYPASSRLS) — orders has RLS; app_tenant INSERT needs
    // app.tenant_id. The service call below uses withTenant(storeId) → RLS sees
    // the row and ORDER_CANCELLED is surfaced by the service's own logic.
    const [cancelledOrder] = await dbOwner
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

    await dbOwner.delete(orders).where(eq(orders.id, cancelledOrder.id));
  });

  it('throws VALIDATION_ERROR when order item does not belong to this order', async () => {
    // Seed orders/order_items via dbOwner (BYPASSRLS) — both have RLS.
    const [otherOrder] = await dbOwner
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

    const [otherOrderItem] = await dbOwner
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

    await dbOwner.delete(orderItems).where(eq(orderItems.id, otherOrderItem.id));
    await dbOwner.delete(orders).where(eq(orders.id, otherOrder.id));
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

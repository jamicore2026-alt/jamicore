// Behavioral test: the unscoped admin reads in orderRepo (findAll,
// findByIdAdmin, findOrderItems) route through dbAdmin (BYPASSRLS), not the
// tenant-scoped db. These are super-admin paths (called only from
// order.route.superAdmin.ts); once orders gets RLS they must bypass it.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/index.js', () => {
  const dbOrdersFindFirst = vi.fn();
  const dbAdminOrdersFindFirst = vi.fn();
  const dbAdminOrdersFindMany = vi.fn();
  const dbAdminOrderItemsFindMany = vi.fn();
  return {
    db: { query: { orders: { findFirst: dbOrdersFindFirst } } },
    dbAdmin: {
      query: {
        orders: { findFirst: dbAdminOrdersFindFirst, findMany: dbAdminOrdersFindMany },
        orderItems: { findMany: dbAdminOrderItemsFindMany },
      },
    },
  };
});

import { db, dbAdmin } from '../../db/index.js';
import { orderRepo } from './order.repo.js';

const dbOrdersFindFirst = db.query.orders.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbAdminOrdersFindFirst = dbAdmin.query.orders.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbAdminOrdersFindMany = dbAdmin.query.orders.findMany as unknown as ReturnType<typeof vi.fn>;
const dbAdminOrderItemsFindMany = dbAdmin.query.orderItems.findMany as unknown as ReturnType<typeof vi.fn>;

describe('orderRepo admin reads dbAdmin routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbAdminOrdersFindFirst.mockResolvedValue(undefined);
    dbAdminOrdersFindMany.mockResolvedValue([]);
    dbAdminOrderItemsFindMany.mockResolvedValue([]);
  });

  it('findByIdAdmin routes through dbAdmin, not db', async () => {
    await orderRepo.findByIdAdmin('order-1');

    expect(dbAdminOrdersFindFirst).toHaveBeenCalled();
    expect(dbOrdersFindFirst).not.toHaveBeenCalled();
  });

  it('findOrderItems routes through dbAdmin', async () => {
    await orderRepo.findOrderItems('order-1');

    expect(dbAdminOrderItemsFindMany).toHaveBeenCalled();
  });
});
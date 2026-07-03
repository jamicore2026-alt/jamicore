// Verifies analyticsService wraps all analytics DB work in withTenant(storeId, fn)
// (RLS Phase 1 prep). Closes the latent zero-out gap: analytics.repo reads
// customers (this phase) + orders/orderItems (already RLS) on bare db with zero
// test coverage — merchant dashboard counts were silently zeroing out under
// orders-RLS. withTenant + repo + cache mocked.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn({ __sentinel: 'tx' });
  },
}));

const { repoFns } = vi.hoisted(() => ({
  repoFns: {
    countOrders: vi.fn().mockResolvedValue([{ count: 5 }]),
    countCustomers: vi.fn().mockResolvedValue([{ count: 3 }]),
    countProducts: vi.fn().mockResolvedValue([{ count: 10 }]),
    getRevenueStats: vi.fn().mockResolvedValue([{ totalRevenue: '1000', averageOrderValue: '100' }]),
    countRecentOrders: vi.fn().mockResolvedValue([{ count: 2 }]),
    getRecentRevenue: vi.fn().mockResolvedValue([{ totalRevenue: '200' }]),
    getTopProducts: vi.fn().mockResolvedValue([{ productId: 'p1', productTitle: 'A', totalSold: '5', totalRevenue: '500' }]),
    getOrdersByStatus: vi.fn().mockResolvedValue([{ status: 'paid', count: 3 }]),
    getNewVsReturningCustomers: vi.fn().mockResolvedValue({ newCustomers: 2, returningCustomers: 1 }),
    buildPeriodExpr: vi.fn().mockReturnValue({ sql: 'expr' }),
    getRevenueByPeriod: vi.fn().mockResolvedValue([{ period: '2026-01-01', revenue: '100', orderCount: '1', averageOrderValue: '100' }]),
  },
}));
vi.mock('./analytics.repo.js', () => ({
  countOrders: repoFns.countOrders,
  countCustomers: repoFns.countCustomers,
  countProducts: repoFns.countProducts,
  getRevenueStats: repoFns.getRevenueStats,
  countRecentOrders: repoFns.countRecentOrders,
  getRecentRevenue: repoFns.getRecentRevenue,
  getTopProducts: repoFns.getTopProducts,
  getOrdersByStatus: repoFns.getOrdersByStatus,
  getNewVsReturningCustomers: repoFns.getNewVsReturningCustomers,
  buildPeriodExpr: repoFns.buildPeriodExpr,
  getRevenueByPeriod: repoFns.getRevenueByPeriod,
}));

// cache.wrap runs the fn immediately (no real Redis in unit test).
const { cache } = vi.hoisted(() => ({
  cache: { wrap: vi.fn(async (_key: string, fn: () => Promise<unknown>) => fn()) },
}));
vi.mock('../../services/cache.service.js', () => ({ getCacheService: () => cache }));

import { analyticsService } from './analytics.service.js';

describe('analytics.service wraps analytics DB work in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getPublicStats runs countProducts inside withTenant(storeId) and threads tx', async () => {
    await analyticsService.getPublicStats('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoFns.countProducts).toHaveBeenCalledWith('s1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('getDashboardStats runs all 6 repo calls inside withTenant(storeId) and threads tx', async () => {
    await analyticsService.getDashboardStats('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoFns.countOrders).toHaveBeenCalledWith('s1', expect.objectContaining({ __sentinel: 'tx' }));
    expect(repoFns.countCustomers).toHaveBeenCalledWith('s1', expect.objectContaining({ __sentinel: 'tx' }));
    expect(repoFns.getRevenueStats).toHaveBeenCalledWith('s1', expect.objectContaining({ __sentinel: 'tx' }));
    expect(repoFns.countRecentOrders).toHaveBeenCalledWith('s1', expect.any(Date), expect.objectContaining({ __sentinel: 'tx' }));
    expect(repoFns.getRecentRevenue).toHaveBeenCalledWith('s1', expect.any(Date), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('getTopProducts runs inside withTenant(storeId)', async () => {
    await analyticsService.getTopProducts('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoFns.getTopProducts).toHaveBeenCalledWith('s1', 5, expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('getOrderStatusBreakdown runs inside withTenant(storeId)', async () => {
    await analyticsService.getOrderStatusBreakdown('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoFns.getOrdersByStatus).toHaveBeenCalledWith('s1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('getCustomerInsights runs inside withTenant(storeId)', async () => {
    await analyticsService.getCustomerInsights('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoFns.getNewVsReturningCustomers).toHaveBeenCalledWith('s1', expect.any(Date), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('getRevenueByPeriod runs inside withTenant(storeId) and threads tx', async () => {
    await analyticsService.getRevenueByPeriod('s1', 'daily');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoFns.getRevenueByPeriod).toHaveBeenCalledWith('s1', expect.any(Object), expect.any(Date), expect.any(Date), expect.objectContaining({ __sentinel: 'tx' }));
  });
});
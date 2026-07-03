// Analytics Service - Store analytics (dashboard data)
import * as repo from './analytics.repo.js';
import { getCacheService } from '../../services/cache.service.js';
import { withTenant } from '../../lib/withTenant.js';

export const analyticsService = {
  /**
   * PERF-008: dedicated, lightweight method for the public analytics
   * endpoint. Previously the route called getDashboardStats (6 queries
   * including revenue & recent-order subqueries) just to read
   * totalProducts — overkill for a public endpoint that may be hit on
   * every storefront page load.
   */
  async getPublicStats(storeId: string) {
    const cache = getCacheService();
    const cacheKey = `analytics:public:${storeId}`;
    return cache.wrap(
      cacheKey,
      async () => {
        const productCount = await withTenant(storeId, async (tx) => repo.countProducts(storeId, tx));
        return {
          totalProducts: productCount[0]?.count ?? 0,
        };
      },
      300, // 5 minutes — product count changes only on product create/delete
    );
  },

  async getDashboardStats(storeId: string) {
    const cache = getCacheService();
    const cacheKey = `analytics:dashboard:${storeId}`;

    return cache.wrap(
      cacheKey,
      async () => {
        const stats = await withTenant(storeId, async (tx) => {
          const [
            orderStats,
            customerCount,
            productCount,
            revenueStats,
          ] = await Promise.all([
            repo.countOrders(storeId, tx),
            repo.countCustomers(storeId, tx),
            repo.countProducts(storeId, tx),
            repo.getRevenueStats(storeId, tx),
          ]);

          // Recent orders count (last 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const recentOrders = await repo.countRecentOrders(storeId, thirtyDaysAgo, tx);

          // Recent revenue (last 30 days)
          const recentRevenue = await repo.getRecentRevenue(storeId, thirtyDaysAgo, tx);

          return {
            totalOrders: orderStats[0]?.count ?? 0,
            totalRevenue: revenueStats[0]?.totalRevenue ?? '0',
            totalCustomers: customerCount[0]?.count ?? 0,
            totalProducts: productCount[0]?.count ?? 0,
            averageOrderValue: revenueStats[0]?.averageOrderValue ?? '0',
            recentOrders: recentOrders[0]?.count ?? 0,
            recentRevenue: recentRevenue[0]?.totalRevenue ?? '0',
          };
        });
        return stats;
      },
      300, // 5 minutes
    );
  },

  async getTopProducts(storeId: string) {
    const cache = getCacheService();
    const cacheKey = `analytics:topProducts:${storeId}`;
    return cache.wrap(
      cacheKey,
      () => withTenant(storeId, async (tx) => repo.getTopProducts(storeId, 5, tx)),
      300,
    );
  },

  async getOrderStatusBreakdown(storeId: string) {
    const cache = getCacheService();
    const cacheKey = `analytics:orderStatus:${storeId}`;
    return cache.wrap(
      cacheKey,
      () => withTenant(storeId, async (tx) => repo.getOrdersByStatus(storeId, tx)),
      300,
    );
  },

  async getCustomerInsights(storeId: string) {
    const cache = getCacheService();
    const cacheKey = `analytics:customerInsights:${storeId}`;
    return cache.wrap(
      cacheKey,
      async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return withTenant(storeId, async (tx) => repo.getNewVsReturningCustomers(storeId, thirtyDaysAgo, tx));
      },
      300,
    );
  },

  async getRevenueByPeriod(
    storeId: string,
    period: 'daily' | 'weekly' | 'monthly',
    opts?: { startDate?: Date; endDate?: Date },
  ) {
    const endDate = opts?.endDate ?? new Date();
    const startDate = opts?.startDate ?? (() => {
      const d = new Date();
      if (period === 'daily') d.setDate(d.getDate() - 30);
      else if (period === 'weekly') d.setDate(d.getDate() - 90);
      else d.setMonth(d.getMonth() - 12);
      return d;
    })();

    const cache = getCacheService();
    const cacheKey = `analytics:revenueByPeriod:${storeId}:${period}:${startDate.toISOString()}:${endDate.toISOString()}`;

    return cache.wrap(
      cacheKey,
      async () => {
        // PostgreSQL to_char format must be a SQL literal, not a parameter
        let dateFormat: string;
        if (period === 'daily') {
          dateFormat = 'YYYY-MM-DD';
        } else if (period === 'weekly') {
          dateFormat = 'IYYY-IW';
        } else {
          dateFormat = 'YYYY-MM';
        }

        const periodExpr = repo.buildPeriodExpr(dateFormat);

        const results = await withTenant(
          storeId,
          async (tx) => repo.getRevenueByPeriod(storeId, periodExpr, startDate, endDate, tx),
        );

        return results.map((row) => ({
          period: row.period,
          revenue: row.revenue,
          orderCount: Number(row.orderCount),
          averageOrderValue: row.averageOrderValue,
        }));
      },
      300, // 5 minutes
    );
  },
};
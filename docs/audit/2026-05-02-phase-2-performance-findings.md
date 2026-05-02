# Phase 2: Performance Audit Findings

**Date:** 2026-05-02
**Scope:** Backend DB queries, caching, frontend bundles, API response sizes
**Methodology:** Schema index analysis, repo query review, route caching audit, Vite config review
**Classification:** P1 = Query cost / scalability blocker / missing cache, P2 = Suboptimal config / future debt

---

## P1 Findings (High)

### P-01: Missing Database Indexes on Hot Query Columns
- **Files:** `apps/backend/src/db/schema.ts`
- **Severity:** P1
- **Description:** Several frequently queried foreign-key and filter columns lack indexes, causing full/ partial table scans:
  | Table | Missing Index On | Why It Matters |
  |-------|------------------|----------------|
  | `categories` | `storeId` | Every storefront loads categories per store; unindexed scan |
  | `modifierGroups` | `productId`, `categoryId` | Product detail loads all modifier groups per product |
  | `modifierOptions` | `modifierGroupId` | Modifier group loads all options |
  | `customerAddresses` | `customerId` | Account page loads addresses per customer |
  | `wishlists` | `storeId`, `customerId` | Wishlist page queried per customer+store |
  | `orderItems` | `storeId` | Order listings, merchant reports filter by store |
  | `emailTemplates` | `storeId` | Store settings load templates |
  | `activityLogs` | `storeId`, `createdAt` | Audit logs grow large; pagination requires sort+filter index |
  | `storeAnalytics` | `storeId`, `date` | Dashboard analytics queried by store+date range |
  | `productBundles` | `storeId` | Bundle listing per store |
- **Impact:** Degraded query performance as tables grow. `activityLogs` and `orders` will become especially slow.
- **Recommendation:** Add composite indexes for the most common query patterns. Example:
  ```ts
  index("categories_store_id_idx").on(table.storeId)
  index("modifier_groups_product_id_idx").on(table.productId)
  index("activity_logs_store_id_created_at_idx").on(table.storeId, table.createdAt)
  ```

### P-02: Product Listing Eager-Loads Deep Relations (Query Explosion)
- **File:** `apps/backend/src/modules/product/product.repo.ts:49-68`
- **Severity:** P1
- **Description:** `findByStoreId` uses Drizzle `with: { variants: { with: { options: true } }, modifierGroups: { with: { options: true } } }`. Drizzle ORM executes separate queries for each nested relation. A listing of 20 products with 3 variants each (and 3 options per variant) plus 2 modifier groups each (with 4 options) can trigger 1 + 20 + 60 + 20 + 80 ≈ **180 queries** on a cache miss.
- **Impact:** Cache miss on product listing causes massive DB load and slow response times.
- **Recommendation:** For listing endpoints, load only product columns + a `variantCount` / `modifierCount` summary. Move full variant/modifier loading to the `findById` (detail) endpoint only. Or use a single raw SQL query with JSON aggregation.

### P-03: Tenant Resolution (`findByDomain`) Is Uncached
- **File:** `apps/backend/src/modules/store/store.repo.ts:18-23`, `apps/backend/src/scopes/public.ts:22-62`
- **Severity:** P1
- **Description:** `findByDomain` is called on **every single API request** to resolve the store tenant. There is no Redis cache for domain-to-storeId mapping. A public API with 1000 RPM generates 1000 DB lookups per minute for the same handful of domains.
- **Impact:** Unnecessary DB connection pool pressure and latency on every request.
- **Recommendation:** Cache `findByDomain` results in Redis with a 5-minute TTL. Add negative caching for unknown domains.

### P-04: SuperAdmin `getRevenueSummary` Scans Entire Orders Table
- **File:** `apps/backend/src/modules/superAdmin/superAdmin.repo.ts:166-181`
- **Severity:** P1
- **Description:** `getRevenueSummary` selects `SUM(total)`, `AVG(total)`, `COUNT(DISTINCT customerId)` from the `orders` table WHERE `status='delivered'` with **no store filter and no date limit**. As the platform accumulates millions of orders, this becomes a full table scan aggregating all historical data.
- **Impact:** SuperAdmin dashboard loads slowly or times out. Blocks DB resources.
- **Recommendation:** Add a default date range (e.g., last 30 days) and an optional `days` parameter. Add a `status + createdAt` composite index if not already present.

### P-05: Order `findAll` (SuperAdmin) Lacks Cross-Store Guardrails
- **File:** `apps/backend/src/modules/order/order.repo.ts:60-95`
- **Severity:** P1
- **Status:** **Fixed**
- **Description:** `findAll` is used by the superAdmin scope to list orders. It paginates but the `COUNT(*)` query still scans all orders across all stores. With millions of orders, even `SELECT COUNT(*)` becomes expensive.
- **Impact:** Slow superAdmin order listing. COUNT(*) on large tables is a known PostgreSQL bottleneck.
- **Fix:** Added optional `dateFrom`/`dateTo` filters to `orderRepo.findAll`. SuperAdmin route defaults to last 30 days when no explicit filters are provided. Added `orders_created_at_idx` for efficient date range filtering.

### P-06: Product Search Uses `ilike %term%` Without Full-Text Index
- **File:** `apps/backend/src/modules/product/product.repo.ts:36-42`
- **Severity:** P1
- **Status:** **Fixed**
- **Description:** Product search uses `ilike` with `%term%` wildcards on `titleEn`, `titleAr`, `descriptionEn`, `descriptionAr`. This prevents index usage and forces sequential scans.
- **Impact:** Product search degrades linearly with catalog size.
- **Fix:** Added `pg_trgm` extension and GIN indexes on product search columns (`title_en`, `title_ar`, `description_en`, `description_ar`) via migration `0015_mysterious_jigsaw.sql`. Existing `ilike` queries will now use index scans.

### P-07: Frontend Bundle Lacks Code Splitting
- **Files:** `apps/storefront/vite.config.ts`, `apps/dashboard/vite.config.ts`
- **Severity:** P1
- **Description:** Both Vite configs are minimal with no `build.rollupOptions.output.manualChunks`. The entire SvelteKit application is bundled into a single initial JS chunk. For the dashboard with many heavy pages (analytics, orders, products, settings), the first-page load downloads unnecessary code.
- **Impact:** Large initial bundle, slow Time-to-Interactive, especially on mobile.
- **Recommendation:** Add manual chunks in Vite config:
  ```ts
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['svelte', 'svelte-sonner', '@lucide/svelte'],
          charts: ['chart.js', 'apexcharts'],
        }
      }
    }
  }
  ```

### P-08: S3 Uploads Lack Cache-Control Headers
- **File:** `apps/backend/src/modules/upload/upload.service.ts:97-118`
- **Severity:** P1
- **Description:** S3 `PutObjectCommand` does not set `CacheControl` metadata. Product images served from S3 URLs will not be cached by browsers or CDNs, causing repeated downloads.
- **Impact:** Higher bandwidth costs and slower image loading on storefront.
- **Recommendation:** Add `CacheControl: 'public, max-age=31536000, immutable'` for product images (they are immutable after upload).

### P-09: Order Detail `findById` Loads Full Product Per Item (N+1)
- **File:** `apps/backend/src/modules/order/order.repo.ts:110-132`
- **Severity:** P1
- **Description:** `findById` eager-loads `items: { with: { product: true } }`. For an order with 10 items, Drizzle may execute 1 query for the order + 1 for items + 10 queries for each product.
- **Impact:** Order detail endpoint becomes slower as order size increases.
- **Recommendation:** For order detail, load items with only required product columns (`title`, `image`, `id`) via a single joined query, or cache order detail aggressively.

---

## P2 Findings (Medium/Low)

### P-10: Analytics Repo Functions Not Cached
- **File:** `apps/backend/src/modules/analytics/analytics.repo.ts`
- **Severity:** P2
- **Description:** The cache service defines `ANALYTICS: 3600` TTL, but none of the analytics repo functions use `cacheService.wrap()`. Dashboard stats are recomputed on every page load.
- **Impact:** Unnecessary DB load for frequently viewed dashboard metrics.
- **Recommendation:** Wrap `getRevenueStats`, `countOrders`, `countCustomers` in cache calls with 5-minute TTL.

### P-11: `storeService.findById` Called Twice Per Authenticated Request
- **File:** `apps/backend/src/scopes/customer.ts:43-59`, `apps/backend/src/scopes/merchant.ts:54-69`
- **Severity:** P2
- **Description:** Both customer and merchant scopes call `fastify.storeService.findById(decoded.storeId)` inside the JWT verification hook. This is a DB lookup on every authenticated request. If the same request later calls a route handler that also needs store data, it may fetch again.
- **Impact:** 1 extra DB query per authenticated request.
- **Recommendation:** Attach the full store object to `request.store` in the scope hook so route handlers can reuse it without re-querying.

### P-12: Cache Stampede `wrap` Retry Delay May Spin Too Fast
- **File:** `apps/backend/src/services/cache.service.ts:62-89`
- **Severity:** P2
- **Description:** The retry delay formula is `Math.min(100 * (2 ** (10 - retries)), 2000)`. With `retries = 10`, first retry is 100ms, then 200ms, 400ms, etc. If many concurrent requests hit a cold cache, 100ms is very short and may still cause a stampede.
- **Impact:** Possible cache stampede under high load.
- **Recommendation:** Increase base delay to 500ms and add jitter. Consider using Redis Redlock or pub/sub for cache warming instead of polling.

### P-13: No Connection Pool Size Configured in Env Schema
- **File:** `apps/backend/src/config/env.ts`
- **Severity:** P2
- **Description:** The env schema does not include a `DB_POOL_SIZE` or `DB_MAX_CONNECTIONS` variable. The app relies on Drizzle/node-postgres defaults, which may be too low for production or too high for limited-resource deployments.
- **Impact:** Connection pool may be undersized for production load or oversized for small deployments.
- **Recommendation:** Add `DB_POOL_SIZE` and `DB_POOL_IDLE_TIMEOUT` to env schema and pass them to the Postgres client.

### P-14: `publicProductsRoutes` Cache Key Includes All Query Params
- **File:** `apps/backend/src/modules/product/product.route.public.ts:8-16`, `apps/backend/src/modules/product/product.route.public.ts:32`
- **Severity:** P2
- **Description:** The cache key hashes all query parameters including `offset`. This means page 1 and page 2 have different cache keys, reducing cache hit rate for the same filter set.
- **Impact:** Lower cache hit rate on product listings.
- **Recommendation:** Exclude `offset` from the cache key for list endpoints, or use a separate cache layer for the full result set and paginate in memory.

### P-15: Abandoned Cart Cron Runs on Single Instance Only
- **File:** `apps/backend/src/index.ts:401-407`
- **Severity:** P2
- **Description:** `runAbandonedCartCron` is triggered by `setInterval` in the main process. If the backend scales horizontally (multiple instances), each instance will run the cron, causing duplicate abandoned-cart emails.
- **Impact:** Duplicate emails and race conditions in multi-instance deployments.
- **Recommendation:** Use a distributed lock (Redis Redlock) or a dedicated job scheduler (BullMQ repeatable jobs) so only one instance runs the cron.

---

## Summary

| Severity | Count |
|----------|-------|
| P1 | 9 |
| P2 | 6 |
| **Total** | **15** |

**Immediate action:** P-01 (missing indexes) and P-03 (tenant resolution caching) should be prioritized before production scaling. P-02 (product listing query explosion) is the next highest impact for storefront performance.

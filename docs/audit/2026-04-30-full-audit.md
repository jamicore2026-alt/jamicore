# Full Project Audit Report

**Date:** 2026-04-30
**Commit:** `5abd306` (Phase 5 complete)
**Auditor:** Automated checklist-driven audit

---

## Executive Summary

| Area | Total | P0 | P1 | P2 |
|------|-------|----|----|----|
| Infrastructure | 12 | 0 | 2 | 10 |
| Backend - High Risk (auth, payment, order, product) | 31 | 2 | 19 | 10 |
| Backend - Commerce (coupon, cart, shipping, tax) | 27 | 5 | 15 | 7 |
| Backend - Admin (customer, staff, superAdmin, store, plan-limits) | 38 | 8 | 17 | 13 |
| Backend - Remaining (analytics, bundle, consent, etc.) | 23 | 5 | 10 | 8 |
| Backend - Services & Database Schema | 14 | 2 | 6 | 6 |
| Shared Packages | 4 | 0 | 0 | 4 |
| Dashboard | 24 | 1 | 11 | 12 |
| Storefront | 27 | 3 | 14 | 10 |
| Cross-Cutting (error handling, API responses, notifications) | 9 | 0 | 4 | 5 |
| **GRAND TOTAL** | **209** | **26** | **98** | **85** |

**Risk Score: CRITICAL**

### Top 10 Concerns (All P0 + Critical P1)

1. **P0 - Auth scope hooks break on URLs with query strings** — `request.url` includes query params, so `endsWith('/auth/login')` fails, breaking login/register and causing CSRF/JWT hooks to run incorrectly. Also accepts refresh tokens as access tokens (no `type` check).
2. **P0 - Cross-store variant injection in Product** — Merchant routes create variants without verifying parent product belongs to authenticated store.
3. **P0 - Duplicate payment intents + plaintext secret fallback** — No check for existing `processing` payments; encryption failure falls back to plaintext storage.
4. **P0 - Coupon race conditions + missing unique constraint** — Per-customer usage limit bypassable via race condition; no unique constraint on `(storeId, code)`.
5. **P0 - Cart ownership not verified** — Public cart access by `cartId` only; leaked UUID = full read/write access.
6. **P0 - Floating-point arithmetic in tax/shipping** — JavaScript `Number` causes off-by-one-cent errors in monetary calculations.
7. **P0 - Plan limit checks non-atomic** — Concurrent requests can exceed product, storage, and staff quotas.
8. **P0 - Staff invitation race condition** — Concurrent requests with same token create duplicate users.
9. **P0 - Password reset token race condition** — Token can be used twice if requests are concurrent.
10. **P0 - XSS via JSON-LD in storefront** — Product JSON-LD injected via `{@html}` without escaping; merchant can inject arbitrary JavaScript.

---

## 1. Infrastructure Findings

| # | Severity | Category | Description | File | Evidence |
|---|----------|----------|-------------|------|----------|
| 1.1 | **P1** | Security | Hardcoded database credentials in tracked source file | `apps/backend/apply-missing-migrations.mjs:4` | `postgres('postgresql://saas_ecom:saas_ecom_dev_pass@localhost:5432/saas_ecom_dev')` |
| 1.2 | **P1** | Security | Docker containers run as root user | All Dockerfiles | No `USER` directive in production stage |
| 1.3 | P2 | Security | `.gitignore` missing `*.env` wildcard | `.gitignore` | Only specific variants listed, no `*.env` |
| 1.4 | P2 | Security | `.env.example` contains plaintext dev password | `.env.example` | `DATABASE_URL=postgresql://saas_ecom:saas_ecom_dev_pass@...` |
| 1.5 | P2 | Security | Docker Compose fallback passwords | `docker-compose.yml` | `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-saas_ecom_dev_pass}` |
| 1.6 | P2 | Security | DB/Redis ports bound to 0.0.0.0 | `docker-compose.yml` | `"5432:5432"` and `"6379:6379"` without `127.0.0.1` |
| 1.7 | P2 | Missing | No container health checks | All Dockerfiles | No `HEALTHCHECK` instruction |
| 1.8 | P2 | Security | CI actions use mutable version tags | `.github/workflows/*.yml` | `actions/checkout@v4`, `docker/build-push-action@v6` |
| 1.9 | P2 | Bug | Deploy workflow never pushes images | `.github/workflows/deploy.yml` | `push: false` on all build-push-action steps |
| 1.10 | P2 | Missing | No SAST/container scanning in CI | `.github/workflows/ci.yml` | Only `pnpm audit` runs |
| 1.11 | P2 | Security | Weak swagger auth defaults | `apps/backend/src/config/env.ts` | `SWAGGER_USER: z.string().default('admin')` |
| 1.12 | P2 | Security | Swagger password default trivial | `apps/backend/src/config/env.ts` | `SWAGGER_PASSWORD: z.string().default('docs')` |

---

## 2. Backend - Auth Module

| # | Severity | Category | Description | File |
|---|----------|----------|-------------|------|
| 2.1 | **P0** | Security | Scope hooks use `request.url` which includes query strings, breaking auth endpoints | `scopes/merchant.ts:23-34`, `scopes/customer.ts:22-33`, `scopes/superAdmin.ts:22-27` |
| 2.2 | **P0** | Security | Scope hooks accept refresh tokens as access tokens (no `type` check) | `scopes/merchant.ts:37`, `scopes/customer.ts:37`, `scopes/superAdmin.ts:29` |
| 2.3 | P1 | Security | SuperAdmin password change has zero Zod validation | `auth.route.superAdmin.ts:205-218` |
| 2.4 | P1 | Security | Customer login does not verify store is active | `auth.route.customer.ts:21-53` |
| 2.5 | P1 | Security | Password reset does not revoke existing refresh tokens | `auth.service.ts:294-316` |
| 2.6 | P1 | Bugs | Merchant email verification is a no-op (no `isVerified` column) | `auth.service.ts:245-262` |
| 2.7 | P1 | Code Quality | `auth.service.ts` exceeds 400 lines (419 lines) | `auth.service.ts` |
| 2.8 | P2 | Performance | Missing index on `users.storeId` | `schema.ts:82-90` |
| 2.9 | P2 | Performance | Missing composite index on `verificationTokens` lookup | `schema.ts:809-819` |

---

## 3. Backend - Payment Module

| # | Severity | Category | Description | File |
|---|----------|----------|-------------|------|
| 3.1 | P1 | Bugs | Stripe `payment_method_types` includes invalid `apple_pay`/`google_pay` | `payment.service.ts:489-491` |
| 3.2 | P1 | Security | Provider config falls back to plaintext when encryption fails | `payment.service.ts:77-84` |
| 3.3 | P1 | Bugs | Duplicate payment intents can be created for same order | `payment.service.ts:97-119` |
| 3.4 | P1 | Security | Public `/payments/providers` decrypts secrets on every request | `payment.route.public.ts:12-34` |
| 3.5 | P1 | Security | Webhook routes have no rate limiting | `payment.route.public.ts:55-231` |
| 3.6 | P1 | Bugs | `config!` non-null assertion after `decryptConfig` | `payment.service.ts:168, 208` |
| 3.7 | P2 | Code Quality | `refundPayment` is dead code | `payment.service.ts:255-373` |

---

## 4. Backend - Order Module

| # | Severity | Category | Description | File |
|---|----------|----------|-------------|------|
| 4.1 | P1 | Bugs | Customer order list pagination broken (filters client-side) | `order.route.customer.ts:16-27` |
| 4.2 | P1 | Security | `usageLimitPerCustomer` not enforced | `order.repo.ts:225-259` |
| 4.3 | P1 | Bugs | Variant-level inventory ignored during order creation | `order.service.ts:136-150` |
| 4.4 | P1 | Bugs | Order cancellation does not block paid orders or initiate refund | `order.service.ts:184-243` |
| 4.5 | P2 | Performance | Missing index on `orderItems.orderId` | `schema.ts:363-376` |
| 4.6 | P2 | Bugs | `generateOrderNumber` uses non-cryptographic `Math.random()` | `order.service.ts:10-13` |
| 4.7 | P2 | Code Quality | SuperAdmin order route returns inconsistent shape | `order.route.superAdmin.ts:24-27` |

---

## 5. Backend - Product Module

| # | Severity | Category | Description | File |
|---|----------|----------|-------------|------|
| 5.1 | **P0** | Security | Cross-store variant injection | `product.route.merchant.ts:125-195` |
| 5.2 | P1 | Security | Cross-store category linking | `product.route.merchant.ts:65-71`, `98-103` |
| 5.3 | P1 | Bugs | Public product detail masks all errors as 404 | `product.route.public.ts:78-91` |
| 5.4 | P1 | Performance | Product search uses `ilike` with no indexes | `product.repo.ts:216-226` |
| 5.5 | P2 | Performance | Missing indexes on product variant FKs | `schema.ts:140-178` |
| 5.6 | P2 | Performance | Variant CRUD does not invalidate product cache | `product.route.merchant.ts:125-226` |
| 5.7 | P2 | Security | No rate limiting on public product endpoints | `product.route.public.ts` |
| 5.8 | P2 | Code Quality | `tags` array lacks maximum length | `product.schema.ts:43` |

---

## 6. Backend - Coupon Module

| # | Severity | Category | Description | File |
|---|----------|----------|-------------|------|
| 6.1 | **P0** | Security | Missing unique constraint on `(storeId, code)` | `db/schema.ts:293` |
| 6.2 | **P0** | Bugs | Case-sensitive coupon lookup rejects valid codes | `coupon.repo.ts:36`, `coupon.service.ts:151` |
| 6.3 | **P0** | Bugs | Race condition on per-customer usage limit | `coupon.service.ts:187-193`, `order.repo.ts:225-258` |
| 6.4 | P1 | Bugs | TOCTOU between validation and order creation | `coupon.service.ts:180`, `pricing.service.ts:298` |
| 6.5 | P1 | Missing | No coupon stacking rules | `db/schema.ts:350-351`, `pricing.service.ts:293-303` |
| 6.6 | P1 | Code Quality | `any` type in coupon service test | `coupon.service.test.ts:18` |
| 6.7 | P2 | Code Quality | Zod `value` regex rejects leading-dot decimals | `coupon.schema.ts:13` |

---

## 7. Backend - Cart Module

| # | Severity | Category | Description | File |
|---|----------|----------|-------------|------|
| 7.1 | **P0** | Security | No cart ownership verification on public routes | `cart.route.public.ts:23`, `cart.repo.ts:10` |
| 7.2 | P1 | Bugs | No cart merge on login | `cart.service.ts` |
| 7.3 | P1 | Bugs | Cart expiration never enforced | `db/schema.ts:418`, `cart.service.ts:38-45` |
| 7.4 | P1 | Performance | Missing indexes on carts and cartItems | `db/schema.ts:408-434` |
| 7.5 | P1 | Code Quality | Type-unsafe `any` cast for `customerId` | `cart.route.public.ts:76,99` |
| 7.6 | P1 | Bugs | JSON.stringify key-order sensitivity for modifiers | `cart.service.ts:110-122` |
| 7.7 | P2 | Security | Public cart endpoints lack dedicated rate limiting | `plugins/rateLimit.ts:45`, `cart.route.public.ts` |
| 7.8 | P2 | Code Quality | Cart total field ignores discounts/shipping/tax | `cart.service.ts:62` |

---

## 8. Backend - Shipping Module

| # | Severity | Category | Description | File |
|---|----------|----------|-------------|------|
| 8.1 | P1 | Bugs | Floating-point arithmetic for shipping prices | `shipping.service.ts:193-198` |
| 8.2 | P1 | Bugs | State matching without country context | `shipping.service.ts:142-162` |
| 8.3 | P1 | Performance | Missing indexes on shipping tables | `db/schema.ts:878-905` |
| 8.4 | P2 | Code Quality | GET zone-by-ID returns 200 with null instead of 404 | `shipping.route.merchant.ts:33-36` |
| 8.5 | P2 | Missing | No caching on shipping calculation | `shipping.service.ts:140`, `shipping.repo.ts:160-165` |
| 8.6 | P2 | Code Quality | No input validation on merchant postal code patterns | `shipping.service.ts:155-159` |

---

## 9. Backend - Tax Module

| # | Severity | Category | Description | File |
|---|----------|----------|-------------|------|
| 9.1 | **P0** | Bugs | Floating-point arithmetic for tax calculations | `tax.service.ts:87-108` |
| 9.2 | P1 | Bugs | Compound tax permanently inflates taxable base | `tax.service.ts:92-99` |
| 9.3 | P1 | Code Quality | Zod schema rejects 0% tax rate | `tax.schema.ts:21` |
| 9.4 | P1 | Security | Merchant list endpoint lacks permission check | `tax.route.merchant.ts:9-15` |
| 9.5 | P1 | Performance | Missing index on `taxRates.storeId` | `db/schema.ts:907-920` |
| 9.6 | P2 | Missing | No wildcard matching for tax postal codes | `tax.service.ts:82`, `tax.schema.ts` |
| 9.7 | P2 | Missing | No caching on tax calculation | `tax.service.ts:72`, `tax.repo.ts:82-86` |

---

## 10. Backend - Customer, Staff, SuperAdmin, Store, Plan-Limits

| # | Severity | Category | Description | File |
|---|----------|----------|-------------|------|
| 10.1 | **P0** | Security | Staff invitation race condition (duplicate users) | `staff.service.ts:71-95` |
| 10.2 | **P0** | Security | PATCH `/:id/role` returns 200 with error JSON instead of 403 | `staff.route.merchant.ts:117-127` |
| 10.3 | **P0** | Security | Plan limit checks non-atomic (concurrent exceed) | `plan-limits.service.ts:31-67` |
| 10.4 | **P0** | Security | `incrementStorage`/`decrementStorage` without row locking | `plan-limits.service.ts:69-79` |
| 10.5 | **P0** | Security | Password reset token race condition | `auth.service.ts:294-315` |
| 10.6 | **P0** | Security | Email verification token race condition | `auth.service.ts:232-263` |
| 10.7 | P1 | Bugs | No soft delete on customers (GDPR) | `schema.ts:232-251`, `customer.repo.ts` |
| 10.8 | P1 | Performance | Customer list eagerly loads all addresses | `customer.repo.ts:31-58` |
| 10.9 | P1 | Performance | `hasPermission` queries DB on every request with no caching | `staff.service.ts:158-174` |
| 10.10 | P1 | Bugs | `findInvitationByTokenAnyStatus` still filters for `pending` | `staff.repo.ts:45-53` |
| 10.11 | P1 | Security | Staff invitation token uses `crypto.randomUUID()` (lower entropy) | `staff.service.ts:55` |
| 10.12 | P1 | Code Quality | `superAdmin.repo.ts` exceeds 400 lines (506 lines) | `superAdmin.repo.ts` |
| 10.13 | P1 | Code Quality | `superAdminService.getRevenueStats` uses `any` | `superAdmin.service.ts:195-206` |
| 10.14 | P1 | Code Quality | `superAdmin.route.settings.ts` PUT lacks Zod validation | `superAdmin.route.settings.ts:28` |
| 10.15 | P1 | Bugs | `createPlanSchema` missing `maxStaff` | `superAdmin.schema.ts:14-36` |
| 10.16 | P1 | Bugs | `getPlanForStore` throws when store has no plan | `plan-limits.service.ts:8-19` |
| 10.17 | P1 | Performance | Every limit check triggers multiple DB queries with zero caching | `plan-limits.service.ts:8-95` |
| 10.18 | P2 | Security | `superAdminStaffRoutes` catches errors manually | `superAdmin.route.staff.ts:52-67` |
| 10.19 | P2 | Code Quality | `DEFAULT_PERMISSIONS` hardcoded (drift risk) | `staff.service.ts:9-34` |
| 10.20 | P2 | Code Quality | `storeRepo` methods lack optional `tx` parameter | `store.repo.ts` |
| 10.21 | P2 | Security | Customer password reset fields unused in schema | `schema.ts:244-245` |

---

## 11. Backend - Remaining Modules

| # | Severity | Category | Description | File |
|---|----------|----------|-------------|------|
| 11.1 | **P0** | Security | Currency rates are global (no `storeId`) | `currency.repo.ts`, `currency.route.merchant.ts` |
| 11.2 | **P0** | Security | `deleteRate` allows any merchant to delete any rate | `currency.route.merchant.ts:36-44` |
| 11.3 | **P0** | Security | Public bundle exposes `purchasePrice` via `with: { product: true }` | `bundle.repo.ts:128-143` |
| 11.4 | **P0** | Security | Customer PATCH/DELETE review without ownership check | `review.route.customer.ts:55-74` |
| 11.5 | **P0** | Security | Webhook routes lack store ownership verification | `webhook.route.merchant.ts:31-86` |
| 11.6 | P1 | Security | `buildPeriodExpr` uses `sql.raw()` with string param | `analytics.repo.ts:59-61` |
| 11.7 | P1 | Security | Consent routes parse body as `any` with no Zod | `consent.route.public.ts:21-27`, `76-83` |
| 11.8 | P1 | Bugs | `updateConsent` mutates `createdAt` instead of `updatedAt` | `consent.service.ts:31-36` |
| 11.9 | P1 | Security | Public review endpoint returns unapproved reviews | `review.route.public.ts:14-22` |
| 11.10 | P1 | Bugs | Customer GET loads all store reviews then filters client-side | `review.route.customer.ts:15-22` |
| 11.11 | P1 | Security | Ticket routes cast all inputs with `as any` | `ticket.route.merchant.ts:18-20`, `50`, `76`, `100` |
| 11.12 | P1 | Security | Ticket endpoints lack `requirePermission` | `ticket.route.merchant.ts` |
| 11.13 | P1 | Bugs | `getWishlist` returns items across all stores | `wishlist.repo.ts:10-17`, `wishlist.service.ts:5-7` |
| 11.14 | P1 | Bugs | Exchange API call has no timeout | `exchange.service.ts:12` |
| 11.15 | P1 | Code Quality | `updateRates` performs N DB ops without transaction | `exchange.service.ts:21-48` |
| 11.16 | P2 | Code Quality | `deleteBundleItemsByBundleId` lacks storeId check | `bundle.repo.ts:83-88` |
| 11.17 | P2 | Bugs | SSE `broadcast` mutates `clients` Set while iterating | `notifications.service.ts:98-110` |
| 11.18 | P2 | Bugs | SSE stream may not fire for all disconnects | `notifications.route.merchant.ts:33-35` |
| 11.19 | P2 | Bugs | `createReturn` does not verify order is fulfilled | `return.service.ts:12-91` |
| 11.20 | P2 | Code Quality | `upload.service.ts` is empty dead code | `upload.service.ts:1` |
| 11.21 | P2 | Bugs | Delete URL check fails for S3-backed production | `upload.route.merchant.ts:91` |
| 11.22 | P2 | Code Quality | `page`/`limit` parsing uses manual `Number()` without Zod | `ticket.route.merchant.ts:18-19` |
| 11.23 | P2 | Code Quality | `listReturns` passes `request.customerId` without verification | `return.route.customer.ts:38` |

---

## 12. Backend - Services & Database Schema

| # | Severity | Category | Description | File |
|---|----------|----------|-------------|------|
| 12.1 | **P0** | Security | `role_permissions.store_id` missing FK constraint | `schema.ts:836-843` |
| 12.2 | **P0** | Security | Newsletter/SEO backend modules do not exist | `apps/backend/src/modules/newsletter/`, `apps/backend/src/modules/SEO/` |
| 12.3 | P1 | Performance | Critical FK columns lack indexes (30+) | `schema.ts` |
| 12.4 | P1 | Bugs | No soft delete on any table | `schema.ts` |
| 12.5 | P1 | Performance | `imageProcessor` fetches from public S3 URL | `imageProcessor.service.ts:30-32` |
| 12.6 | P1 | Bugs | `staffInvitations.status` not `notNull` | `schema.ts:828` |
| 12.7 | P2 | Security | S3 URL constructed without URL-encoding | `upload.service.ts:107` |
| 12.8 | P2 | Security | `upload.service.ts` uses `crypto.randomUUID()` without import | `upload.service.ts:95` |
| 12.9 | P2 | Bugs | Multiple tables missing `updatedAt` | `schema.ts` |
| 12.10 | P2 | Bugs | JSON columns lack runtime validation | `schema.ts` |
| 12.11 | P2 | Bugs | `exchangeRates` missing `createdAt` | `schema.ts:1029-1038` |
| 12.12 | P2 | Bugs | Business fields nullable when required | `schema.ts` |
| 12.13 | P2 | Code Quality | Seed script has hardcoded weak passwords | `seed.ts:30`, `182`, `455` |
| 12.14 | P2 | Bugs | `seed.ts` uses `onConflictDoNothing()` silently | `seed.ts` |

---

## 13. Shared Packages

| # | Severity | Category | Description | File |
|---|----------|----------|-------------|------|
| 13.1 | P2 | Security | JWT decode `atob` without padding fix | `packages/shared-utils/src/jwt.ts:39` |
| 13.2 | P2 | Security | `priceToCents` can introduce floating-point drift | `packages/shared-utils/src/format/price.ts:23-31` |
| 13.3 | P2 | Code Quality | `forwardCookies` loses security flags | `packages/shared-utils/src/cookies.ts:72-81` |
| 13.4 | P2 | Code Quality | `cn` utility duplicated across packages | `packages/ui/src/lib/index.ts`, `apps/dashboard/src/lib/utils.ts` |

---

## 14. Dashboard

| # | Severity | Category | Description | File |
|---|----------|----------|-------------|------|
| 14.1 | **P0** | Security | XSS via JSON-LD structured data in storefront (cross-cutting) | `apps/storefront/src/routes/products/[id]/+page.svelte:81` |
| 14.2 | P1 | Security | CSRF cookie set without `secure` flag | `apps/dashboard/src/hooks.server.ts:16-22` |
| 14.3 | P1 | Security | Refreshed access-token cookies lose security flags | `apps/dashboard/src/hooks.server.ts:48-56` |
| 14.4 | P1 | Security | Auth pages cast `cookies as any` | `apps/dashboard/src/routes/(auth)/login/+page.server.ts:36` |
| 14.5 | P1 | Bugs | `apiFetch` returns `undefined as T` then throws | `apps/dashboard/src/lib/api/client.ts:43-47` |
| 14.6 | P1 | Performance | Product/order images lack `loading="lazy"` | `apps/dashboard/src/routes/(merchant)/dashboard/products/+page.svelte:200` |
| 14.7 | P1 | Performance | Search debounce timeout never cleared on destroy | `apps/dashboard/src/routes/(superadmin)/admin/merchants/+page.svelte:35` |
| 14.8 | P1 | Code Quality | Extensive `any` types in Svelte components | `apps/dashboard/src/routes/(merchant)/dashboard/**/*.svelte` |
| 14.9 | P1 | Code Quality | Inline `formatPrice`/`formatDate` duplicated | `apps/dashboard/src/routes/(merchant)/dashboard/+page.svelte:15-21` |
| 14.10 | P1 | Bugs | Race condition on rapid status updates | `apps/dashboard/src/routes/(merchant)/dashboard/orders/[id]/+page.svelte:32-46` |
| 14.11 | P1 | Bugs | No global `+error.svelte` boundary | `apps/dashboard/src/routes/` |
| 14.12 | P1 | Bugs | `handleError` hook not defined | `apps/dashboard/src/hooks.server.ts` |
| 14.13 | P2 | Security | Missing Content-Security-Policy header | `apps/dashboard/src/hooks.server.ts:81-85` |
| 14.14 | P2 | Security | SuperAdmin notifications typed as `any[]` | `apps/dashboard/src/lib/components/layout/AdminTopbar.svelte:39` |
| 14.15 | P2 | Code Quality | `formatDate` duplicated in superadmin pages | `apps/dashboard/src/routes/(superadmin)/admin/+page.svelte:29-31` |
| 14.16 | P2 | Code Quality | Superforms adapter cast `as any` | Multiple auth `+page.server.ts` |
| 14.17 | P2 | Code Quality | Auth layout never redirects authenticated users | `apps/dashboard/src/routes/(auth)/+layout.server.ts:5-15` |
| 14.18 | P2 | Missing | Missing loading states/skeletons | Throughout dashboard |

---

## 15. Storefront

| # | Severity | Category | Description | File |
|---|----------|----------|-------------|------|
| 15.1 | **P0** | Security | XSS via JSON-LD structured data | `apps/storefront/src/routes/products/[id]/+page.svelte:81` |
| 15.2 | **P0** | Bugs | Hardcoded placeholder shipping address | `apps/storefront/src/routes/checkout/confirm/+page.svelte:78-85` |
| 15.3 | **P0** | Security | Checkout state tampering via sessionStorage | `apps/storefront/src/routes/checkout/confirm/+page.svelte:24-31` |
| 15.4 | P1 | Bugs | Guest checkout defaults to `guest@example.com` | `apps/storefront/src/routes/checkout/confirm/+page.svelte:61` |
| 15.5 | P1 | Bugs | Tax calculation ignores actual shipping address | `apps/storefront/src/routes/checkout/payment/+page.svelte:82-87` |
| 15.6 | P1 | Bugs | Coupon discount calculated client-side without server confirmation | `apps/storefront/src/routes/checkout/payment/+page.svelte:125-131` |
| 15.7 | P1 | Bugs | No server-side inventory check when adding items | `apps/backend/src/modules/cart/cart.service.ts:70-156` |
| 15.8 | P1 | Bugs | Cart mutations swallow errors with empty catches | `apps/storefront/src/lib/stores/cart.svelte.ts:39,80,101,118` |
| 15.9 | P1 | Security | Cookie forwarding loses security flags on refresh | `apps/storefront/src/hooks.server.ts:42-48` |
| 15.10 | P1 | Security | `safeDecodeJWT` used without signature verification | `apps/storefront/src/hooks.server.ts:22-68` |
| 15.11 | P2 | Performance | Main product image lacks `fetchpriority="high"` | `apps/storefront/src/lib/components/product/ImageGallery.svelte:34` |
| 15.12 | P2 | Bugs | Cart page doesn't re-fetch on mount | `apps/storefront/src/routes/cart/+page.svelte` |
| 15.13 | P2 | Code Quality | Auth pages cast `sf.form` to `Writable` | `apps/storefront/src/routes/(auth)/login/+page.svelte:23-30` |
| 15.14 | P2 | Missing | No order tracking page exists | `apps/storefront/src/routes/**/track-order*` |
| 15.15 | P2 | Missing | No product comparison page exists | `apps/storefront/src/routes/**/compare*` |
| 15.16 | P2 | Performance | Filter changes trigger full page reloads | `apps/storefront/src/routes/products/+page.svelte:24` |
| 15.17 | P2 | Code Quality | 38 instances of `: any` in storefront | Various `.ts` and `.svelte` files |
| 15.18 | P2 | Code Quality | Product description plain text in `prose` | `apps/storefront/src/routes/products/[id]/+page.svelte:138-141` |

---

## 16. Cross-Cutting Concerns

| # | Severity | Category | Description | File |
|---|----------|----------|-------------|------|
| 16.1 | P1 | Code Quality | `apiFetch` throws inconsistently shaped errors | `apps/storefront/src/lib/api/client.ts:48-54` |
| 16.2 | P1 | Code Quality | ~25 empty catch blocks in storefront | Various files |
| 16.3 | P1 | Code Quality | Inconsistent list response formats | `product.route.public.ts`, `order.route.customer.ts` |
| 16.4 | P1 | Code Quality | Payment intent returns raw object | `payment.route.customer.ts:26` |
| 16.5 | P2 | Code Quality | Notification endpoints use non-standard shapes | `notifications.route.merchant.ts:50,79` |
| 16.6 | P1 | Bugs | SSE broadcast mutates Set while iterating | `notifications.service.ts:98-110` |
| 16.7 | P2 | Bugs | SSE stream has no heartbeat/ping | `notifications.route.merchant.ts:9-36` |
| 16.8 | P2 | Bugs | NotificationBell suppresses markAllRead errors | `NotificationBell.svelte:45-50` |
| 16.9 | P2 | Code Quality | Abandoned cart module is empty placeholder | `analytics.route.superAdmin.ts:1` |

---

## Positive Findings

1. **JWT refresh token rotation** — All three auth scopes implement proper refresh token rotation with Redis revocation lists.
2. **Store isolation in queries** — Nearly all repo methods correctly include `eq(table.storeId, storeId)` filters.
3. **Zod strict schemas** — Input validation uses `z.strictObject()` rejecting unexpected properties.
4. **Cache stampede protection** — Cache service implements distributed locking with exponential backoff.
5. **No token disclosure on forgot-password** — Both customer and merchant endpoints return generic success messages.
6. **Tokens in httpOnly cookies** — No `localStorage`/`sessionStorage` token storage found.
7. **CSRF tokens forwarded** — All mutating requests include CSRF tokens.
8. **Scope checks in layouts** — `(merchant)` and `(superadmin)` layouts verify JWT scope.
9. **Pagination implemented** — Consistent pagination across products, orders, customers, merchants.
10. **Inventory decrement is atomic** — `order.repo.ts` uses SQL guard for race-safe inventory.
11. **Password reset avoids enumeration** — Returns same message regardless of email existence.
12. **Svelte auto-escaping** — No `@html` with untrusted data in dashboard (only storefront JSON-LD issue).

---

*End of Audit Report*

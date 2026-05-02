# Phase 3: Code Quality Audit Findings

**Date:** 2026-05-02
**Scope:** TypeScript strictness, test coverage, error handling, Zod validation, shared types
**Methodology:** tsconfig review, `any`/`as` grep, test file inventory, route handler pattern review, error code audit
**Classification:** P1 = Untested critical paths / type safety gaps / inconsistent patterns, P2 = Test smells / unused codes / style debt

---

## P1 Findings (High)

### Q-01: Extremely Low Test Coverage in Frontend Apps
- **Files:** `apps/storefront/`, `apps/dashboard/`
- **Severity:** P1
- **Description:**
  | App | Source Files | Test Files | Coverage (by file) |
  |-----|-------------|-----------|-------------------|
  | Storefront | 206 | 16 | ~7.7% |
  | Dashboard | 242 | 8 | ~3.3% |
  | Backend | 192 | 31 | ~16.1% |
- **Impact:** UI regressions, API client breakages, and state management bugs are not caught in CI. The dashboard has almost no unit tests.
- **Recommendation:** Add Vitest + jsdom/vitest-browser to dashboard and storefront. Prioritize testing: API clients (`apiFetch`, `api.client.ts`), auth state, cart stores, checkout flow, and critical page `load` functions.

### Q-02: Many Critical Backend Modules Have Zero Tests
- **Files:** `apps/backend/src/modules/`
- **Severity:** P1
- **Description:** The following backend modules have **no test files** at all:
  - `upload/` (file validation, S3/local logic)
  - `webhook/` service (business logic, delivery, signature)
  - `email.service.ts`
  - `imageProcessor.service.ts`
  - `backup/` service
  - `abandonedCartProcessor.service.ts`
  - `cache.service.ts`
  - `queue.service.ts`
  - `superAdmin/superAdmin.service.ts`
  - `billing/` routes & service
  - `shipping/` routes
  - `tax/` routes
  - `currency/` routes
  - `ticket/` routes
  - `notifications/` routes & service
  - `gdpr/` routes
  - `address/` routes & service
  - `newsletter/` routes
  - `seo/` routes & service
  - `bundle/` routes
- **Impact:** Business-critical paths (payments, webhooks, emails, backups) are not validated in CI.
- **Recommendation:** Add tests for at minimum: upload validation, webhook delivery & retry, email queue job, payment intent creation, and checkout price verification.

### Q-03: `err: any` in Production Route Handler
- **File:** `apps/backend/src/modules/webhook/webhook.route.merchant.ts:44`
- **Severity:** P1
- **Status:** **Already Fixed**
- **Description:** The webhook route handler catches errors with `err: any`, disabling TypeScript's strict error typing. The global error handler in `index.ts` already maps error codes to status codes, so route-level catch blocks should use a typed error interface.
- **Impact:** Type safety regression. Future refactors may miss type changes in error handling.
- **Fix:** The webhook route now defines a `TypedError` interface (`extends Error { code: string }`) and uses `catch (err: unknown)` followed by `const typedErr = err as TypedError` for safe narrowing.

### Q-04: `hook: any` in Webhook Worker
- **File:** `apps/backend/src/index.ts:112`
- **Severity:** P1
- **Status:** **Already Fixed**
- **Description:** The BullMQ webhook worker destructures `job.data` and casts `hook` to `any`. This bypasses type checking for the entire webhook delivery job.
- **Impact:** Type safety regression in a critical background job.
- **Fix:** A `WebhookJobData` TypeScript interface is defined in `index.ts` with typed fields for `hook`, `event`, and `payload`. The worker casts `job.data` to `WebhookJobData` instead of `any`.

### Q-05: Inconsistent Error Handling Patterns Across Routes
- **Files:** Multiple route files
- **Severity:** P1
- **Status:** **Already Fixed**
- **Description:** Error handling is inconsistent:
  - Some routes catch errors locally and map to HTTP status codes (webhook routes, auth routes).
  - Some routes throw directly and rely on the global error handler (payment merchant routes, product routes).
  - The `consent.route.public.ts` manually checks `request.storeId` in every route handler with duplicated boilerplate.
- **Impact:** Maintenance burden, inconsistent API behavior, risk of missing error mappings.
- **Fix:**
  1. A centralized `requireStoreId` validation hook is added to the public scope `onRequest` hook, eliminating duplicated store checks in individual routes.
  2. The global error handler in `index.ts` now maps all known `ErrorCodes` to appropriate HTTP status codes, making direct throws safe and consistent across routes.

### Q-06: Missing Explicit Return Types on Exported Service Functions
- **Files:** `apps/backend/src/modules/*/*.service.ts`, `apps/backend/src/modules/*/*.repo.ts`
- **Severity:** P1
- **Status:** **Partially Fixed**
- **Description:** Most exported service and repo functions rely on TypeScript inference for return types. While `strict: true` catches many issues, missing explicit return types means:
  - API contract changes are not visible in diffs.
  - Consumers may silently break when implementation details change.
  - IntelliSense provides complex inferred types instead of clean interfaces.
- **Impact:** API contracts are implicit. Refactors are riskier.
- **Fix:** Added explicit return types to all `authRepo` and `authService` functions using `typeof table.$inferSelect`, `Awaited<ReturnType<typeof authRepo.fn>>`, and `NonNullable` where applicable. Pattern extended to `orderRepo`, `orderService`, `productRepo`, `productService`, and `paymentRepo`. Remaining modules (shipping, analytics, superAdmin, etc.) to follow.

### Q-07: `as string` Type Assertion in Consent Route Instead of Narrowing
- **File:** `apps/backend/src/modules/consent/consent.route.public.ts:27,52,77`
- **Severity:** P1
- **Status:** **Already Fixed**
- **Description:** `request.storeId as string` is used three times instead of proper type narrowing (`if (!request.storeId) return ...`). This is a type-safety anti-pattern that could mask undefined values.
- **Impact:** Potential runtime errors if `storeId` is undefined but cast to string.
- **Fix:** All `as string` casts have been removed. The public scope now validates `request.storeId` in a centralized `onRequest` hook before any route handler runs, making narrowing unnecessary in individual routes.

---

## P2 Findings (Medium/Low)

### Q-08: Backend Tests Use `as any` Excessively for Mocking
- **Files:** `apps/backend/src/modules/*/*.test.ts`
- **Severity:** P2
- **Description:** Most backend tests cast mocked services/repos to `as any` to bypass Drizzle's complex query-builder types. Examples: `pricing.service.test.ts`, `return.route.merchant.test.ts`, `auth.route.superAdmin.test.ts`.
- **Impact:** Tests don't verify type contracts. Mock drift won't be caught by TypeScript.
- **Recommendation:** Create typed mock factories (`createMockProductRepo(): jest.Mocked<typeof productRepo>`) using `vi.mocked()` with proper generics instead of `as any`.

### Q-09: Unused Error Codes in ErrorCodes Enum
- **File:** `apps/backend/src/errors/codes.ts`
- **Severity:** P2
- **Status:** **False Positive**
- **Description:** Initial audit flagged `ORDER_NOT_FULFILLED`, `UPGRADE_NOT_ALLOWED`, `ALREADY_ON_PLAN`, and `RETURN_UNAUTHORIZED` as unused.
- **Verification:** All four codes are actively referenced:
  - `ORDER_NOT_FULFILLED` → `return.service.ts:33`
  - `UPGRADE_NOT_ALLOWED` → `billing.service.ts:62`
  - `ALREADY_ON_PLAN` → `billing.service.ts:54`
  - `RETURN_UNAUTHORIZED` → `return.route.customer.ts:56`, `return.service.ts:26`
- **Impact:** None.
- **Recommendation:** No action needed.

### Q-10: `noUnusedLocals` / `noUnusedParameters` Enabled in Backend Only
- **Files:** `apps/backend/tsconfig.json:17-18`, `apps/storefront/tsconfig.json`, `apps/dashboard/tsconfig.json`
- **Severity:** P2
- **Status:** **Already Fixed**
- **Description:** Backend tsconfig enables `noUnusedLocals` and `noUnusedParameters`, but storefront and dashboard do not. This leads to dead imports and unused variables in frontend code.
- **Impact:** Dead code accumulation, larger bundles, reduced readability.
- **Fix:** Both `apps/storefront/tsconfig.json` and `apps/dashboard/tsconfig.json` have both flags set to `true`.

### Q-11: Missing E2E Coverage for Critical User Flows
- **Files:** `apps/storefront/e2e/`, `apps/dashboard/e2e/`
- **Severity:** P2
- **Status:** **Partially Fixed**
- **Description:** E2E tests exist for auth (register, login, forgot-password) and merchant publish, but critical flows are missing:
  - Checkout complete flow (add to cart → shipping → payment → confirmation)
  - Merchant order management (update status, refund)
  - Product CRUD in dashboard
  - Payment webhook simulation
  - SuperAdmin merchant approval flow
- **Impact:** Critical user journeys are not validated end-to-end.
- **Fix:** Added merchant order status update E2E test in `dashboard/e2e/specs/merchant/orders.spec.ts`. Checkout complete flow and product CRUD tests already exist. Payment webhook simulation and SuperAdmin approval flow remain.

### Q-12: `db/index.ts` Not Reviewed for Pool Configuration
- **File:** `apps/backend/src/db/index.ts`
- **Severity:** P2
- **Description:** Not directly visible in this audit, but the database connection pool is not exposed in env config (see P-13 in Performance Audit). The `db/index.ts` file may use default pool settings.
- **Impact:** Potential connection pool exhaustion under load.
- **Recommendation:** Review `db/index.ts` and add pool size / idle timeout / connection timeout configuration.

---

## Summary

| Severity | Count |
|----------|-------|
| P1 | 7 |
| P2 | 5 |
| **Total** | **12** |

**Immediate action:** Q-01 and Q-02 (test coverage) are the biggest risks for long-term maintainability. Q-03 and Q-04 (`any` in production) are quick wins that improve type safety immediately.

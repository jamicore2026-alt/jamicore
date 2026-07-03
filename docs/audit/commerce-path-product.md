# Commerce-Path Audit — product (+ pricing)

**Date:** 2026-07-02
**Module:** `apps/backend/src/modules/product` + `apps/backend/src/modules/pricing`
**Auditor method:** Approach A deep vertical trace (route → scope → service → repo → schema → tests), checklist C1–C10.

## Summary

| Severity | Count | Status |
|---|---|---|
| P0 | 1 | FIXED |
| P1 | 0 | — |
| P2 | 5 | backlogged |

Commerce path starts green: typecheck 0 errors, 993 tests pass (full suite, no regression).

## P0 — FIXED

### PROD-P0-1: Public product responses leaked merchant-internal fields

**Files:** `product.route.public.ts:34-44,59-69,84-93` · `product.repo.ts:66-85,24-64` · `product.service.ts`

**Failure scenario:** An anonymous buyer calls `GET /api/v1/public/products` or `GET /api/v1/public/products/:id`. The routes return the raw Drizzle row from `productRepo.findById` / `findByStoreId`, which use `findFirst`/`findMany` with **no `columns` restriction**, so the response includes `purchasePrice` (the merchant's cost — reveals margin to buyers/competitors), `storeId` (tenant id), `inventoryAlertThreshold` (merchant ops config), and `deletedAt` (soft-delete tombstone).

This is the same leak class flagged P0 in `docs/audit/2026-04-30-full-audit.md` finding 11.3 for `bundle.repo.ts` — it was fixed there but never extended to the product public routes.

**Fix:** Added `sanitizePublicProduct(product | product[])` to `product.service.ts` (blacklist-strips `purchasePrice`, `storeId`, `inventoryAlertThreshold`, `deletedAt`; non-mutating; handles single + array). Wired into all 3 public route handlers (list, search, detail). `findById`/`findByStoreId` cannot restrict columns because merchant routes legitimately need `purchasePrice`, so the sanitizer is the correct layer.

**Test:** Added `sanitizePublicProduct` unit suite (4 cases) to `product.service.test.ts` — asserts sensitive fields stripped, public fields kept, input not mutated, array handling. TDD: wrote failing test first, then implemented. All 4 pass.

**Verification:** typecheck 0 errors · full suite 993 passed (no regression) · no `console.log`/`any`/`require` introduced.

## P2 — Backlogged (see commerce-path-p2-backlog.md)

- **PROD-P2-1** `product.route.public.ts` — nested relations (`variants[].options[]`, `category`, `subcategory`) in public responses still carry their own `storeId` (tenant id). Low severity (tenant id is not PII/financial). Follow-up: extend sanitizer to strip `storeId` from nested relations.
- **PROD-P2-2** `product.route.merchant.ts:252-337` — bulk-import CSV parser is hand-rolled (no quoted-newline handling, `parseInt` without NaN guard, no row-length validation). Merchant-only (`products:write`), low risk, but brittle. Suggest replacing with a real CSV parser (`csv-parse`).
- **PROD-P2-3** `product.route.merchant.ts:42-62` — inline `preHandler` carries plan-limits business logic (not an auth hook). Cosmetic architecture drift vs "no inline preHandler" rule. Suggest moving to a named hook or a service call in the handler.
- **PROD-P2-4** `product/` — no integration test for the public product routes (`product.route.public.test.ts` does not exist). Only unit tests cover the service. Suggest adding fastify.inject integration tests asserting the public response shape (esp. that `purchasePrice` is absent — regression guard for PROD-P0-1 at the route level, not just the sanitizer).
- **PROD-P2-5** `pricing.service.ts:94-96,191-193` — inventory availability check is a read (`currentQuantity < quantity`), non-atomic vs the decrement that happens later in order creation. Authoritative atomic decrement lives in the order/checkout path (verified in Task 4/6). Not a product-module fix.

## Deferred with rationale

- None beyond the P2 list above.

## Checklist results

| Dim | Result |
|---|---|
| C1 storeId-from-JWT | PASS — every route uses `request.storeId`; repo filters by storeId everywhere |
| C2 tenant isolation | PASS — `findById`/`findByStoreId`/all repo methods filter by storeId; product not yet RLS-enabled (deferred to catalog RLS rollout) |
| C3 Zod strictObject | PASS — all schemas use `z.strictObject()` |
| C4 ErrorCodes | PASS — uses `ErrorCodes.*` |
| C5 server-side pricing | PASS — `pricingService` computes all prices from DB; client sends only productId/qty/variantOptionIds |
| C6 inventory atomicity | PARTIAL — `decrementVariantOptionStock` is atomic (conditional WHERE); pricing availability check is non-atomic (see PROD-P2-5, deferred to checkout/order) |
| C7 decimal handling | PASS — pricing uses `addDecimals`/`multiplyDecimalByInt`/`toCents`/`fromCents`; `Math.round` only on integer cents |
| C8 no leaks | PASS after fix — `purchasePrice`/`storeId`/etc. stripped from public; no `console.log`/`any`/`ownerEmail`/`ownerName` |
| C9 no inline preHandler | PARTIAL — merchant POST has inline plan-limits preHandler (PROD-P2-3) |
| C10 ESM/pnpm | PASS — ESM imports, no `require()` |

## Smoke
Not run (backend server not started this session). Unit + full-suite tests are the primary gate and are green.
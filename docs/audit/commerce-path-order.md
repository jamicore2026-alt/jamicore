# Commerce-Path Audit — order

**Date:** 2026-07-02
**Module:** `apps/backend/src/modules/order`
**Method:** Approach A deep vertical trace, checklist C1–C10.
**Files traced:** `order.schema.ts` · `order.route.public.ts` · `order.route.customer.ts` · `order.route.merchant.ts` · `order.route.superAdmin.ts` (skim) · `order.service.ts` · `order.repo.ts` · `_shared/schema.ts` · `db/schema.ts` (orders/order_items).

## Summary

| Severity | Count | Status |
|---|---|---|
| P0 | 0 | — |
| P1 | 0 | — |
| P2 | 4 | backlogged |

No new P0/P1. All previously-fixed order P0/P1s re-verified intact.

## P0/P1 — none new

## Re-verified (already fixed — all intact)

- **Order-number collision retry (P0 from `audit_2026_05_01`):** `create` wraps insert in a 3-attempt loop; on PG `23505` / `orders_order_number_unique` it regenerates `generateOrderNumber()` (`Date.now().toString(36)` + 4 random bytes) and retries. The whole `withTenant` tx is re-run, so a collision at `insertOrder` rolls back items/cart-clear/coupon-increment — no double coupon increment on retry. Throws after MAX_RETRIES.
- **Cart-clear store scoping (P1-M3):** `create` clears the cart only after `orderRepo.findCartByIdScoped(data.cartId, data.storeId, tx)` confirms the cart belongs to THIS store — a customer passing another tenant's `cartId` cannot wipe it.
- **Atomic coupon increment with limit (P1):** `orderRepo.incrementCouponUsage` runs inside the tx; 0 rows → `COUPON_USAGE_EXCEEDED`. Combined with the order-number retry, coupon increment is single-per-order.
- **COD oversell (P1 from `rls_phase1_orders` memory):** public order route's COD path calls `intentService.createPaymentIntent(storeId, order.id, 'cod')` which decrements atomically with a 0-row guard; on `INSUFFICIENT_INVENTORY` it throws, the intent tx rolls back (no stock reserved, paymentStatus still unpaid), and the route best-effort cancels the orphan order and surfaces 400. Card oversell at the webhook warns + still completes (customer already charged). No path silently drives inventory negative.
- **Cancel does NOT restore inventory (P1-M1):** `updateStatus('cancelled')` is blocked for paid orders (`ORDER_ALREADY_PAID`) and fulfilled orders; unpaid cancellable orders never reserved stock under the decrement-at-payment model, so restoring would inflate quantities. Paid-order stock restoration goes through the return/refund flow (Task 7).
- **RLS wrapping (memory `rls_phase1_orders`):** all 5 order-service methods (`findByStoreId`, `findByCustomerId`, `findById`, `create`, `updateStatus`) wrap every DB op in `withTenant(storeId, ...)`; orders + order_items RLS-enabled (migrations 0025). `findOrderItemsByOrderId` rides the tx (was bare-db → would return [] under order_items-RLS → silent under-decrement; fixed).
- **No `purchasePrice` leak (C8):** `order.repo.findById` batch-loads products with `columns: { id, titleEn, titleAr, images }` only; `customer` restricted to `{ id, email, firstName, lastName, phone, storeId }` (no password hash). Order responses carry only order-line `price`/`total` (the prices the customer paid), never merchant cost.
- **Server-side pricing on the guest path:** `order.route.public.ts` re-derives `subtotalCents` from DB-loaded `salePrice` (exact cents equality via `toCents`, no float/0.01 tolerance) and rejects `PRICE_MISMATCH` if the client `total`/`price` disagree.
- **Customer ownership:** `order.route.customer.ts` scopes list by `customerId` and checks `order.customerId === request.customerId` on detail (403 otherwise).

## P2 — Backlogged

- **ORD-P2-1** `order.route.public.ts:73` — `product.salePrice || product.purchasePrice || '0'` falls back to merchant COST (`purchasePrice`) for the customer-charged price. Unreachable today (`salePrice` is `decimal().notNull()`, always non-empty truthy), but if `salePrice` were ever falsy the customer would be charged cost → margin loss + indirect cost exposure. Drop the `purchasePrice` fallback.
- **ORD-P2-2** `order.route.customer.ts:32-39` — `findById` loads the full order into memory before the ownership check returns 403; same-store cross-customer load (not sent — no leak; RLS is per-tenant not per-customer). Push `customerId` into the repo query for defense-in-depth + to avoid the wasted load.
- **ORD-P2-3** `order.route.public.ts /track` — no `rateLimit`; guest tracking by `orderNumber+email` is enumerable. Order numbers are unguessable, so low risk; add a rate limit for defense-in-depth.
- **ORD-P2-4** `order.route.merchant.ts` GET `/` + `/:id` — no `orders:read` permission gate; any store staff can list/view all in-store orders. Store-scoped (not cross-tenant); writes gated by `orders:write`. Add `orders:read` if role-based read restriction is desired.

## Checklist results

| Dim | Result |
|---|---|
| C1 storeId-from-JWT | PASS — merchant/customer routes use `request.storeId`/`request.customerId`; public guest route uses Host-resolved `request.storeId` |
| C2 tenant isolation / RLS | PASS — every order/order_items op inside `withTenant(storeId, ...)`; orders + order_items RLS-enabled; all repo queries filter by storeId |
| C3 Zod strictObject | PASS — `publicOrderSchema`/`publicOrderItemSchema`/`merchantListQuerySchema`/`updateStatusSchema` + shared `idParamSchema`/`paginationQuerySchema` all `z.strictObject()` |
| C4 ErrorCodes | PASS — `ORDER_NOT_FOUND`/`ORDER_CANCELLED`/`ORDER_ALREADY_PAID`/`ORDER_ALREADY_FULFILLED`/`COUPON_USAGE_EXCEEDED`/`PRODUCT_NOT_FOUND`/`PRICE_MISMATCH`/`INSUFFICIENT_INVENTORY`/`INSUFFICIENT_PERMISSIONS`/`VALIDATION_ERROR`; no bare strings |
| C5 server-side pricing | PASS — guest route re-derives totals from DB `salePrice` (exact cents) and rejects mismatch; `orderService.create` receives server-computed `subtotal`/`total` from checkout's `computeOrderPricing` |
| C6 inventory atomicity | PASS — decrement-at-payment (card webhook + COD intent), 0-row oversell guard; cancel does not restore (correct under the model) |
| C7 decimal handling | PASS — `toCents`/`fromCents`/`multiplyDecimalByInt`/`decimalsEqual`; decimal columns; no float math |
| C8 no leaks | PASS — `findById` restricts product + customer columns; no `purchasePrice`/password in responses |
| C9 no inline preHandler | PASS — merchant status route uses `requirePermission('orders:write')` from `scopes/merchant.ts`; no inline preHandler |
| C10 ESM/pnpm | PASS — ESM imports, no `require()` |

## Smoke
Not run (backend server not started this session). Full suite + typecheck are the primary gate and are green (modulo the pre-existing `cart_coupons.rls.test.ts` teardown flake).
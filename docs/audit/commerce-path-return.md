# Commerce-Path Audit — return / refund

**Date:** 2026-07-02
**Module:** `apps/backend/src/modules/return` + `apps/backend/src/modules/payment/payment.refund.service.ts`
**Method:** Approach A deep vertical trace, checklist C1–C10.
**Files traced:** `return.schema.ts` · `return.route.customer.ts` · `return.route.merchant.ts` · `return.service.ts` · `return.repo.ts` · `payment.refund.service.ts` · `product/product.repo.ts` (decrement/restore variant stock) · `order/order.repo.ts` (decrement/restore inventory) · `db/schema.ts` (returns/returnItems/orderItems).

## Summary

| Severity | Count | Status |
|---|---|---|
| P0 | 0 | — |
| P1 | 2 | FIXED |
| P2 | 2 | backlogged |

## P1 — FIXED

### RETURN-P1-1: Refund did not restore variant-option stock (variant availability drifted down permanently)

**Files:** `return.service.ts` (`processRefund`) · `product/product.repo.ts` (no restore counterpart to `decrementVariantOptionStock`)

**Failure scenario:** The decrement-at-payment path (`payment.webhook.service.ts` card webhook + `payment.intent.service.ts` COD intent) decrements BOTH `productVariantOptions.stockQuantity` (when the order item has a `variantId`) AND `products.currentQuantity`. The refund path `processRefund` only called `orderRepo.restoreInventory(productId, ...)` (product-level). For a variant product return, the variant option's stock was NEVER restored — so every returned variant permanently reduced that variant's available stock. Over time, returned variants showed as out-of-stock despite the physical item being back on the shelf. The data needed to fix it was already loaded (`returnRepo.findByIdWithItems` loads `items: { with: { orderItem: true } }`, and `orderItem: true` carries `variantId`).

**Fix:** Added `productRepo.restoreVariantOptionStock(variantOptionId, storeId, quantity, tx)` — the symmetric counterpart to `decrementVariantOptionStock` (`stockQuantity + quantity`, storeId-scoped, no `>= quantity` guard since restore is additive and single-restore is enforced by the status transition). `processRefund` now calls it for each returned item whose `orderItem.variantId` is set, in addition to the product-level restore. Variant + product restore mirror the variant + product decrement 1:1.

### RETURN-P1-2: Concurrent refund calls could double-restore inventory (restore ran before the idempotency guard)

**File:** `return.service.ts` (`processRefund`)

**Failure scenario:** `processRefund` restored inventory and THEN called `returnRepo.transitionStatus(inspected → refunded)` as the idempotency guard. The guard returns 0 rows when a concurrent call already moved the return out of `inspected` — but the inventory restore had already executed and committed in the loser's transaction, so two concurrent `updateStatus('refunded')` calls for the same return restored stock TWICE → inflated inventory above its true level. The M4 doc comment claimed the guard protected the refund side-effects, but the ordering made that false for the restore.

**Fix:** Reordered `processRefund` so the atomic `transitionStatus(inspected → refunded)` runs FIRST. Only the call that wins the transition (returns the updated row) proceeds to restore inventory; the 0-row loser returns the current row WITHOUT restoring. Single-restore guaranteed. The provider refund API call remains outside the tx (no lock across network I/O) and remains deduped by the `refund-${returnId}` idempotency key; the restore + status transition remain in one tx (atomic). Updated the M4 doc comment to match the new ordering.

**Tests (TDD, both bugs):** Added 2 cases to `return.service.withTenant.test.ts` (mocked):
1. "restores variant-option stock when the order item has a variantId" — asserts `productRepo.restoreVariantOptionStock` AND `orderRepo.restoreInventory` are both called with the sentinel tx. Failed red before the fix (no variant restore existed).
2. "does NOT restore inventory when transitionStatus returns 0 rows (concurrent already refunded — no double restore)" — `transitionStatus` mocked to `undefined` (0 rows); asserts NEITHER `restoreInventory` NOR `restoreVariantOptionStock` is called. Failed red before the fix (`restoreInventory` was called 1× despite the 0-row transition — the double-restore bug).
Also added `productRepo` to the hoisted mock set + `vi.mock('../product/product.repo.js')` so the new import is stubbed.

**Verification:** typecheck 0 errors · withTenant suite 7/7 · return+product+order suites 317/317 · full suite 1003/1003 (the pre-existing `cart_coupons.rls.test.ts` flake passed this run) · no `console.log`/`any`/`require` introduced.

## Re-verified (already fixed — all intact)

- **M4 refund actually issues refund + restores inventory:** `updateStatus('refunded')` dispatches to `processRefund` (not just stamping `refundedAt`). Card payments → `refundService.refundPayment` with `refund-${returnId}` idempotency key (provider dedupes retries). COD / no completed payment → skip provider call, still restore inventory.
- **Cumulative refund cap (P1-M4):** `refundService.refundPayment` sums `returns.refundAmount` (status='refunded') and caps at `payment.amount − alreadyRefunded`. `processRefund` now persists `refundAmount`/`refundMethod`/`refundTransactionId` on the return via the transition, so the cumulative tracker stays accurate.
- **Return quantity vs purchased (C3):** `createReturn` sums already-returned quantities per order item across prior returns and rejects `alreadyReturned + qty > orderItem.quantity` with `VALIDATION_ERROR`.
- **Order-item belongs-to-order (C2):** `createReturn` validates every `orderItemId` against the target order's items.
- **Ownership:** customer route passes `customerId`; service checks `order.customerId === customerId` (`RETURN_UNAUTHORIZED`); customer get-return checks `ret.customerId === request.customerId` (403); list scoped by `customerId`.
- **State machine:** `updateStatus` enforces `validTransitions` (requested→approved/rejected/cancelled, approved→received/cancelled, received→inspected, inspected→refunded/rejected, terminal states locked).
- **Refund amount math:** `computeRefundAmount` uses integer-cent math (`toCents(multiplyDecimalByInt(unitPrice, qty))`), no floats.
- **RLS wrapping:** `createReturn`/`listReturns`/`getReturn`/`processRefund` wrap orders/order_items reads in `withTenant(storeId, ...)`; `returns` has no RLS this phase (repo reads bare, storeId-filtered).

## P2 — Backlogged

- **RET-P2-1** Concurrent refunds for TWO DIFFERENT returns on the same order: both read `alreadyRefunded = 0` (neither return is `refunded` yet) and both call the provider with DIFFERENT idempotency keys (`refund-<returnA>` vs `refund-<returnB>`), so the provider does not dedupe across returns. The local cumulative cap is a non-atomic read-then-write. The provider (Stripe/Razorpay) is the hard guard — it rejects a refund that would push cumulative refunds above the payment amount, so no over-refund occurs; the loser gets a 400, throws, and the return stays `inspected` for retry. Could add `SELECT FOR UPDATE` on the payment row for a cleaner local rejection, but the provider guard makes it safe. (Documented in `refund.service.ts`.)
- **RET-P2-2** `return.route.merchant.ts` GET `/` + `/:id` — no `returns:read` permission gate; any store staff can list/view all in-store returns. Store-scoped (not cross-tenant); writes gated by `returns:write`. Add `returns:read` if role-based read restriction is desired. (Same shape as ORD-P2-4.)

## Checklist results

| Dim | Result |
|---|---|
| C1 storeId-from-JWT | PASS — customer/merchant routes use `request.storeId`/`request.customerId` |
| C2 tenant isolation / RLS | PASS — return/order/order_items ops inside `withTenant(storeId, ...)`; `returns` not RLS-enabled but every query storeId-filtered; order-item belongs-to-order validated |
| C3 Zod strictObject | PASS — `createReturnSchema`/`updateReturnStatusSchema`/`idParamSchema`/`listQuerySchema` + nested item schema all `z.strictObject()` |
| C4 ErrorCodes | PASS — `RETURN_UNAUTHORIZED`/`RETURN_NOT_FOUND`/`RETURN_INVALID_STATUS`/`ORDER_NOT_FULFILLED`/`ORDER_CANCELLED`/`ORDER_NOT_FOUND`/`COUPON_USAGE_EXCEEDED`/`VALIDATION_ERROR`/`INSUFFICIENT_PERMISSIONS`; no bare strings |
| C5 server-side pricing | PASS — refund amount is server-computed from stored `orderItem.price × returned qty` (never client-sent) |
| C6 inventory atomicity | PASS after fix — restore is single (atomic transition guard first); variant + product restore symmetric to decrement; COD/card oversell handled at payment |
| C7 decimal handling | PASS — `toCents`/`fromCents`/`multiplyDecimalByInt` for refund amount; no float math |
| C8 no leaks | PASS — return responses carry return/returnItem/order fields; no `purchasePrice`/password |
| C9 no inline preHandler | PASS — merchant status route uses `requirePermission('returns:write')` from `scopes/merchant.ts`; no inline preHandler |
| C10 ESM/pnpm | PASS — ESM imports, no `require()` |

## Smoke
Not run (backend server not started this session). Full suite (1003) + typecheck are the primary gate and are green.
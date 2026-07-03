# Commerce-Path Audit — checkout

**Date:** 2026-07-02
**Module:** `apps/backend/src/modules/checkout`
**Method:** Approach A deep vertical trace, checklist C1–C10.

## Summary

| Severity | Count | Status |
|---|---|---|
| P0 | 0 | — |
| P1 | 1 | FIXED |
| P2 | 0 | — |

## P1 — FIXED

### CHECKOUT-P1-1: Duplicate-`productId` checkout lines had their `modifiers` corrupted (find-by-productId instead of zip-by-index)

**File:** `checkout.route.customer.ts:42-58` (pre-fix)

**Failure scenario:** `checkoutSchema` allows two checkout lines with the **same `productId`** (same product, different variants — `variantOptionIds` differ, `productId` repeats). The order-items builder used `parsed.items.find((i) => i.productId === item.productId)` to attach each line's `modifiers` JSON. `find` returns the **first** matching element, so every line sharing a `productId` got the **first** line's `variantOptionIds` / `combinationKey` / `modifierOptionIds` written into `order_items.modifiers`. The second variant's order line recorded the first variant's selections — wrong fulfillment data, wrong stock variant decremented downstream, wrong audit trail.

This is safe to fix by zipping because `pricingService.computeOrderPricing` builds `pricing.items` 1:1 by index with the input `items` (`for (const item of items) { computedItems.push(itemPrice) }` at `pricing.service.ts:280-290`), so `pricing.items[idx]` corresponds exactly to `parsed.items[idx]`.

**Fix:** Replaced the `find`-by-productId lookup with a zip-by-index `pricing.items.map((item, idx) => { const inputItem = parsed.items[idx]; ... })`. `modifiers` now reads `inputItem.variantOptionIds` / `combinationKey` / `modifierOptionIds` from the correct line. The `hasModifiers` guard was broadened to also fire when only `variantOptionIds` or `combinationKey` are present (previously it only fired on `variantName` or `modifierOptionIds`, so a line with bare variant options and no resolved `variantName` would have silently dropped its `modifiers`).

**Test:** New `checkout.route.customer.test.ts` — mocks `orderService.create` and `fastify.pricingService` (via `fastify.decorate` so the decorator propagates into the encapsulated plugin), injects two lines with the same `productId` but different `variantOptionIds`, and asserts each order line's parsed `modifiers.variantOptionIds` equals its own selection. TDD: written first, confirmed it failed with `mods1.variantOptionIds === ['aaaaaaaa...']` (first line's value — the bug), then implemented the zip-by-index fix and confirmed it passes.

**Verification:** typecheck 0 errors · new test passes · full suite 995 passed + 6 skipped (1 file — `cart_coupons.rls.test.ts` — failed on pre-existing DB-residue teardown fragility, passes in isolation; unrelated to this change) · no `console.log`/`any`/`require` introduced.

## P2 — Backlogged

(none)

## Re-verified (already correct)

- **Server-side pricing (C5):** `checkoutSchema` accepts only `productId` / `quantity` / `variantOptionIds` / `combinationKey` / `modifierOptionIds` — NO price/total fields. All prices come from `fastify.pricingService.computeOrderPricing` (`subtotal`/`discount`/`shipping`/`tax`/`total`/per-item `effectivePrice`/`lineTotal`). Client cannot influence price.
- **No leaks (C8):** `orderService.create` returns via `orderService.findById` → `orderRepo.findById`, which batch-loads products with `columns: { id, titleEn, titleAr, images }` only (no `purchasePrice`). The created order returned to the customer carries no merchant cost.
- **storeId from JWT (C1):** `request.storeId` and `request.customerId` used throughout; never read from body.
- **Inventory atomicity (C6):** checkout does NOT decrement stock at order creation (decrement-at-payment model). Authoritative atomic conditional decrement is in the card webhook / COD intent path — covered in Task 5 (payment) and Task 6 (order).

## Checklist results

| Dim | Result |
|---|---|
| C1 storeId-from-JWT | PASS — `request.storeId` / `request.customerId` only |
| C2 tenant isolation / RLS | PASS — `orderService.create` wraps all DB ops in `withTenant(storeId, ...)`; orders/order_items RLS-enabled |
| C3 Zod strictObject | PASS — `checkoutSchema` + `checkoutItemSchema` both `z.strictObject()` |
| C4 ErrorCodes | PASS — route delegates to `orderService` which throws coded errors; no bare string error codes in route |
| C5 server-side pricing | PASS — no price/total in schema; all from `computeOrderPricing` |
| C6 inventory atomicity | N/A at checkout layer — no decrement here; authoritative atomic decrement in payment/order path |
| C7 decimal handling | PASS — prices flow as string decimals from pricing service; no float math in route |
| C8 no leaks | PASS — `create` returns via `findById` (restricted product columns) |
| C9 no inline preHandler | PASS — only `config.rateLimit` metadata, no inline preHandler |
| C10 ESM/pnpm | PASS — ESM imports, no `require()` |

## Smoke
Not run (backend server not started this session). Full suite + typecheck are the primary gate and are green (modulo the pre-existing RLS-test residue flake noted above).
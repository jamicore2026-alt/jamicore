# Commerce-Path Audit — cart

**Date:** 2026-07-02
**Module:** `apps/backend/src/modules/cart`
**Method:** Approach A deep vertical trace, checklist C1–C10.

## Summary

| Severity | Count | Status |
|---|---|---|
| P0 | 1 | FIXED |
| P1 | 0 | — |
| P2 | 2 | backlogged |

## P0 — FIXED

### CART-P0-1: Public cart responses leaked `purchasePrice` via nested product relation

**Files:** `cart.route.public.ts` (GET /, POST /items, PATCH /items/:itemId, DELETE /items/:itemId) · `cart.repo.ts:14` (`findCartById`)

**Failure scenario:** A guest or customer calls any public cart endpoint. `cartRepo.findCartById` loads the cart with `with: { items: { with: { product: true, bundle: { with: { items: { with: { product: true } } } } } } }`. `product: true` returns the **full product row**, so the response's `cart.items[].product.purchasePrice` (merchant cost) and `cart.items[].bundle.items[].product.purchasePrice` are exposed to anonymous buyers — same leak class as PROD-P0-1, via the cart's nested relation rather than the product route. The product sanitizer added in Task 2 did not cover this path.

**Fix:** Added `sanitizePublicCart(cart)` + `sanitizePublicCartItem(item)` to `cart.service.ts`. They strip:
- cart top level: `storeId`, `sessionId`, `customerId`
- each item: `storeId`
- each `item.product` and `item.bundle.items[].product`: delegated to `sanitizePublicProduct` (strips `purchasePrice`, `storeId`, `inventoryAlertThreshold`, `deletedAt`)
- `item.bundle.storeId` and `item.bundle.items[].storeId`

Both are non-mutating and tolerate `undefined` (carts/items can be undefined). Wired into all 4 public route handlers.

**Test:** New `cart.sanitize.test.ts` (8 cases) — asserts top-level strip, nested `item.product.purchasePrice` strip, `item.bundle.items[].product.purchasePrice` strip, item `storeId` strip, public fields kept, non-mutation, undefined-safe, no-items grace. TDD: failing first, then implemented. Also updated 5 existing assertions in `cart.route.public.test.ts` that previously asserted the raw (leaking) shape `toEqual({ cart: mockCart })` → now assert the sanitized shape via the real sanitizers. Both route-test mocks updated to `vi.mock(..., importOriginal)` so the pure-function sanitizers pass through while `cartService` stays mocked.

**Verification:** typecheck 0 errors · full suite 1000 passed · no `console.log`/`any`/`require` introduced.

## P2 — Backlogged

- **CART-P2-1** `cart.route.public.ts` — `request.customerId` is never populated on public routes (only `scopes/customer.ts:84` sets it). The 4 ownership guards (`if (request.customerId && cart.customerId && ...)`) are therefore dead defense-in-depth. Cart auth is the httpOnly `cartId` cookie, so severity is low, but the intended "logged-in customer's cart can't be operated by a different session" guard does not fire. Suggest the public scope optionally read a customer JWT cookie and set `request.customerId` when present.
- **CART-P2-2** `cart.route.public.ts:42-48 vs 87-93` — `sameSite` cookie flag is inconsistent: `strict` on GET /, `lax` on POST /items. Pick one (likely `lax` so cross-site POST flows work, or `strict` everywhere if the storefront is same-site).

## Re-verified (already fixed)

- **mergeCartOnLogin else-if (commit 022ac34 / memory `rls_phase1_cart_coupons`):** the `else if (guestCart && !customerCart)` branch (adopt guest cart as customer's first cart) returns `scheduleFor: undefined` so it does NOT schedule abandoned-cart recovery; only the merge branch sets `scheduleFor: customerCart.id` and schedules once OUTSIDE the withTenant tx. Correct — no regression.

## Checklist results

| Dim | Result |
|---|---|
| C1 storeId-from-JWT | PASS — all ops use `request.storeId`; repo filters by storeId |
| C2 tenant isolation / RLS | PASS — every carts/cart_items op inside `withTenant(storeId, ...)`; carts+cart_items RLS-enabled (migration 0026); `findCartById` filters by storeId |
| C3 Zod strictObject | PASS — `addItemSchema`/`updateItemSchema`/`itemIdParamSchema` all `z.strictObject()` |
| C4 ErrorCodes | PASS — `ErrorCodes.CART_NOT_OWNED`/`CART_NOT_FOUND`/`CART_ITEM_NOT_FOUND` |
| C5 server-side pricing | PASS — `addItem` computes price via `pricingService.computeItemPrice`; `updateItemQuantity` recomputes from the stored server-verified `item.price` (never client-sent) |
| C6 inventory atomicity | N/A at cart layer — cart-add does a read availability check (`currentQuantity < qty`), does NOT decrement stock; authoritative atomic decrement is in order creation (Task 4/6). `decrementVariantOptionStock` in product.repo is atomic. |
| C7 decimal handling | PASS — `multiplyDecimalByInt` for line totals |
| C8 no leaks | PASS after fix — `purchasePrice`/`storeId`/`sessionId`/`customerId` stripped from public cart responses; no `console.log`/`any` |
| C9 no inline preHandler | PASS — no inline preHandler in cart routes |
| C10 ESM/pnpm | PASS — ESM imports, no `require()` |

## Smoke
Not run (backend server not started this session). Full suite (1000) + typecheck are the primary gate and are green.
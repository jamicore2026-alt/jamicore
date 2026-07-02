# Commerce-Path Audit — payment

**Date:** 2026-07-02
**Module:** `apps/backend/src/modules/payment`
**Method:** Approach A deep vertical trace, checklist C1–C10.
**Files traced:** `payment.schema.ts` · `payment.route.public.ts` · `payment.route.customer.ts` · `payment.route.merchant.ts` · `payment.service.ts` · `payment.provider.service.ts` · `payment.intent.service.ts` · `payment.webhook.service.ts` · `payment.refund.service.ts` · `payment.repo.ts` · `lib/encryption.ts` · `db/schema.ts` (payments).

## Summary

| Severity | Count | Status |
|---|---|---|
| P0 | 0 | — |
| P1 | 0 | — |
| P2 | 4 | backlogged |

No new P0/P1 found. All previously-fixed P0s in this module (from audits `audit_2026_05_01` / `audit_2026_05_01_v2`) were re-verified intact.

## P0/P1 — none new

## Re-verified (already fixed — all intact)

- **Provider keys encrypted at rest (P0 from `audit_2026_05_01`):** `lib/encryption.ts` uses AES-256-GCM with a random 12-byte IV and auth tag; key from `PAYMENT_CONFIG_ENCRYPTION_KEY` (validated 32 bytes). `configureProvider` encrypts via `encryptConfig` before `upsertProvider`. Legacy plaintext fallback is REMOVED — `decryptConfig` throws on non-string (plaintext) configs, forcing migration. Merchant `GET /providers` returns `decryptAndMaskProvider` → keys masked to `****<last4>`. No plaintext key reaches any response.
- **Webhook idempotency (P0/P1 from `audit_2026_05_01`):** two layers. (1) Fast path: `if (payment.status === 'completed') return` before any write. (2) Atomic: `transitionPaymentToCompleted` updates with `ne(payments.status, 'completed')` → returns 0 rows when a concurrent webhook already completed; the handler then skips all order/inventory writes. No read-then-write TOCTOU on completion.
- **Atomic inventory decrement at payment (P0 from `audit_2026_05_01`):** decrement-at-payment model confirmed. Card path decrements inside the `withTenant` tx at `payment.captured` / `payment_intent.succeeded`; COD path decrements inside the intent tx at intent creation (COD is "paid" immediately). Both use `decrementVariantOptionStock` / `decrementInventory` conditional UPDATEs with a 0-row oversell guard. Card oversell → `logger.warn` + still complete (customer already charged; throwing would make the provider retry forever). COD oversell → throw `INSUFFICIENT_INVENTORY` → tx rolls back (caller cancels the orphan order).
- **Cumulative refund cap (P1-M4 from `audit_2026_06_02_p1_fixes`):** `refundPayment` sums `returns.refundAmount` where `status='refunded'` and caps the new refund at `payment.amount − alreadyRefunded`. Prevents the prior over-refund-via-two-returns bug. Provider (Stripe/Razorpay) is the hard concurrent guard; local check rejects the non-concurrent case (documented in code).
- **Refund idempotency:** caller-supplied `idempotencyKey` (e.g. `refund-<returnId>`) sent as `Idempotency-Key` header to Stripe/Razorpay so a retry after crash does not double-refund at the provider.
- **Customer ownership (P1-M2):** `payment.route.customer.ts` verifies `order.customerId === request.customerId` before intent and before status check — a logged-in customer cannot pay or inspect another customer's order.
- **Webhook signature verification:** HMAC-SHA256 with `crypto.timingSafeEqual` (constant-time) for both providers; raw body preserved via an encapsulated content-type parser. Store isolation enforced by looking up the payment with `providerPaymentId AND storeId` AND verifying against that store's `webhook_secret` — Host spoofing alone cannot forge a webhook without the target store's secret.
- **`payments_order_id_unique`** constraint (schema line 1134): one payment row per order. Together with the `existing`-status check in `createPaymentIntent`, this makes concurrent duplicate intents impossible (the second insert violates the constraint and rolls back) — no double-decrement via duplicate card intents.

## P2 — Backlogged

- **PAY-P2-1** Stripe webhook has no timestamp freshness / replay-window check (`verifyStripeSignature` parses `t=` but never compares it to current time). A captured valid `(payload, signature)` can be replayed indefinitely. Idempotency neutralizes duplicate *processing*, but replay still forces redundant DB round-trips. Razorpay's signature scheme carries no timestamp — replay protection there is solely the idempotency layer (document this).
- **PAY-P2-2** `refund.service.ts` refund-result persistence overwrites `payments.metadata` entirely instead of merging; multiple partial refunds leave only the last in metadata, and prior capture metadata is clobbered. Authoritative cumulative tracking is in `returns`, so informational only.
- **PAY-P2-3** Public webhook handlers perform the payment-lookup DB read BEFORE signature verification; an unauthenticated caller who knows a valid `providerPaymentId` can trigger a store-scoped read per request (rate-limited 60/min). Verify-first to reject forged payloads before any DB work.
- **PAY-P2-4** No expiry/retry path for a `processing` card payment whose webhook never arrives — order stuck `pending`, customer cannot re-intent (unique constraint + `processing` fast-path returns the stale row). Add intent expiry/refresh or admin force-fail.

## Checklist results

| Dim | Result |
|---|---|
| C1 storeId-from-JWT | PASS — merchant/customer routes use `request.storeId`/`request.customerId`; public webhook uses Host-resolved `request.storeId` + signature |
| C2 tenant isolation / RLS | PASS — RLS not yet enabled on `payments` (Phase 1 scope), but EVERY payment query filters by `storeId` (findPaymentById/ByOrderId/Completed, transitionPaymentToCompleted, updatePaymentStatus, refund select, webhook findFirst). Defense-in-depth via explicit filters. |
| C3 Zod strictObject | PASS — `configureProviderSchema`, `createPaymentIntentSchema`, `idempotencyKeySchema`, `orderIdParamSchema` all `z.strictObject()` |
| C4 ErrorCodes | PASS — `PAYMENT_FAILED`/`PAYMENT_PROVIDER_NOT_ENABLED`/`PAYMENT_ALREADY_PROCESSED`/`ORDER_NOT_FOUND`/`INSUFFICIENT_INVENTORY`/`VALIDATION_ERROR`/`INSUFFICIENT_PERMISSIONS`/`PAYMENT_TRANSIENT_ERROR`; no bare strings |
| C5 server-side pricing | N/A — payment uses `order.total` (already server-computed at checkout) as the amount; never trusts client amount |
| C6 inventory atomicity | PASS — atomic conditional decrement at card webhook + COD intent; 0-row oversell guard; card warns+completes, COD throws+rolls back |
| C7 decimal handling | PASS — `toCents(amount)` for provider API amounts; decimal `amount`/`total` columns; no float math |
| C8 no leaks | PASS — provider keys encrypted+masked; `getPaymentStatus` returns only safe payment fields; no `purchasePrice` |
| C9 no inline preHandler | PASS — merchant route uses `requirePermission('payments:config')` from `scopes/merchant.ts` (named hook), no inline preHandler |
| C10 ESM/pnpm | PASS — ESM imports, no `require()` |

## Smoke
Not run (backend server not started this session). Full suite (995+6 skip, pre-existing RLS-test flake) + typecheck are the primary gate and are green.
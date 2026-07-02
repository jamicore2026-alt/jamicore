# Commerce-Path Audit — P2 Backlog

P2 findings (non-blocking) collected during the 2026-07-02 vertical audit of the
commerce path (product → cart → checkout → payment → order → return).

Append one entry per finding. Format:

`- [module] file:line — summary — suggested fix`

(No entries yet.)

## product (+ pricing)

- [product] product.route.public.ts — nested relations (variants/options/category) still carry their own `storeId` in public responses (tenant id leak, low severity) — extend `sanitizePublicProduct` to strip `storeId` from nested relations.
- [product] product.route.merchant.ts:252-337 — hand-rolled CSV parser in bulk-import (no quoted-newline handling, no NaN guard on parseInt, no row-length validation) — replace with `csv-parse`.
- [product] product.route.merchant.ts:42-62 — inline `preHandler` carries plan-limits business logic — move to a named hook or service call in handler.
- [product] product/ — no integration test for public product routes — add `product.route.public.test.ts` asserting public response shape incl. absence of `purchasePrice`.
- [product] pricing.service.ts:94-96,191-193 — inventory availability check is a non-atomic read vs the later decrement — verify authoritative atomic decrement in order/checkout path (covered in Task 4/6).

## cart

- [cart] cart.route.public.ts — `request.customerId` never populated on public routes → 4 ownership guards are dead defense-in-depth; suggest public scope optionally read customer JWT cookie to set `request.customerId`.
- [cart] cart.route.public.ts:42-48 vs 87-93 — `sameSite` cookie flag inconsistent (`strict` on GET, `lax` on POST); pick one.

## checkout

(none — see `docs/audit/commerce-path-checkout.md`; the one P1 (duplicate-productId modifiers) was fixed inline.)

## payment

- [payment] payment.webhook.service.ts:345-376 — Stripe webhook signature is verified without a timestamp freshness / replay-window check; a captured valid `(payload, signature)` pair can be replayed indefinitely. Add a `t=` age check (reject events older than ~5 min) per Stripe best practice. (Razorpay's signature scheme carries no timestamp, so replay protection there relies entirely on the existing `transitionPaymentToCompleted` idempotency, which already neutralizes duplicate processing — document this.)
- [payment] payment.refund.service.ts:105-114,147-156 — refund-result persistence OVERWRITES `payments.metadata` entirely (`set({ metadata: { refundId, refundedAt, refundAmount } })`); for multiple partial refunds only the last is reflected in metadata, and any prior capture metadata is clobbered. Merge into existing metadata instead. Authoritative cumulative refund tracking lives in the `returns` table, so impact is informational/audit only.
- [payment] payment.route.public.ts:117-145,202-228 — webhook handlers do the payment-lookup (DB read) BEFORE verifying the signature; an unauthenticated caller who knows a valid `providerPaymentId` can trigger a store-scoped DB read per request (rate-limited 60/min). Verify the signature first to reject forged payloads before any DB work.
- [payment] payment.intent.service.ts — no expiry/retry path for a `processing` card payment whose webhook never arrives; the order stays `pending` indefinitely and the customer cannot create a new intent (the `payments_order_id_unique` constraint + `existing.status === 'processing'` returns the stale row). Add a payment-intent expiry/refresh flow or an admin force-fail action.
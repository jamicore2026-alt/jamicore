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
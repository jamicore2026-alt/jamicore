# Commerce-Path Vertical Audit → Production-Ready

**Date:** 2026-07-02
**Branch:** `fix/domain-feature-p0` (PR #16)
**Method:** Approach A — per-feature deep vertical trace, sequential, single agent
**Deliverable:** Audit + fix P0/P1 inline, P2 backlog

## Goal

Make the critical commerce path of jamicore production-ready by auditing each feature
**vertically** (route → scope → service → repo → schema → tests) and fixing all P0/P1
findings inline, against a fixed checklist, one module at a time.

## Scope

6 modules, audited in dependency order:

| # | Module | Why this order |
|---|---|---|
| 1 | product | Pricing base, inventory, foundation everything else reads from |
| 2 | cart | Session/tenant state, merge-on-login race (known I1 fix already in) |
| 3 | checkout | Orchestrates pricing + inventory + payment; highest risk |
| 4 | payment | Money flow, webhook idempotency, key encryption |
| 5 | order | Fulfillment, status transitions; RLS just enabled |
| 6 | return/refund | Money-back flow, least exercised, last |

### Out of scope

- RLS rollout for catalog/stores (separate in-flight work; customers/carts/orders/coupons/wishlists already done).
- Frontend (SvelteKit dashboard/storefront).
- The other ~37 backend modules outside the commerce path.
- The ~45 pre-existing P1 audit findings outside the commerce path — unless they intersect a module being audited, in which case they are re-verified and fixed as part of that module.

## Per-Module Workflow

For each module, in order:

1. **Read the full slice:** `routes/*` → `scopes/*` hook → `service` → `repo` → `schema` → `tests`.
2. **Audit against the fixed checklist** (below).
3. **Cross-check against prior audit findings** — skip already-closed items; re-verify any finding that touches this module.
4. **Fix P0/P1 inline**, commit per module (or per fix-group if fixes are small and cohesive).
5. **Log P2** to `docs/audit/commerce-path-p2-backlog.md` — do not fix now.
6. **Verify:** run the module's tests + `pnpm typecheck` + a curl smoke for a behavior check.
7. **Write findings doc:** `docs/audit/commerce-path-<module>.md`.
8. **Update** `PROGRESS.md` with module outcome.

## Audit Checklist

Every module is checked for all of:

| Dimension | Rule |
|---|---|
| Authz + storeId | `storeId` from `request.user` (JWT) only — never from body/query/params |
| Tenant isolation / RLS | Every query filtered by storeId; RLS enabled where applicable; `withTenant` used; `dbAdmin`/`dbOwner` for cross-tenant ops |
| Body validation | `z.strictObject()` on every route body — rejects unknown keys |
| Error handling | `ErrorCodes.*` codes, no bare string literals |
| Server-side pricing | All prices computed from DB at checkout; never trust client-sent prices |
| Inventory atomicity | Decrement/increment atomic; no oversell races (esp. COD, webhooks, concurrent carts) |
| Decimal handling | No float math on money; use cents/decimal columns |
| No leaks | No `console.log`, no `any`, no sensitive fields (ownerEmail/ownerName) in public responses |
| No inline preHandler | Hooks in `scopes/*` only |
| ESM / pnpm | No `require()`; pnpm only |

## Acceptance Bar (per module)

- `pnpm typecheck` → 0 errors
- No new `console.log` or `any` introduced
- Module tests green
- All P0/P1 findings fixed, or explicitly deferred with documented rationale
- Per-module findings doc written

## Git

- All work on `fix/domain-feature-p0` (PR #16), same branch as the in-flight RLS work.
- Commit per module. The 7 existing unpushed RLS commits stay as-is.
- Do not push or amend unless explicitly asked. Never force-push.

## Deliverables

1. `docs/audit/commerce-path-<module>.md` — per-module findings (×6)
2. Inline P0/P1 fixes committed on `fix/domain-feature-p0`
3. `docs/audit/commerce-path-p2-backlog.md` — P2 findings deferred
4. Final summary in `docs/PROGRESS.md`

## Starting State (verified 2026-07-02)

- Branch `fix/domain-feature-p0`, 7 commits ahead of origin, unpushed.
- RLS enabled on: wishlists, orders, order_items, carts, cart_items, coupons, coupon_usages, customers, customer_addresses.
- 989 tests green with RLS ON.
- ~43 backend modules; commerce path = product, cart, checkout, payment, order, return.
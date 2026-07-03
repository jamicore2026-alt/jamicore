# Commerce-Path Vertical Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make jamicore's critical commerce path (product → cart → checkout → payment → order → return) production-ready by auditing each feature vertically and fixing all P0/P1 findings inline.

**Architecture:** Sequential per-module deep vertical trace. For each module: read the full slice (route → scope hook → service → repo → schema → tests), apply a fixed 10-point checklist, fix P0/P1 inline with TDD where a bug is reproducible, log P2 to a backlog, verify with typecheck + module tests + a curl smoke, write a per-module findings doc, commit.

**Tech Stack:** Fastify v5, Drizzle ORM, PostgreSQL 17, Redis (ioredis), Zod, Vitest, pnpm (only), TypeScript strict ESM.

## Global Constraints

- pnpm ONLY — never npm.
- Zero TypeScript errors (`pnpm typecheck`).
- storeId from JWT (`request.user`) only — never from body/query/params.
- Server-side pricing — never trust client-sent prices.
- `z.strictObject()` on every route body.
- JWT in httpOnly cookie — never in response body.
- `ErrorCodes.*` — no bare string literals.
- No `console.log` (use `fastify.log.*`), no `any`, no `require()`.
- No inline preHandler — hooks in `scopes/*` only.
- Tenant isolation: every query filtered by storeId; RLS where enabled; `withTenant` for tenant-scoped reads/writes; `dbAdmin`/`dbOwner` for cross-tenant ops.
- Decimal money — no float math.
- Commits on `fix/domain-feature-p0` only. Commit per module. Do not push or amend unless asked.
- 7 existing unpushed RLS commits stay untouched.

## Shared Audit Procedure (apply to every module task)

Each module task below runs this procedure. The task supplies the file slice, the high-risk focus, and prior findings to re-verify; the procedure is the step sequence.

**P1 — Read the slice:** Read every file listed in the task's *Files* block, top to bottom.

**P2 — Apply each checklist dimension** (see Checklist below). For each dimension, run the listed grep/Read and inspect. Record findings as P0/P1/P2 in the findings doc draft with `file:line`, failure scenario, fix.

**P3 — Re-verify prior findings:** Open each prior-audit finding listed in the task's *Prior findings to re-verify* block against current code. If still open and in this module, fix it. If already closed, note "closed" and move on.

**P4 — Fix P0/P1:** For each P0/P1 finding:
- If the bug is reproducible in a test, write a failing test first (TDD): add a case to the module's `*.test.ts` or `*.withTenant.test.ts`, run it, confirm FAIL.
- Implement the minimal fix.
- Run the test, confirm PASS.
- If not reproducible in a test (e.g. missing Zod `strictObject`, wrong error code, leak of sensitive field), apply the fix directly and rely on typecheck + module tests + curl smoke.
- Never fix P2 in this plan — log only.

**P5 — Verify module:**
- `pnpm --filter backend typecheck` → 0 errors.
- `Select-String -Path "apps/backend/src/modules/<module>" -Pattern "console\.log" -Recurse` → no new matches.
- Run the module's tests (command in each task).
- Curl smoke (command in each task) — requires Docker up (Postgres + Redis) and the backend running on `:3000`. If the backend isn't running, note "smoke skipped — Docker/backend down" and proceed; the test run is the primary gate.

**P6 — Write findings doc:** `docs/audit/commerce-path-<module>.md` with sections: Summary · P0 (fixed) · P1 (fixed) · P2 (backlogged) · Deferred-with-rationale · Smoke result.

**P7 — Commit:** `git add` the changed source + tests + findings doc + PROGRESS.md; commit with message `fix(audit): <module> vertical audit — <count> P0/P1 fixed`.

**P8 — Update PROGRESS.md:** Append a dated section summarizing the module.

### Checklist (dimensions + inspection commands)

| # | Dimension | What to check | Inspection command |
|---|---|---|---|
| C1 | storeId-from-JWT | every service/repo call uses storeId from `request.user`, never body/query | `grep -rn "storeId" module/` ; read each route handler |
| C2 | Tenant isolation / RLS | query `.where(eq(...storeId,...))`; `withTenant` wraps; cross-tenant uses dbAdmin/dbOwner | `grep -rn "withTenant\|dbAdmin\|dbOwner\|set_config" module/` |
| C3 | Zod strictObject | every `body:`/`querystring:` schema is `z.strictObject(...)` | `grep -rn "z\.object\|z\.strictObject\|strictObject" module/` |
| C4 | ErrorCodes | no bare string error codes; uses `ErrorCodes.*` | `grep -rn "code:" module/` ; `grep -rn "'FORBIDDEN'\|'VALIDATION_ERROR'\|'NOT_FOUND'" module/` |
| C5 | Server-side pricing | prices/totals computed from DB, client-sent prices ignored | `grep -rn "price\|total\|amount\|subtotal" module/` |
| C6 | Inventory atomicity | stock decrement/increment in a tx, no oversell under concurrency | `grep -rn "transaction\|for update\|update(...set(stock" module/` ; read repo tx tests |
| C7 | Decimal handling | money as integer cents / decimal column, no `*` `/` on floats | `grep -rn "Math\.\|toFixed\|\* 100\|/ 100" module/` |
| C8 | No leaks | no `console.log`, no `any`, no ownerEmail/ownerName in public responses | `grep -rn "console\.log\|: any\|ownerEmail\|ownerName" module/` |
| C9 | No inline preHandler | hooks in `scopes/*`, not inline `preHandler:` in routes | `grep -rn "preHandler" module/` |
| C10 | ESM / pnpm | no `require(`, ESM imports | `grep -rn "require(" module/` |

---

## Task 1: Baseline — confirm starting state is green before auditing

**Files:**
- Read: `docs/superpowers/specs/2026-07-02-commerce-path-vertical-audit-design.md`
- Read: `docs/PROGRESS.md` (last 3 sections)
- Create: `docs/audit/commerce-path-p2-backlog.md`

**Interfaces:**
- Produces: a green baseline (typecheck + commerce-path module tests) recorded in PROGRESS, and an empty P2 backlog file that later tasks append to.

- [ ] **Step 1: Confirm branch + unpushed state**

Run: `git status -sb | head -3`
Expected: `## fix/domain-feature-p0...origin/fix/domain-feature-p0 [ahead 7]`

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter backend typecheck`
Expected: 0 errors.

- [ ] **Step 3: Run commerce-path module tests (baseline)**

Run:
```bash
pnpm --filter backend test -- product cart checkout payment order return
```
Expected: all pass (or skip with known environmental reason). Record the pass count.

- [ ] **Step 4: Create empty P2 backlog**

Write `docs/audit/commerce-path-p2-backlog.md`:
```markdown
# Commerce-Path Audit — P2 Backlog

P2 findings (non-blocking) collected during the 2026-07-02 vertical audit.
Append one entry per finding. Format:
`- [module] file:line — summary — suggested fix`

(No entries yet.)
```

- [ ] **Step 5: Record baseline in PROGRESS.md**

Append to `docs/PROGRESS.md`:
```markdown
## 2026-07-02: Commerce-Path Vertical Audit (branch fix/domain-feature-p0)

### Baseline
- Branch: fix/domain-feature-p0, 7 ahead of origin (unpushed RLS work — untouched).
- typecheck: 0 errors.
- Commerce-path tests: <recorded count> passed.
- Audit scope: product → cart → checkout → payment → order → return.
- Spec: docs/superpowers/specs/2026-07-02-commerce-path-vertical-audit-design.md
- Plan: docs/superpowers/plans/2026-07-02-commerce-path-vertical-audit.md
```

- [ ] **Step 6: Commit baseline**

```bash
git add docs/audit/commerce-path-p2-backlog.md docs/PROGRESS.md docs/superpowers/specs/2026-07-02-commerce-path-vertical-audit-design.md docs/superpowers/plans/2026-07-02-commerce-path-vertical-audit.md
git commit -m "docs(audit): commerce-path vertical audit spec + plan + baseline"
```

---

## Task 2: Module — product (pricing base, inventory)

**Files:**
- Read: `apps/backend/src/modules/product/product.route.public.ts`, `product.route.merchant.ts`, `product.service.ts`, `product.repo.ts`, `product.schema.ts`, `product.types.ts`
- Read: `apps/backend/src/modules/pricing/pricing.service.ts`, `pricing.repo.ts` (pricing is the shared server-side pricing engine the commerce path depends on)
- Read: `apps/backend/src/scopes/public.ts`, `scopes/merchant.ts` (hooks for product routes)
- Tests: `product.repo.test.ts`, `product.service.test.ts`, `product.schema.test.ts`, `product.route.merchant.test.ts`, `pricing.service.test.ts`

**High-risk focus:** C5 (server-side pricing — product price must be read from DB, never from client at checkout/listing), C6 (inventory: stock read/decrement atomicity, oversell under concurrent carts), C1 (storeId-from-JWT on merchant routes), C8 (ownerEmail/ownerName must not appear in public product responses).

**Prior findings to re-verify:**
- audit_2026_06_02: product-related QUAL/P2 findings (search `docs/audit/audit_2026_06_02.md` for "product").
- audit_2026_06_26_production_readiness.md: any product findings.

**Interfaces:**
- Produces: `docs/audit/commerce-path-product.md` findings doc; inline P0/P1 fixes; P2 entries appended to `commerce-path-p2-backlog.md`.

- [ ] **Step 1: Run the Shared Audit Procedure P1–P3** for the files listed above.

- [ ] **Step 2: Run C1–C10 inspection commands** (grep column) against `apps/backend/src/modules/product` and `apps/backend/src/modules/pricing`. Record findings.

- [ ] **Step 3: Re-verify prior findings** listed above. Mark each closed/open/in-this-module.

- [ ] **Step 4: Fix P0/P1 (P4)** — TDD where reproducible. For each fix: add/modify a test, confirm FAIL, implement, confirm PASS.

- [ ] **Step 5: Verify module (P5)**

Run:
```bash
pnpm --filter backend typecheck
pnpm --filter backend test -- product pricing
```
Expected: 0 typecheck errors; tests pass.
Smoke (if backend up): `curl -s http://localhost:3000/api/v1/public/products | head -c 200` → JSON product list, no ownerEmail/ownerName.

- [ ] **Step 6: Write findings doc (P6)** → `docs/audit/commerce-path-product.md`

- [ ] **Step 7: Append P2 entries** to `docs/audit/commerce-path-p2-backlog.md`

- [ ] **Step 8: Update PROGRESS.md (P8)** — append product section with counts.

- [ ] **Step 9: Commit (P7)**

```bash
git add -A
git commit -m "fix(audit): product vertical audit — <N> P0/P1 fixed"
```

---

## Task 3: Module — cart (session/tenant state, merge-on-login race)

**Files:**
- Read: `apps/backend/src/modules/cart/cart.route.public.ts`, `cart.service.ts`, `cart.repo.ts`, `cart.schema.ts`, `cart.types.ts`
- Read: `apps/backend/src/scopes/public.ts`, `scopes/customer.ts` (cart routes may span public + customer)
- Tests: `cart.repo.tx.test.ts`, `cart.route.public.test.ts`, `cart.route.public.withTenant.test.ts`, `cart.schema.test.ts`, `cart.service.withTenant.test.ts`, `cart_coupons.rls.test.ts`

**High-risk focus:** C6 (merge-on-login race — the I1 `else-if` scheduling regression was already fixed at 022ac34; re-verify it's still correct), C2 (cart is RLS-enabled — verify `withTenant` usage and that guest→customer merge is atomic and tenant-correct), C1 (storeId), C5 (cart prices come from DB product, not client).

**Prior findings to re-verify:**
- `rls_phase1_cart_coupons` memory: mergeCartOnLogin else-if fix (commit 022ac34) — re-verify still correct.
- audit_2026_06_02: cart findings.

**Interfaces:** Produces `docs/audit/commerce-path-cart.md`.

- [ ] **Step 1: P1–P3** for the files above.
- [ ] **Step 2: Run C1–C10** against `apps/backend/src/modules/cart`.
- [ ] **Step 3: Re-verify** mergeCartOnLogin else-if + prior cart findings.
- [ ] **Step 4: Fix P0/P1 (P4, TDD).**
- [ ] **Step 5: Verify (P5)**

```bash
pnpm --filter backend typecheck
pnpm --filter backend test -- cart
```
Smoke: `curl -s http://localhost:3000/api/v1/public/cart` (or customer cart) → JSON, no ownerEmail.

- [ ] **Step 6: findings doc** → `docs/audit/commerce-path-cart.md`
- [ ] **Step 7: append P2**
- [ ] **Step 8: update PROGRESS.md**
- [ ] **Step 9: commit** `fix(audit): cart vertical audit — <N> P0/P1 fixed`

---

## Task 4: Module — checkout (orchestrates pricing + inventory + payment; highest risk)

**Files:**
- Read: `apps/backend/src/modules/checkout/checkout.route.customer.ts`, `checkout.schema.ts`
- Read (the services checkout orchestrates): `apps/backend/src/modules/pricing/pricing.service.ts`, `apps/backend/src/modules/order/order.service.ts`, `apps/backend/src/modules/payment/payment.service.ts`, `payment.intent.service.ts`
- Read: `apps/backend/src/scopes/customer.ts`
- Tests: there is no `checkout.test.ts`; verify coverage via `order.service.test.ts`, `pricing.service.test.ts`, `payment.service.test.ts`. If checkout has no direct test, note this as a P1/P2 gap (missing test coverage for the orchestrator) and add one in Step 4.

**High-risk focus:** C5 (checkout MUST compute pricing server-side — `fastify.pricingService.computeOrderPricing` — and ignore any client-sent totals; verify `pricing.items`/`subtotal`/`total` all come from the server computation, client payload only supplies product id + qty), C6 (inventory decrement atomic within the order-creation tx — no oversell if two checkouts race), C2 (order created with correct storeId), C3 (`checkoutSchema` is `z.strictObject`).

**Prior findings to re-verify:**
- audit_2026_05_01: order-number collision, atomic inventory (these were fixed — re-verify the fixes survive in checkout's path).
- audit_2026_06_26_production_readiness.md: checkout findings.

**Interfaces:** Produces `docs/audit/commerce-path-checkout.md`.

- [ ] **Step 1: P1–P3** for the files above (read checkout route + the 3 services it calls).
- [ ] **Step 2: Run C1–C10** against `apps/backend/src/modules/checkout` and re-run C5/C6 against `order.service.ts` / `pricing.service.ts`.
- [ ] **Step 3: Re-verify** order-number-collision + atomic-inventory fixes are present in the checkout call path.
- [ ] **Step 4: Fix P0/P1 (P4, TDD).** If checkout has no direct test, add `checkout.route.customer.test.ts` covering: server-side pricing used, client totals ignored, storeId from JWT, Zod rejects unknown keys.
- [ ] **Step 5: Verify (P5)**

```bash
pnpm --filter backend typecheck
pnpm --filter backend test -- checkout order pricing payment
```
Smoke (if backend up): POST a checkout with a tampered `total` in body → response total must equal server-computed total, not the tampered one.

- [ ] **Step 6: findings doc** → `docs/audit/commerce-path-checkout.md`
- [ ] **Step 7: append P2**
- [ ] **Step 8: update PROGRESS.md**
- [ ] **Step 9: commit** `fix(audit): checkout vertical audit — <N> P0/P1 fixed`

---

## Task 5: Module — payment (money flow, webhook idempotency, key encryption)

**Files:**
- Read: `apps/backend/src/modules/payment/payment.route.customer.ts`, `payment.route.merchant.ts`, `payment.route.public.ts`, `payment.service.ts`, `payment.intent.service.ts`, `payment.provider.service.ts`, `payment.refund.service.ts`, `payment.webhook.service.ts`, `payment.repo.ts`, `payment.helpers.ts`, `payment.schema.ts`
- Read: `apps/backend/src/scopes/customer.ts`, `scopes/merchant.ts`, `scopes/public.ts` (webhook route is public — auth via signature, not JWT)
- Tests: `payment.service.test.ts`, `payment.route.public.test.ts`, `payment.route.public.withTenant.test.ts`, `payment.route.customer.withTenant.test.ts`, `payment.withTenant.test.ts`

**High-risk focus:** C5 (payment amount must match server-computed order total — never client amount), C6 (webhook idempotency — same webhook processed twice must not double-credit; verify idempotency key/processed-flag handling), security (payment provider API keys must be encrypted at rest, not plaintext — prior finding audit_2026_05_01 fixed; re-verify), webhook signature verification, C2 (webhook route is public-scope but must only act on verified events for the right store).

**Prior findings to re-verify:**
- audit_2026_05_01: plaintext payment keys (fixed — re-verify encryption), webhook inventory-oversell (fixed — re-verify).
- audit_2026_06_26_production_readiness.md: payment findings.

**Interfaces:** Produces `docs/audit/commerce-path-payment.md`.

- [ ] **Step 1: P1–P3** for the files above.
- [ ] **Step 2: Run C1–C10** against `apps/backend/src/modules/payment`.
- [ ] **Step 3: Re-verify** key-encryption + webhook-idempotency + webhook-oversell fixes.
- [ ] **Step 4: Fix P0/P1 (P4, TDD).** For idempotency: write a test that processes the same webhook event twice and asserts the side effect happens once.
- [ ] **Step 5: Verify (P5)**

```bash
pnpm --filter backend typecheck
pnpm --filter backend test -- payment
```
Smoke (if backend up): `curl -I http://localhost:3000/api/v1/public/payment/webhook` → 4xx (signature missing), not 500.

- [ ] **Step 6: findings doc** → `docs/audit/commerce-path-payment.md`
- [ ] **Step 7: append P2**
- [ ] **Step 8: update PROGRESS.md**
- [ ] **Step 9: commit** `fix(audit): payment vertical audit — <N> P0/P1 fixed`

---

## Task 6: Module — order (fulfillment, status transitions; RLS just enabled)

**Files:**
- Read: `apps/backend/src/modules/order/order.route.customer.ts`, `order.route.merchant.ts`, `order.route.public.ts`, `order.route.superAdmin.ts`, `order.service.ts`, `order.repo.ts`, `order.schema.ts`, `order.types.ts`
- Read: `apps/backend/src/scopes/customer.ts`, `scopes/merchant.ts`, `scopes/public.ts`, `scopes/superAdmin.ts`
- Tests: `order.repo.dbAdmin.test.ts`, `order.repo.tx.test.ts`, `order.route.merchant.test.ts`, `order.route.public.withTenant.test.ts`, `order.schema.test.ts`, `order.service.test.ts`, `order.service.withTenant.test.ts`, `orders.rls.test.ts`

**High-risk focus:** C2 (orders + order_items RLS just enabled at migration 0025 — verify every read path uses `withTenant` or dbAdmin correctly; superAdmin route must use dbAdmin to read cross-tenant), C6 (status transition atomicity — no double-fulfill / double-cancel under concurrency; verify tx around transitions), C1 (storeId from JWT on customer/merchant routes), C4 (ErrorCodes on all error paths), C8 (no sensitive owner fields in public order responses).

**Prior findings to re-verify:**
- `rls_phase1_orders` memory: orders+order_items RLS (migration 0025) — re-verify all 5 services + 4 routes still wrapped correctly.
- audit_2026_05_01: order-number collision fix, COD/webhook inventory-oversell latent fix — re-verify.
- audit_2026_06_26_production_readiness.md: order findings.

**Interfaces:** Produces `docs/audit/commerce-path-order.md`.

- [ ] **Step 1: P1–P3** for the files above.
- [ ] **Step 2: Run C1–C10** against `apps/backend/src/modules/order`.
- [ ] **Step 3: Re-verify** RLS wrapping (5 services + 4 routes) + order-number collision + COD oversell.
- [ ] **Step 4: Fix P0/P1 (P4, TDD).** For status-transition races: write a tx test asserting two concurrent fulfill calls yield exactly one fulfillment.
- [ ] **Step 5: Verify (P5)**

```bash
pnpm --filter backend typecheck
pnpm --filter backend test -- order
```
Smoke (if backend up): `curl -s http://localhost:3000/api/v1/public/orders/<id>` → 404 or sanitized response, no ownerEmail/ownerName, no cross-tenant leak.

- [ ] **Step 6: findings doc** → `docs/audit/commerce-path-order.md`
- [ ] **Step 7: append P2**
- [ ] **Step 8: update PROGRESS.md**
- [ ] **Step 9: commit** `fix(audit): order vertical audit — <N> P0/P1 fixed`

---

## Task 7: Module — return/refund (money-back flow, least exercised)

**Files:**
- Read: `apps/backend/src/modules/return/return.route.customer.ts`, `return.route.merchant.ts`, `return.service.ts`, `return.repo.ts`, `return.schema.ts`
- Read: `apps/backend/src/modules/payment/payment.refund.service.ts` (refund execution)
- Read: `apps/backend/src/scopes/customer.ts`, `scopes/merchant.ts`
- Tests: `return.repo.test.ts`, `return.repo.tx.test.ts`, `return.route.merchant.test.ts`, `return.service.test.ts`, `return.service.withTenant.test.ts`

**High-risk focus:** C5 (refund amount must not exceed paid amount; computed server-side), C6 (refund + stock-restock atomic in a tx; no double-refund on retry), C2 (return tied to correct storeId + order ownership — customer can only return their own order), C1 (storeId from JWT), C4 (ErrorCodes), C8 (no sensitive fields). This module is least exercised → highest chance of latent gaps.

**Prior findings to re-verify:**
- audit_2026_06_26_production_readiness.md: noted `return.repo.test.ts` / `return.service.test.ts` failed only due to Docker-down (ECONNREFUSED) — re-run with Docker up to confirm they're environmental, not code regressions.
- audit_2026_06_02: return findings.

**Interfaces:** Produces `docs/audit/commerce-path-return.md`.

- [ ] **Step 1: P1–P3** for the files above.
- [ ] **Step 2: Run C1–C10** against `apps/backend/src/modules/return` and re-run C5/C6 against `payment.refund.service.ts`.
- [ ] **Step 3: Re-verify** return test failures are environmental (Docker up) and any prior return findings.
- [ ] **Step 4: Fix P0/P1 (P4, TDD).** For double-refund: write a test asserting two refund calls on the same return yield one refund. For ownership: write a test asserting a customer cannot return another customer's order.
- [ ] **Step 5: Verify (P5)**

```bash
pnpm --filter backend typecheck
pnpm --filter backend test -- return
```
Smoke (if backend up): customer return on another tenant's order → 403/404, not 200.

- [ ] **Step 6: findings doc** → `docs/audit/commerce-path-return.md`
- [ ] **Step 7: append P2**
- [ ] **Step 8: update PROGRESS.md**
- [ ] **Step 9: commit** `fix(audit): return vertical audit — <N> P0/P1 fixed`

---

## Task 8: Final summary — full commerce-path re-verification + P2 backlog consolidation

**Files:**
- Modify: `docs/PROGRESS.md`
- Modify: `docs/audit/commerce-path-p2-backlog.md`

**Interfaces:** Produces the closing summary + a de-duplicated, prioritized P2 backlog.

- [ ] **Step 1: Full commerce-path typecheck**

Run: `pnpm --filter backend typecheck`
Expected: 0 errors.

- [ ] **Step 2: Full commerce-path test sweep**

Run:
```bash
pnpm --filter backend test -- product pricing cart checkout payment order return
```
Expected: all pass (or skip with documented environmental reason).

- [ ] **Step 3: No-leaks sweep across all 6 modules**

Run:
```bash
Select-String -Path "apps/backend/src/modules/product","apps/backend/src/modules/cart","apps/backend/src/modules/checkout","apps/backend/src/modules/payment","apps/backend/src/modules/order","apps/backend/src/modules/return","apps/backend/src/modules/pricing" -Pattern "console\.log|: any|require\(" -Recurse
```
Expected: no new matches introduced by this audit.

- [ ] **Step 4: Consolidate P2 backlog**

Open `docs/audit/commerce-path-p2-backlog.md`, de-duplicate entries, group by module, order by rough priority. Add a header count: `Total P2: <N>`.

- [ ] **Step 5: Write final summary in PROGRESS.md**

Append a closing section: per-module P0/P1 counts, total fixed, total P2 backlogged, smoke results, remaining risks, and a one-line production-readiness verdict for the commerce path.

- [ ] **Step 6: Commit**

```bash
git add docs/PROGRESS.md docs/audit/commerce-path-p2-backlog.md
git commit -m "docs(audit): commerce-path vertical audit complete — summary + P2 backlog"
```

---

## Self-Review Notes

- **Spec coverage:** Every spec section maps to a task — scope (Tasks 2–7), per-module workflow (Shared Procedure + Tasks 2–7), checklist (C1–C10 in Procedure), acceptance bar (P5 in every module + Task 8), git (Global Constraints + commit steps), deliverables (findings docs in Tasks 2–7, P2 backlog Task 1+8, PROGRESS Tasks 1–8). ✓
- **Placeholders:** `<N>` and `<count>` are filled at execution time from actual finding counts — intentional, not TODO placeholders. No "TBD"/"similar to Task N". ✓
- **Type consistency:** Procedure labels (P1–P8), checklist labels (C1–C10), file paths verified against the actual module listing. ✓
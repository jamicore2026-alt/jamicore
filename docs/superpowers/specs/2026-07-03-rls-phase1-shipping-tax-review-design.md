# RLS Phase 1 — shipping + tax + review Design Spec

## Goal
Enable PostgreSQL row-level security on the 4 remaining store-config/rating tables — `shipping_zones`, `shipping_rates`, `tax_rates`, `reviews` — and thread `withTenant(storeId, fn)` through every application read/write of them, so the database enforces tenant isolation independently of the application layer.

## Architecture
**Approach A (locked):** the service owns the transaction. Each service entry is wrapped in `withTenant(storeId, async (tx) => …)`; the `tx` is forwarded into every repo call. Repos gain an optional `tx?: DbOrTx` last parameter and use `const executor = tx ?? db;`. Seed inserts move to `dbOwner` (BYPASSRLS). This is the same primitive every prior RLS Phase 1 module uses (`withTenant` opens `db.transaction`, calls `set_config('app.tenant_id', storeId, true)` transaction-locally, forwards the tx).

**Policy shape:** all 4 tables are §4.1 direct — each has its own `store_id` column (`.notNull()`, references `stores.id`). The `tenant_iso` policy is NULLIF-hardened on both USING + WITH CHECK:
```sql
store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
```
An unset/NULL `app.tenant_id` yields `NULLIF('', '')::uuid = NULL`, so `store_id = NULL` is false for every row → fail-closed (zero rows) for any code path that forgets `withTenant`. No GRANT changes — `rls-roles.ts` grants DML on ALL tables in `public` generically, so migration `0030` carries only ENABLE/FORCE/policy.

## Tech Stack
Fastify v5, Drizzle ORM, PostgreSQL 17, Vitest, pnpm, TypeScript strict ESM. `DbOrTx = typeof db | Transaction` from `apps/backend/src/modules/_shared/db-types.ts`.

## Audit (table-level, per the catalog-phase lesson)

| Table | § | Own `store_id`? | Repo methods (bare `db` today) | Cross-module bare-`db` readers | Seeded? | Public route reads? |
|---|---|---|---|---|---|---|
| `shipping_zones` | 4.1 | yes (notNull) | shipping.repo ×7 | **none** | no | POST /calculate |
| `shipping_rates` | 4.1 | yes (notNull) | shipping.repo ×5 | **none** | no | POST /calculate (via zone relation) |
| `tax_rates` | 4.1 | yes (notNull) | tax.repo ×6 | **none** | no | POST /calculate |
| `reviews` | 4.1 | yes (notNull) | review.repo ×9 | 1 — `customer.repo.findFullProfileForExport` (already `executor = tx ?? db`, loads via Drizzle relation `with:{reviews:true}`, NOT bare-db) | **yes — `seed.ts:826` on bare `db`** | GET /product/:id |

**Cross-module check:** `pricing.service` calls `shippingService.calculateShipping` / `taxService.calculateTax` at the *service* boundary (mocked there in `pricing.service.test.ts`), never the tables directly. No checkout/cart/order module reads these 4 tables on bare `db`. The catalog-phase lesson (missed cross-module bare-db readers → merge blockers) does **not** bite here. The one cross-module reader of `reviews` already runs through `executor = tx ?? db` and loads via relation, so it rides through cleanly under the same tenant.

## Scope

### In scope (5 tasks)
1. **shipping** — `shipping.repo` 12 methods → `tx?: DbOrTx` + `executor = tx ?? db`; `shipping.service` 11 entries wrapped in `withTenant` (cache wrap stays outside, `withTenant` inside the cache loader for `calculateShipping`); update pre-existing `shipping.service.test.ts` (add `withTenant` mock + `mockTx` to assertions); add `shipping.service.withTenant.test.ts`.
2. **tax** — `tax.repo` 6 methods → tx-threaded; `tax.service` 6 entries wrapped (same cache pattern for `calculateTax`); update pre-existing `tax.service.test.ts`; add `tax.service.withTenant.test.ts`.
3. **review** — `review.repo` (`reviewRepo` object) 9 methods → tx-threaded; `review.service` 6 entries wrapped; add `review.service.withTenant.test.ts` (no pre-existing test to update). Relations to `customers`/`products` (already RLS) resolve under the same tenant.
4. **seed** — `seed.ts:826` reviews insert `db`→`dbOwner`.
5. **migration `0030`** + `shipping_tax_review.rls.test.ts` (real-DB, 6 cases × 4 tables: fail-closed, single-tenant, cross-tenant isolation, store-B visibility, WITH CHECK reject, WITH CHECK accept). Journal idx 31.

### Out of scope
- `stores` RLS (separate phase; `domain.repo` Phase 2a/2b prerequisite already DONE).
- `shipping.schema.ts`/`tax.schema.ts`/`review.schema.ts` (Zod route validation schemas — untouched).
- The customer route's in-memory `customerId` filter (`review.route.customer.ts:19`) — application-level ownership check on top of store-level RLS scoping; correct as-is.
- `coupon`/`cart`/`order` cross-module reads of `reviews` — none exist.

## Global Constraints
- pnpm ONLY (never npm). Zero TS errors (`pnpm --filter backend typecheck`).
- `storeId` from JWT/request.user (or Host header → `request.storeId` for public scope) — NEVER from body/query/params.
- `z.strictObject()` on route bodies (unchanged — no route body schemas touched).
- `ErrorCodes.*` (no bare string literals), no `console.log` (use `fastify.log.*`; seed.ts pre-existing progress lines exempt), no `any` in source (test files may use `as any` + eslint-disable header), no `require()` (ESM, `.js` extensions).
- Money/decimal: no float math (untouched here — shipping/tax calculation already uses `toCents`/`fromCents`).
- Approach A: service owns the tx; repos accept `tx?: DbOrTx` last.
- NULLIF-hardened `tenant_iso` policy, both USING + WITH CHECK, on all 4 tables.
- Migration `.sql` is gitignored → `git add -f`. Hand-written migration (no meta snapshot), journal idx 31, mirroring 0024–0029 convention.
- Commit only on user request; never push without explicit user request. Per-task commits are part of the approved TDD execution.

## Testing
- **Sentinel-tx withTenant tests** (3 new): mock `withTenant` to invoke `fn({ __sentinel: 'tx' })`; assert `withTenantMock(storeId)` AND each repo call received the sentinel tx. Pins both wrapping and tx threading.
- **Pre-existing test updates** (2): `shipping.service.test.ts` + `tax.service.test.ts` get the `withTenant` mock (`mockTx = { __sentinel: 'tx' }`) and every `toHaveBeenCalledWith` assertion gains `mockTx` as the final arg — exactly the `coupon.service.test.ts:21-28` pattern.
- **Real-DB RLS test** (1 new): `shipping_tax_review.rls.test.ts` mirrors `taxonomy.rls.test.ts` — connects as `app_tenant` via a dedicated `max:1` connection, seeds via `dbOwner`, asserts fail-closed / single-tenant / cross-tenant / store-B / WITH CHECK reject / WITH CHECK accept for all 4 tables, FK-respecting self-cleaning pre-pass + afterAll.
- **Full suite WITH RLS ON** is the load-bearing proof: every read/write path of the 4 tables must survive RLS enabled. Baseline before this phase = 1067 green.

## Risks
1. **Pre-existing exact-arg test assertions** — `shipping.service.test.ts` / `tax.service.test.ts` assert `toHaveBeenCalledWith('s1', data)` (2-3 args). After threading `tx`, calls gain a final `mockTx` arg → exact-match fails. Mitigation: add `withTenant` mock + append `mockTx` to each assertion (coupon pattern). Covered explicitly in Task 1/2.
2. **Cache + withTenant ordering** — `calculateShipping`/`calculateTax` wrap the repo read in `getCacheService().wrap(key, fn, ttl)`. The `withTenant` must run INSIDE the cache loader (`wrap(key, () => withTenant(storeId, tx => repo.findActive(storeId, tx)), ttl)`) so the cache key stays storeId-based and the DB read carries the tenant tx. The existing cache mock `wrap: (_key, fn) => fn()` calls `fn()` with no args → `withTenant` runs → repo receives tx. Verified compatible.
3. **`review.repo` is an object (`reviewRepo`), not standalone functions** — tx must be added as the last param on each method; the sentinel test mocks the object via `vi.hoisted` + `vi.mock('./review.repo.js', () => ({ reviewRepo }))`, mirroring `bundle.service.withTenant.test.ts`.
4. **`reviews` relations to `customers`/`products`** — both already have RLS. Under `withTenant(storeA)`, a review's `customer`/`product` relation rows belong to storeA, so they resolve. No extra filter needed (RLS handles it).
5. **`review.route.customer.ts` ownership check** — calls `reviewService.findById` then checks `review.customerId === request.customerId`. Two `withTenant` calls (findById, then update/delete). Same-tenant, correct. No change.

## Sequencing
Tasks are sequential (T1 → T5). Each task ends with a green covering test + typecheck + per-task commit. After T5: full suite WITH RLS ON, then final opus whole-branch review. No fix wave expected (no cross-module bare-db readers), but if the review returns Critical/Important findings, execute ONE fix wave inline (subagent dispatch may 429) and re-review.
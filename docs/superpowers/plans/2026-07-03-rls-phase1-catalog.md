# RLS Phase 1 — catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable PostgreSQL Row-Level Security on the four catalog tables (`products`, `product_variants`, `product_variant_options`, `product_variant_combinations`) so a missed `store_id` filter returns zero rows, not another tenant's data — defense-in-depth on top of the existing `where eq(storeId)` filters.

**Architecture:** All four tables carry their own `storeId notNull` → §4.1 direct `tenant_iso` policies (no §4.2 subquery). Wrap the two bare-`db` service layers (`product.service`, `pricing.service`) in `withTenant(storeId, fn)` (Approach A — the service owns the tx, checkout untouched), thread `tx` into `pricing.repo` + `cart.service`'s two direct `productRepo` calls, wrap `order.route.public`'s product-verification block, switch seed catalog inserts to `dbOwner`, then enable RLS via migration `0028`. Tasks 1–5 are pure refactor (RLS off → 1003-suite stays green); task 6 flips RLS on and adds the negative real-DB test.

**Tech Stack:** Fastify v5, Drizzle ORM, PostgreSQL 17, Vitest, pnpm (NEVER npm), TypeScript strict ESM.

## Global Constraints

- **pnpm ONLY** — never `npm install` / `npm run` / any npm command. Use `pnpm --filter backend <script>` or `pnpm -C apps/backend <script>`.
- **Zero TypeScript errors** — `pnpm --filter backend typecheck` must pass with 0 errors after every task.
- **storeId from JWT / `request.storeId` ONLY** — never from request body/query/params.
- **No `console.log`** — use `fastify.log.*` only (this phase touches no logging, so this is automatically satisfied).
- **No `any` type in new code** — existing tests use `/* eslint-disable @typescript-eslint/no-explicit-any */` for mock casts; keep that file-level disable where editing test files, do not introduce new `any` in source.
- **No `require()`** — ESM imports only (`.js` extension in relative imports).
- **No inline preHandler** — hooks in `scopes/*.ts` only (this phase adds none).
- **Zod `strictObject()`** on every route body (this phase changes no route body validation).
- **Decimal money via `lib/decimal.ts`** — no float math (this phase changes no money math).
- **Keep app-layer `where eq(storeId)` filters** as defense-in-depth — RLS is the second layer, not a replacement. Do NOT remove any existing `storeId` filter.
- **Migration `.sql` files are gitignored** → `git add -f` the migration file.
- **Commit only per-task** — do not push; do not amend. Branch is `fix/domain-feature-p0` (PR #16, not merged).
- **Test command:** `pnpm -C apps/backend test` runs the full suite. `pnpm -C apps/backend typecheck` for types. Individual file: `pnpm -C apps/backend test <path-or-pattern>` (note: Vitest positional filter args don't always filter — prefer `-t "test name substring"` or run the whole suite as the gate).

**Reference spec:** `docs/superpowers/specs/2026-07-03-rls-phase1-catalog-design.md` (read it first; this plan implements it).

**Key file paths:**
- `apps/backend/src/lib/withTenant.ts` — `withTenant(storeId, fn)` opens `db.transaction`, issues `set_config('app.tenant_id', storeId, true)` (tx-local), forwards tx to `fn`. Signature: `withTenant<T>(storeId: string, fn: (tx: DbOrTx) => Promise<T>): Promise<T>`.
- `apps/backend/src/modules/_shared/db-types.ts` — `export type DbOrTx = typeof db | Transaction;`
- `apps/backend/src/db/index.ts` — exports `db` (app_tenant client), `dbOwner` + `dbAdmin` (BYPASSRLS), `runMigrations()` (runs via `dbOwner`).
- `apps/backend/src/scripts/rls-roles.ts` — grants DML on **ALL TABLES** in `public` to `app_tenant`/`app_admin` generically (lines 45–51). The 4 catalog tables are already granted; migration `0028` carries ONLY `ENABLE`/`FORCE`/policy statements.
- `apps/backend/drizzle/meta/_journal.json` — migration journal; last entry is `idx: 28, tag: "0027_customers_rls"`. Add `idx: 29, tag: "0028_catalog_rls"`.

---

## File Structure

**Source files modified:**
- `apps/backend/src/modules/cart/cart.repo.ts` — audit only; thread `tx` into any bare `products` read/relation load (Task 1).
- `apps/backend/src/modules/order/order.repo.ts` — audit only; thread `tx` into any bare `products` read (Task 1).
- `apps/backend/src/modules/payment/payment.webhook.service.ts` — audit only; confirm `decrementVariantOptionStock` calls at `:172`/`:290` pass `tx` (Task 1).
- `apps/backend/src/modules/pricing/pricing.repo.ts` — add `tx?: DbOrTx` + `executor = tx ?? db` to all 6 methods (Task 2).
- `apps/backend/src/modules/cart/cart.service.ts` — thread `tx` into `productRepo.findManyByIds` (`:173`) and `productRepo.findById` (`:332`); update stale comments (Task 2).
- `apps/backend/src/modules/order/order.route.public.ts` — wrap product-verification block (`:49-89`) in `withTenant(storeId, …)` (Task 2).
- `apps/backend/src/modules/pricing/pricing.service.ts` — wrap `computeItemPrice` + `computeOrderPricing` in `withTenant(storeId, …)`, thread `tx` into all `pricingRepo` calls (Task 3).
- `apps/backend/src/modules/product/product.service.ts` — wrap all 12 entries in `withTenant(storeId, …)`, thread `tx` into `productRepo` calls (Task 4).
- `apps/backend/src/db/seed.ts` — switch 3 catalog inserts (`:447`, `:457`, `:466`) to `dbOwner` (Task 5).

**Source files created:**
- `apps/backend/drizzle/0028_catalog_rls.sql` — ENABLE+FORCE+policy on the 4 tables (Task 6).

**Test files created:**
- `apps/backend/src/modules/pricing/pricing.service.withTenant.test.ts` — sentinel-tx test (Task 3).
- `apps/backend/src/modules/product/product.service.withTenant.test.ts` — sentinel-tx test (Task 4).
- `apps/backend/src/modules/catalog/catalog.rls.test.ts` — real-DB RLS negative test (Task 6).

**Test files modified:**
- `apps/backend/src/modules/cart/cart.service.withTenant.test.ts` — assert `productRepo.findById`/`findManyByIds` receive sentinel tx (Task 2).
- `apps/backend/src/modules/order/order.route.public.withTenant.test.ts` — assert product-verification block runs inside `withTenant(storeId)` and `findManyByIds` receives tx (Task 2).
- `apps/backend/src/modules/pricing/pricing.service.test.ts` — add `withTenant` sentinel mock; update repo-call assertions to expect trailing tx (Task 3).
- `apps/backend/src/modules/product/product.service.test.ts` — add `withTenant` sentinel mock; update repo-call assertions to expect trailing tx (Task 4).
- `apps/backend/src/modules/product/product.route.merchant.test.ts` — add `withTenant` sentinel mock if it calls `productService` directly (Task 4; verify first).

---

### Task 1: Audit `cart.repo` + `order.repo` for bare `products` reads; verify payment webhook `tx`

**Files:**
- Audit (modify only if a bare read is found): `apps/backend/src/modules/cart/cart.repo.ts`, `apps/backend/src/modules/order/order.repo.ts`, `apps/backend/src/modules/payment/payment.webhook.service.ts`

**Interfaces:**
- Consumes: `DbOrTx` from `apps/backend/src/modules/_shared/db-types.ts` (repos already thread `tx?: DbOrTx` from prior phases).
- Produces: no API change. Confirms all `products`/`product_variants`/`product_variant_options`/`product_variant_combinations` reads inside `withTenant` blocks run on the threaded `tx` (not bare `db`), so they will be tenant-scoped under RLS.

**Why:** `cart.repo` and `order.repo` were tx-threaded in prior phases, but products had **no RLS then**, so a bare `db.query.products` / `products` relation load may linger inside a `withTenant` block (exactly as `cart.service` did — fixed in Task 2). `payment.webhook.service` decrement calls must pass `tx` for the decrement-at-payment path to stay tenant-scoped.

- [ ] **Step 1: Grep `cart.repo.ts` for `products` reads**

Run:
```bash
grep -n "products\|product" apps/backend/src/modules/cart/cart.repo.ts
```
Inspect every hit. For each method that already takes `tx?: DbOrTx` and does `const executor = tx ?? db;`: confirm any `products` read (e.g. a `with: { product: true }` relation load on cart items, or `executor.select().from(products)`) uses `executor` (or `executor.query.products`), **not** bare `db`. If a bare `db.query.products` / `db.select().from(products)` exists inside such a method, change it to `executor.query.products` / `executor.select().from(products)`.

If `cart.repo` has no `products` reads at all (possible — the `product` relation may be loaded by Drizzle automatically via the schema relation config on the cart items query), record that finding in the commit message and make no change.

- [ ] **Step 2: Grep `order.repo.ts` for `products` reads**

Run:
```bash
grep -n "from(products)\|query.products\|products\." apps/backend/src/modules/order/order.repo.ts
```
`restoreInventory` at `:297` already threads `tx` (verified — it updates `products.currentQuantity` via `executor`). Confirm there is **no other** bare `db.select().from(products)` / `db.query.products` inside a tx-threaded method. If one exists, switch it to `executor`. If none exists, make no change and note it in the commit message.

- [ ] **Step 3: Verify `payment.webhook.service.ts` decrement passes `tx`**

Run:
```bash
grep -n -A4 "decrementVariantOptionStock" apps/backend/src/modules/payment/payment.webhook.service.ts
```
Confirm the call at `:172` and `:290` is `productRepo.decrementVariantOptionStock(item.variantId, payment.storeId, item.quantity, tx)` — i.e. the 4th argument is the `tx` from the surrounding `withTenant` block (the orders phase wrapped `payment.webhook.service` in `withTenant(payment.storeId, async (tx) => …)`). `payment.intent.service.ts:94` already passes `tx` (verified).

If either webhook call is **missing** the `tx` arg, add it: `item.quantity, tx` (the surrounding `tx` is in scope — verify the variable name in that block). If both already pass `tx`, make no change.

- [ ] **Step 4: Typecheck + full suite (RLS still off → must stay 1003 green)**

Run:
```bash
pnpm -C apps/backend typecheck
pnpm -C apps/backend test
```
Expected: typecheck 0 errors; full suite green (1003 tests — or whatever the current count is; the key is no NEW failures vs. the baseline). If you made edits in steps 1–3, this confirms they are behavior-identical with RLS off.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/cart/cart.repo.ts apps/backend/src/modules/order/order.repo.ts apps/backend/src/modules/payment/payment.webhook.service.ts
git commit -m "refactor(rls): audit cart.repo/order.repo/payment webhook for tx-threaded catalog reads (Phase 1 prep)

Confirms products/variants reads inside withTenant blocks run on the threaded
tx (not bare db) so they stay tenant-scoped once catalog RLS is enabled.
[report what you found/fixed per file]. Behavior-identical with RLS off.

Co-Authored-By: Claude <noreply@anthropic.com>"
```
(Use `git commit -m "..."` with a single-quoted message on PowerShell, or the heredoc form in bash. If no files were modified, skip the commit and note the audit result in the Task 2 commit message instead.)

---

### Task 2: Thread `tx` into `pricing.repo`, `cart.service` direct product calls, and `order.route.public` product verification

**Files:**
- Modify: `apps/backend/src/modules/pricing/pricing.repo.ts` (all 6 methods)
- Modify: `apps/backend/src/modules/cart/cart.service.ts:170-171,173,310-313,332`
- Modify: `apps/backend/src/modules/order/order.route.public.ts:49-89`
- Modify (tests): `apps/backend/src/modules/cart/cart.service.withTenant.test.ts`, `apps/backend/src/modules/order/order.route.public.withTenant.test.ts`

**Interfaces:**
- Consumes: `DbOrTx` from `apps/backend/src/modules/_shared/db-types.js`; `withTenant` from `apps/backend/src/lib/withTenant.js`.
- Produces:
  - `pricingRepo.<method>(..., tx?: DbOrTx)` for all 6 methods (tx is the LAST arg, optional).
  - `cart.service` passes its `withTenant` `tx` into `productRepo.findManyByIds(ids, storeId, tx)` and `productRepo.findById(id, storeId, tx)`.
  - `order.route.public` wraps the product-verification block in `withTenant(storeId, async (tx) => …)`.

- [ ] **Step 1: Write failing test — `cart.service.withTenant.test.ts` asserts tx into productRepo**

Open `apps/backend/src/modules/cart/cart.service.withTenant.test.ts`. The file already mocks `withTenant` (sentinel tx), `cartRepo`, `productRepo` (findById + findManyByIds), and `pricingService`. Find the existing test(s) that call `addItem` / `mergeCartOnLogin` and assert `productRepo.findById` / `findManyByIds` were called. Add (or update) assertions so they expect the sentinel tx as the trailing arg.

Add this test (append to the existing `describe` block):

```typescript
  it('addItem threads the withTenant tx into productRepo.findById', async () => {
    const { cartService } = await import('./cart.service.js');
    await cartService.addItem('c1', 's1', {
      productId: 'p1',
      quantity: 1,
    }, undefined, undefined);
    expect(productRepo.findById).toHaveBeenCalledWith('p1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });
```

If `mergeCartOnLogin` is exercised by an existing test, update its `productRepo.findManyByIds` assertion to:
```typescript
expect(productRepo.findManyByIds).toHaveBeenCalledWith(expect.any(Array), 's1', expect.objectContaining({ __sentinel: 'tx' }));
```
(If `mergeCartOnLogin` has no existing test, add one mirroring the `addItem` test above but calling `cartService.mergeCartOnLogin` with a guest cart that has items, and assert `findManyByIds` received the sentinel tx.)

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
pnpm -C apps/backend test cart.service.withTenant
```
Expected: FAIL — `productRepo.findById` was called with `('p1', 's1')` (no tx) instead of `('p1', 's1', {__sentinel:'tx'})`. (If the test passes because the assertion was already loose, tighten it to the `objectContaining({__sentinel:'tx'})` form so it fails red.)

- [ ] **Step 3: Thread `tx` into `cart.service` direct productRepo calls**

In `apps/backend/src/modules/cart/cart.service.ts`:

At `:173`, change:
```typescript
        const productRows = await productRepo.findManyByIds(productIds, storeId);
```
to:
```typescript
        const productRows = await productRepo.findManyByIds(productIds, storeId, tx);
```
And update the stale comment at `:170-171` from:
```typescript
        // Step 1: batch-load all referenced products. (products have no RLS
        // this phase — findManyByIds has no tx param and stays bare.)
```
to:
```typescript
        // Step 1: batch-load all referenced products on the withTenant tx so
        // the read is tenant-scoped once catalog RLS is enabled (Phase 1).
```

At `:332`, change:
```typescript
      const product = await productRepo.findById(params.productId, storeId);
```
to:
```typescript
      const product = await productRepo.findById(params.productId, storeId, tx);
```
And update the stale comment at `:310-313` from:
```typescript
   * RLS Phase 1 prep: body runs inside withTenant(storeId, fn); the internal
   * recalc rides the same tx via cartRepo.recalculateCartTotalsInDb(cartId, tx)
   * (no nested withTenant). productRepo.findById (products, no RLS this phase)
   * stays bare. The abandoned-cart queue-add is hoisted out of the tx.
```
to:
```typescript
   * RLS Phase 1: body runs inside withTenant(storeId, fn); the internal
   * recalc rides the same tx via cartRepo.recalculateCartTotalsInDb(cartId, tx)
   * (no nested withTenant). productRepo.findById runs on the same tx so the
   * product read is tenant-scoped once catalog RLS is enabled. The
   * abandoned-cart queue-add is hoisted out of the tx.
```

- [ ] **Step 4: Run the cart withTenant test to verify it passes**

Run:
```bash
pnpm -C apps/backend test cart.service.withTenant
```
Expected: PASS.

- [ ] **Step 5: Add `tx?: DbOrTx` threading to all 6 `pricing.repo` methods**

In `apps/backend/src/modules/pricing/pricing.repo.ts`, add the import and update each method. Replace the top of the file:

```typescript
import { db } from '../../db/index.js';
import {
  products,
  productVariantOptions,
  productVariantCombinations,
  modifierOptions,
  modifierGroups,
  productVariants,
} from '../../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
```
with:
```typescript
import { db } from '../../db/index.js';
import {
  products,
  productVariantOptions,
  productVariantCombinations,
  modifierOptions,
  modifierGroups,
  productVariants,
} from '../../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';
```

Then update each of the 6 methods to accept `tx?: DbOrTx` and use `const executor = tx ?? db;`. The full updated file:

```typescript
export const pricingRepo = {
  // ─── Product lookups ───

  async findProductById(productId: string, storeId: string, tx?: DbOrTx): Promise<typeof products.$inferSelect | undefined> {
    const executor = tx ?? db;
    return executor.query.products.findFirst({
      where: and(eq(products.id, productId), eq(products.storeId, storeId)),
    });
  },

  // ─── Variant option lookups ───

  async findVariantOptionsByIds(optionIds: string[], storeId: string, tx?: DbOrTx): Promise<typeof productVariantOptions.$inferSelect[]> {
    const executor = tx ?? db;
    return executor.query.productVariantOptions.findMany({
      where: and(
        inArray(productVariantOptions.id, optionIds),
        eq(productVariantOptions.storeId, storeId),
      ),
    });
  },

  async findVariantsByIds(variantIds: string[], productId: string, tx?: DbOrTx): Promise<typeof productVariants.$inferSelect[]> {
    const executor = tx ?? db;
    return executor.query.productVariants.findMany({
      where: and(
        inArray(productVariants.id, variantIds),
        eq(productVariants.productId, productId),
      ),
    });
  },

  // ─── Combination lookups ───

  async findCombination(combinationKey: string, productId: string, storeId: string, tx?: DbOrTx): Promise<typeof productVariantCombinations.$inferSelect | undefined> {
    const executor = tx ?? db;
    return executor.query.productVariantCombinations.findFirst({
      where: and(
        eq(productVariantCombinations.combinationKey, combinationKey),
        eq(productVariantCombinations.productId, productId),
        eq(productVariantCombinations.storeId, storeId),
      ),
    });
  },

  // ─── Modifier lookups ───

  async findModifierOptionsByIds(optionIds: string[], storeId: string, tx?: DbOrTx): Promise<typeof modifierOptions.$inferSelect[]> {
    const executor = tx ?? db;
    return executor.query.modifierOptions.findMany({
      where: and(
        inArray(modifierOptions.id, optionIds),
        eq(modifierOptions.storeId, storeId),
      ),
    });
  },

  async findModifierGroupsByIds(groupIds: string[], storeId: string, tx?: DbOrTx): Promise<typeof modifierGroups.$inferSelect[]> {
    const executor = tx ?? db;
    return executor.query.modifierGroups.findMany({
      where: and(
        inArray(modifierGroups.id, groupIds),
        eq(modifierGroups.storeId, storeId),
      ),
    });
  },
};
```
(Only the `tx?: DbOrTx` param + `const executor = tx ?? db;` + `db.`→`executor.` are changes; logic is identical. `tx` defaults to `undefined` so existing callers that don't pass it still work — RLS is off during this task, so behavior is identical.)

- [ ] **Step 6: Wrap `order.route.public` product-verification block in `withTenant`**

In `apps/backend/src/modules/order/order.route.public.ts`, the guest order POST handler (starts at `:41`) currently does a bare `productRepo.findManyByIds(productIds, storeId)` at `:50` then per-item price/stock verification through `:89`, then later calls `orderService.create`. Wrap the product-verification portion so the product read is tenant-scoped.

Add the import at the top of the file (alongside the existing `productRepo` import):
```typescript
import { withTenant } from '../../lib/withTenant.js';
```

Replace the block from `const productIds = parsed.items.map((i) => i.productId);` (`:49`) through the end of the per-item verification loop (the line just before `orderService.create` is called — find the exact boundary by reading the handler; it's the close of the `for (const item of parsed.items)` loop that does the price-mismatch / insufficient-stock checks) with:

```typescript
    const productIds = parsed.items.map((i) => i.productId);

    // Verify product prices server-side inside a tenant-scoped tx so the
    // product read is visible once catalog RLS is enabled (Phase 1).
    const { productRows, earlyReply } = await withTenant(storeId, async (tx) => {
      const rows = await productRepo.findManyByIds(productIds, storeId, tx);
      const productById = new Map(rows.map((p) => [p.id, p]));

      let subtotalCents = 0;
      const orderItems: Array<{
        productId: string;
        productTitle: string;
        productImage?: string;
        quantity: number;
        price: string;
        total: string;
        modifiers?: unknown;
      }> = [];

      for (const item of parsed.items) {
        const product = productById.get(item.productId);
        if (!product) {
          return { earlyReply: { status: 400, code: ErrorCodes.PRODUCT_NOT_FOUND, message: `Product ${item.productId} not found` } as const };
        }

        // M5: verify the unit price in integer cents (no float math / 0.01
        // tolerance — exact cents equality is correct for 2dp decimal strings).
        const serverPriceStr = product.salePrice || product.purchasePrice || '0';
        const serverCents = toCents(serverPriceStr);
        const clientCents = toCents(item.price);
        if (serverCents !== clientCents) {
          return { earlyReply: { status: 400, code: ErrorCodes.PRICE_MISMATCH, message: `Price mismatch for ${product.titleEn}` } as const };
        }

        // M5: fast-fail on insufficient stock for simple products. Variant
        // products carry stock on their options (not currentQuantity), so we
        // skip the product-level check when the client selected variants — the
        // atomic decrement at payment time (0-row guard) catches variant oversell.
        const available = product.currentQuantity ?? 0;
        if (!item.variants?.length && available < item.quantity) {
          return { earlyReply: { status: 400, code: ErrorCodes.INSUFFICIENT_INVENTORY, message: `Insufficient stock for ${product.titleEn}` } as const };
        }

        // (preserve the existing orderItems-building + subtotalCents logic
        // that follows in the original loop — copy it verbatim into this loop
        // body, replacing any early `reply.status(400).send(...); return;` with
        // `return { earlyReply: { ... } as const };`)
        // ... existing orderItems push + subtotalCents accumulation ...
      }

      return { productRows: rows, orderItems, subtotalCents, earlyReply: undefined };
    });

    if (earlyReply) {
      reply.status(earlyReply.status).send({ error: 'Bad Request', code: earlyReply.code, message: earlyReply.message });
      return;
    }
```

**IMPORTANT — read the original handler first** to map every `reply.status(400).send(...); return;` inside the loop to the `return { earlyReply: … } as const;` form, and to carry over the existing `orderItems`-building + `subtotalCents` accumulation verbatim (the snippet above marks that spot with a comment — fill it with the real code from the file). The downstream code after the `withTenant` block (the `orderService.create` call using `orderItems` and `subtotalCents`) must still receive those variables; declare them with `let` outside or return them from the `withTenant` fn (the snippet returns them). Adjust the downstream references to use the returned `orderItems` / `subtotalCents`.

If the original structure makes a clean extraction awkward (e.g. `orderService.create` is called mid-handler with many local vars), the alternative is to wrap the **entire** handler body (from after `const storeId = request.storeId;` through the final `reply.send`) in `withTenant(storeId, async (tx) => { … })`, threading `tx` into `productRepo.findManyByIds` and leaving `orderService.create` (self-wrapped) as a nested call. Choose whichever is less invasive; both are correct. Document the choice in the commit message.

- [ ] **Step 7: Update `order.route.public.withTenant.test.ts`**

Open `apps/backend/src/modules/order/order.route.public.withTenant.test.ts`. The file already mocks `withTenant` (sentinel tx) and `productRepo`. Add a test asserting the guest-order creation path threads the sentinel tx into `productRepo.findManyByIds`:

```typescript
  it('guest order creation threads withTenant tx into productRepo.findManyByIds', async () => {
    // Use the existing test app + mocked productRepo/orderService in this file.
    // Trigger POST /api/v1/public/orders with a valid body (copy from an
    // existing happy-path test in this file).
    const response = await app.inject({ method: 'POST', url: '/api/v1/public/orders', payload: <existing happy-path body> });
    expect(productRepo.findManyByIds).toHaveBeenCalledWith(expect.any(Array), expect.any(String), expect.objectContaining({ __sentinel: 'tx' }));
  });
```
(Read the file first; mirror an existing happy-path test's `app.inject` payload exactly, and use the file's existing `productRepo` mock reference name.)

- [ ] **Step 8: Run the order.route.public withTenant test to verify it fails then passes after the wrap**

Run:
```bash
pnpm -C apps/backend test order.route.public.withTenant
```
Expected: PASS after step 6 (the wrap from step 6 is what makes `findManyByIds` receive the sentinel tx). If it fails, the wrap isn't threading `tx` — re-check step 6.

- [ ] **Step 9: Typecheck + full suite (RLS off → green)**

Run:
```bash
pnpm -C apps/backend typecheck
pnpm -C apps/backend test
```
Expected: typecheck 0 errors; full suite green. `pricing.service` still runs on bare `db` here (no `withTenant` wrap yet — that's Task 3) but `pricing.repo` now accepts an optional `tx` it ignores when absent, so `pricing.service` is unchanged and its tests stay green. `pricing.service.test.ts` mocks `pricingRepo` so it's unaffected by the signature change.

- [ ] **Step 10: Commit**

```bash
git add apps/backend/src/modules/pricing/pricing.repo.ts apps/backend/src/modules/cart/cart.service.ts apps/backend/src/modules/order/order.route.public.ts apps/backend/src/modules/cart/cart.service.withTenant.test.ts apps/backend/src/modules/order/order.route.public.withTenant.test.ts
git commit -m "refactor(rls): thread tx into pricing.repo + cart.service direct product reads + order.route.public product verification (Phase 1 prep)

pricing.repo: all 6 methods accept tx?: DbOrTx and use executor = tx ?? db.
cart.service: pass withTenant tx into productRepo.findManyByIds (:173) and
findById (:332) — stale 'no RLS this phase' comments updated.
order.route.public: wrap guest-order product-verification block in
withTenant(storeId) so the product read is tenant-scoped once catalog RLS is on.
Behavior-identical with RLS off; full suite green.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Wrap `pricing.service` in `withTenant`; thread `tx` into all `pricingRepo` calls

**Files:**
- Modify: `apps/backend/src/modules/pricing/pricing.service.ts` (`computeItemPrice`, `computeOrderPricing`)
- Create: `apps/backend/src/modules/pricing/pricing.service.withTenant.test.ts`
- Modify: `apps/backend/src/modules/pricing/pricing.service.test.ts`

**Interfaces:**
- Consumes: `withTenant` from `apps/backend/src/lib/withTenant.js`; `pricingRepo.<method>(..., tx?: DbOrTx)` from Task 2.
- Produces: `pricingService.computeItemPrice(params)` and `pricingService.computeOrderPricing(params)` now run their `pricingRepo` calls inside `withTenant(params.storeId, …)`. Callers (`checkout.route.customer`, `cart.service`) need **no change** (nested `withTenant`, same value — safe, precedented by cart→couponService).

- [ ] **Step 1: Write failing test — `pricing.service.withTenant.test.ts`**

Create `apps/backend/src/modules/pricing/pricing.service.withTenant.test.ts`:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
// Verifies pricingService wraps catalog DB work in withTenant(storeId, fn)
// (RLS Phase 1). withTenant + pricingRepo + cross-module services are mocked.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  // Run fn with a sentinel tx so we can assert pricingRepo received it.
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    const sentinelTx = { __sentinel: 'tx' };
    return fn(sentinelTx);
  },
}));

const { pricingRepo } = vi.hoisted(() => ({
  pricingRepo: {
    findProductById: vi.fn().mockResolvedValue({
      id: 'p1', storeId: 's1', salePrice: '10.00', currentQuantity: 100,
      isPublished: true, discount: '0', discountType: 'Percent',
      titleEn: 'P', images: [], discount: '0',
    }),
    findVariantOptionsByIds: vi.fn().mockResolvedValue([]),
    findVariantsByIds: vi.fn().mockResolvedValue([]),
    findCombination: vi.fn().mockResolvedValue(undefined),
    findModifierOptionsByIds: vi.fn().mockResolvedValue([]),
    findModifierGroupsByIds: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('./pricing.repo.js', () => ({ pricingRepo }));

vi.mock('../bundle/bundle.repo.js', () => ({
  bundleRepo: { findById: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../coupon/coupon.service.js', () => ({
  couponService: { validateCoupon: vi.fn(), calculateDiscount: vi.fn().mockResolvedValue({ discountAmount: '0', freeShipping: false }) },
}));
vi.mock('../shipping/shipping.service.js', () => ({
  shippingService: { calculateShipping: vi.fn().mockResolvedValue({ options: [] }) },
}));
vi.mock('../tax/tax.service.js', () => ({
  taxService: { calculateTax: vi.fn().mockResolvedValue({ totalTax: '0', breakdown: [] }) },
}));
vi.mock('../currency/currency.service.js', () => ({
  currencyService: { getStoreCurrency: vi.fn().mockResolvedValue('USD'), convert: vi.fn() },
}));

import { pricingService } from './pricing.service.js';

describe('pricing.service wraps catalog work in withTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computeItemPrice runs inside withTenant(storeId) and threads tx into pricingRepo.findProductById', async () => {
    await pricingService.computeItemPrice({
      storeId: 's1', productId: 'p1', quantity: 1,
    });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(pricingRepo.findProductById).toHaveBeenCalledWith('p1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('computeOrderPricing runs inside withTenant(storeId)', async () => {
    await pricingService.computeOrderPricing({
      storeId: 's1',
      items: [{ productId: 'p1', quantity: 1 }],
      shippingAddress: { country: 'US' },
    });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(pricingRepo.findProductById).toHaveBeenCalledWith('p1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
pnpm -C apps/backend test pricing.service.withTenant
```
Expected: FAIL — `withTenantMock` was not called (pricing.service doesn't wrap yet), so `toHaveBeenCalledWith('s1')` fails.

- [ ] **Step 3: Wrap `computeItemPrice` in `withTenant` and thread `tx`**

In `apps/backend/src/modules/pricing/pricing.service.ts`, add the import near the top:
```typescript
import { withTenant } from '../../lib/withTenant.js';
```

Replace the body of `computeItemPrice` so the whole thing runs inside `withTenant(params.storeId, async (tx) => …)` and every `pricingRepo.<method>(...)` call gets `, tx` appended. Concretely, change:
```typescript
  async computeItemPrice(params: ComputeItemPriceParams): Promise<ComputedItemPrice> {
    const { storeId, productId, variantOptionIds, combinationKey, modifierOptionIds, quantity } = params;

    // 1. Fetch product
    const product = await pricingRepo.findProductById(productId, storeId);
```
to:
```typescript
  async computeItemPrice(params: ComputeItemPriceParams): Promise<ComputedItemPrice> {
    const { storeId, productId, variantOptionIds, combinationKey, modifierOptionIds, quantity } = params;

    return withTenant(storeId, async (tx) => {
    // 1. Fetch product
    const product = await pricingRepo.findProductById(productId, storeId, tx);
```
Then append `, tx` to every other `pricingRepo.` call inside the function body:
- `pricingRepo.findVariantOptionsByIds(variantOptionIds, storeId)` → `…, storeId, tx)`
- `pricingRepo.findVariantsByIds(optionVariantIds, productId)` → `…, productId, tx)`
- `pricingRepo.findCombination(combinationKey, productId, storeId)` → `…, storeId, tx)`
- `pricingRepo.findModifierOptionsByIds(modifierOptionIds, storeId)` → `…, storeId, tx)`
- `pricingRepo.findModifierGroupsByIds(groupIds, storeId)` → `…, storeId, tx)`

**Do NOT pass `tx` to `bundleRepo.findById(params.bundleId, storeId)`** — `bundleRepo.findById` does not accept a `tx` param (`product_bundles` has no RLS this phase). Leave it bare; it runs inside the `withTenant` tx body on bare `db`, which is correct for a non-RLS table.

At the very end of `computeItemPrice`, the function currently does `return { … };`. Change that final `return { … };` into `return { … };` INSIDE the `withTenant` callback — i.e. wrap the entire body and close it:
```typescript
      // 6. Compute line total
      const lineTotal = multiplyDecimalByInt(effectivePrice, quantity);

      return {
        productId: product.id,
        productTitle: product.titleEn,
        productImage: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null,
        variantName,
        combinationId,
        salePrice: product.salePrice,
        variantAdjustment,
        modifierAdjustment,
        discountType: product.discountType,
        discountAmount,
        effectivePrice,
        lineTotal,
        currentQuantity: product.currentQuantity ?? 0,
        isPublished: product.isPublished ?? true,
        quantityRequested: quantity,
      };
    }); // end withTenant
  },
```
(Read the original `computeItemPrice` body and indent the whole thing one level inside `withTenant(storeId, async (tx) => { … });`. All `throw Object.assign(...)` statements stay where they are — they propagate out of the `withTenant` callback and reject the outer promise, same as today.)

- [ ] **Step 4: Wrap `computeOrderPricing` in `withTenant` and thread `tx`**

`computeOrderPricing` loops over items calling `this.computeItemPrice({ storeId, … })` (now self-wrapped → nested `withTenant`, safe). It also calls `couponService` / `shippingService` / `taxService` (each self-wrapped from prior phases → nested, safe). Wrap the whole body so the per-item `computeItemPrice` and the coupon/shipping/tax lookups share one tenant context, and thread `tx` into nothing extra here (the `tx` is used implicitly by the nested `computeItemPrice`'s own `withTenant`). 

Simplest correct form — wrap the body and let `computeItemPrice` re-open its own `withTenant` (nested, same value, no-op re-set):

Change:
```typescript
  async computeOrderPricing(params: ComputeOrderPricingParams): Promise<ComputedOrderPricing> {
    const { storeId, items, couponCode, customerId, shippingAddress, shippingRateId } = params;

    // 1. Compute each item's price
    const computedItems: ComputedItemPrice[] = [];
```
to:
```typescript
  async computeOrderPricing(params: ComputeOrderPricingParams): Promise<ComputedOrderPricing> {
    const { storeId, items, couponCode, customerId, shippingAddress, shippingRateId } = params;

    return withTenant(storeId, async (tx) => {
    // 1. Compute each item's price (each computeItemPrice opens its own
    // nested withTenant with the same storeId — safe, no-op re-set).
    const computedItems: ComputedItemPrice[] = [];
```
and indent the rest of the body one level, closing with `});` after the final `return { … };`:
```typescript
      return {
        items: computedItems,
        subtotal,
        discount,
        subtotalAfterDiscount,
        shipping,
        shippingOptionId,
        tax,
        taxBreakdown,
        total,
        storeId,
        coupon,
        freeShipping,
      };
    }); // end withTenant
  },
```
(The `tx` param of the outer `withTenant` is intentionally unused inside `computeOrderPricing` itself — it exists to establish tenant context for any direct repo call should one be added later, and to keep the entry point uniformly wrapped. ESLint may warn about the unused `tx`; if so, name it `_tx` or add `// eslint-disable-next-line @typescript-eslint/no-unused-vars` — but prefer keeping `tx` for forward-compatibility. If the project's eslint config errors on unused params, rename to `_tx`.)

- [ ] **Step 5: Run the withTenant test to verify it passes**

Run:
```bash
pnpm -C apps/backend test pricing.service.withTenant
```
Expected: PASS — both `computeItemPrice` and `computeOrderPricing` now call `withTenant('s1')` and pass the sentinel tx to `findProductById`.

- [ ] **Step 6: Update `pricing.service.test.ts` — add `withTenant` sentinel mock + fix assertions**

`pricing.service.test.ts` calls `pricingService.computeItemPrice`/`computeOrderPricing` directly and asserts `mockPricingRepo.findProductById` was called with `(productId, storeId)`. Once wrapped, `withTenant` runs for real (opening a real `db.transaction`) and `findProductById` receives a real tx as a 3rd arg → existing assertions fail and real-DB side effects occur.

Add the `withTenant` sentinel mock at the top of `pricing.service.test.ts` (right after the `import { describe, it, expect, vi, beforeEach } from 'vitest';` line, before the `vi.mock('./pricing.repo.js'…)`):

```typescript
const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn({ __sentinel: 'tx' });
  },
}));
```

Then update every `expect(mockPricingRepo.<method>).toHaveBeenCalledWith(...)` assertion that currently checks a `pricingRepo` call to include the trailing sentinel tx. Find them:
```bash
grep -n "toHaveBeenCalledWith" apps/backend/src/modules/pricing/pricing.service.test.ts
```
For each hit on a `pricingRepo` method, append `, expect.objectContaining({ __sentinel: 'tx' })` to the expected-args list. For example:
```typescript
expect(mockPricingRepo.findProductById).toHaveBeenCalledWith('prod-1', 'store-1');
```
becomes:
```typescript
expect(mockPricingRepo.findProductById).toHaveBeenCalledWith('prod-1', 'store-1', expect.objectContaining({ __sentinel: 'tx' }));
```
Apply the same trailing-arg addition to `findVariantOptionsByIds`, `findVariantsByIds`, `findCombination`, `findModifierOptionsByIds`, `findModifierGroupsByIds` assertions. (Do NOT change `couponService`/`shippingService`/`taxService` assertions — those services are mocked and their internal `withTenant` is already mocked away by their own `vi.mock`; their call signatures are unchanged.)

- [ ] **Step 7: Run the full pricing test suite**

Run:
```bash
pnpm -C apps/backend test pricing
```
Expected: PASS (both `pricing.service.test.ts` and `pricing.service.withTenant.test.ts`).

- [ ] **Step 8: Typecheck + full suite (RLS off → green)**

Run:
```bash
pnpm -C apps/backend typecheck
pnpm -C apps/backend test
```
Expected: typecheck 0 errors; full suite green. Checkout + cart call `pricingService` which now self-wraps in `withTenant` — nested with the cart/checkout `withTenant` (or bare in checkout's case) but same storeId, so behavior is identical with RLS off.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/modules/pricing/pricing.service.ts apps/backend/src/modules/pricing/pricing.service.withTenant.test.ts apps/backend/src/modules/pricing/pricing.service.test.ts
git commit -m "refactor(rls): wrap pricing.service computeItemPrice + computeOrderPricing in withTenant (Phase 1 prep)

Approach A — the service owns the tx. checkout.route and cart.service need no
change to their pricing calls (nested withTenant, same storeId, safe — same
precedent as cart→couponService). bundleRepo.findById stays bare (product_bundles
has no RLS this phase). pricing.service.test.ts updated with the sentinel-tx
withTenant mock. Behavior-identical with RLS off; full suite green.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Wrap `product.service` in `withTenant`; thread `tx` into all `productRepo` calls

**Files:**
- Modify: `apps/backend/src/modules/product/product.service.ts` (all 12 entries)
- Create: `apps/backend/src/modules/product/product.service.withTenant.test.ts`
- Modify: `apps/backend/src/modules/product/product.service.test.ts`
- Possibly modify: `apps/backend/src/modules/product/product.route.merchant.test.ts` (verify first)

**Interfaces:**
- Consumes: `withTenant` from `apps/backend/src/lib/withTenant.js`; `productRepo.<method>(..., tx?: DbExecutor)` (repo already threads tx — no signature change needed).
- Produces: all 12 `productService` entries run their `productRepo` call inside `withTenant(storeId, …)`. Public + merchant routes need **no change** (they call `productService` which now self-wraps).

- [ ] **Step 1: Write failing test — `product.service.withTenant.test.ts`**

Create `apps/backend/src/modules/product/product.service.withTenant.test.ts`:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
// Verifies productService wraps all product/variant/option DB work in
// withTenant(storeId, fn) (RLS Phase 1). withTenant + productRepo are mocked.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    const sentinelTx = { __sentinel: 'tx' };
    return fn(sentinelTx);
  },
}));

const { productRepo } = vi.hoisted(() => ({
  productRepo: {
    findByStoreId: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    findById: vi.fn().mockResolvedValue({ id: 'p1', storeId: 's1', isPublished: true, variants: [], modifierGroups: [] }),
    create: vi.fn().mockResolvedValue({ id: 'p1', storeId: 's1' }),
    update: vi.fn().mockResolvedValue({ id: 'p1', storeId: 's1' }),
    delete: vi.fn().mockResolvedValue({ id: 'p1', storeId: 's1' }),
    createVariant: vi.fn().mockResolvedValue({ id: 'v1', storeId: 's1' }),
    updateVariant: vi.fn().mockResolvedValue({ id: 'v1', storeId: 's1' }),
    deleteVariant: vi.fn().mockResolvedValue({ id: 'v1', storeId: 's1' }),
    createVariantOption: vi.fn().mockResolvedValue({ id: 'vo1', storeId: 's1' }),
    updateVariantOption: vi.fn().mockResolvedValue({ id: 'vo1', storeId: 's1' }),
    deleteVariantOption: vi.fn().mockResolvedValue({ id: 'vo1', storeId: 's1' }),
    search: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 }),
  },
}));
vi.mock('./product.repo.js', () => ({ productRepo }));

import { productService } from './product.service.js';

describe('productService wraps product work in withTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const cases: Array<[string, () => Promise<unknown>, string, unknown[]]> = [
    ['findByStoreId',   () => productService.findByStoreId('s1'), 's1', ['s1', undefined, expect.objectContaining({ __sentinel: 'tx' })]],
    ['findById',        () => productService.findById('p1', 's1'), 's1', ['p1', 's1', expect.objectContaining({ __sentinel: 'tx' })]],
    ['update',          () => productService.update('p1', 's1', { titleEn: 'X' } as any), 's1', ['p1', 's1', { titleEn: 'X' }, expect.objectContaining({ __sentinel: 'tx' })]],
    ['delete',          () => productService.delete('p1', 's1'), 's1', ['p1', 's1', expect.objectContaining({ __sentinel: 'tx' })]],
    ['search',          () => productService.search('s1', { page: 1, limit: 20 }), 's1', ['s1', expect.any(Object), expect.objectContaining({ __sentinel: 'tx' })]],
  ];

  it.each(cases)('%s runs inside withTenant(storeId) and threads tx into productRepo', async (_name, call, storeId, expectedRepoArgs) => {
    await call();
    expect(withTenantMock).toHaveBeenCalledWith(storeId);
    // Assert the corresponding repo method received the sentinel tx (last arg).
    // The repo method name matches the service method for these five.
    const repoMethod = (productRepo as any)[_name === 'findByStoreId' ? 'findByStoreId' : _name];
    expect(repoMethod).toHaveBeenCalledWith(...expectedRepoArgs);
  });

  it('create runs inside withTenant(data.storeId) and threads tx into productRepo.create', async () => {
    await productService.create({ storeId: 's1', titleEn: 'X', salePrice: '10.00', categoryId: 'c1' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(productRepo.create).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1' }), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('createVariant runs inside withTenant(data.storeId) and threads tx', async () => {
    await productService.createVariant({ storeId: 's1', productId: 'p1', nameEn: 'V' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(productRepo.createVariant).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1' }), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('createVariantOption runs inside withTenant(data.storeId) and threads tx', async () => {
    await productService.createVariantOption({ storeId: 's1', variantId: 'v1', nameEn: 'O' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(productRepo.createVariantOption).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1' }), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('updateVariant runs inside withTenant(storeId) and threads tx', async () => {
    await productService.updateVariant('v1', 's1', { nameEn: 'V' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(productRepo.updateVariant).toHaveBeenCalledWith('v1', 's1', expect.any(Object), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('deleteVariant runs inside withTenant(storeId) and threads tx', async () => {
    await productService.deleteVariant('v1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(productRepo.deleteVariant).toHaveBeenCalledWith('v1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('updateVariantOption runs inside withTenant(storeId) and threads tx', async () => {
    await productService.updateVariantOption('vo1', 's1', { nameEn: 'O' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(productRepo.updateVariantOption).toHaveBeenCalledWith('vo1', 's1', expect.any(Object), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('deleteVariantOption runs inside withTenant(storeId) and threads tx', async () => {
    await productService.deleteVariantOption('vo1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(productRepo.deleteVariantOption).toHaveBeenCalledWith('vo1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
pnpm -C apps/backend test product.service.withTenant
```
Expected: FAIL — `withTenantMock` not called.

- [ ] **Step 3: Wrap all 12 `productService` entries in `withTenant` and thread `tx`**

In `apps/backend/src/modules/product/product.service.ts`, add the import:
```typescript
import { withTenant } from '../../lib/withTenant.js';
```

Replace the entire `productService` object with the wrapped version:

```typescript
export const productService = {
  async findByStoreId(
    storeId: string,
    options?: { limit?: number; offset?: number; isPublished?: boolean; search?: string; categoryId?: string },
  ) {
    return withTenant(storeId, (tx) => productRepo.findByStoreId(storeId, options, tx));
  },

  async findById(id: string, storeId: string) {
    const product = await withTenant(storeId, (tx) => productRepo.findById(id, storeId, tx));

    if (!product) {
      throw Object.assign(new Error('Product not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    return product;
  },

  async create(data: ProductInsert) {
    const product = await withTenant(data.storeId, (tx) => productRepo.create(data, tx));

    if (!product) {
      throw Object.assign(new Error('Failed to create product'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return product;
  },

  async update(id: string, storeId: string, data: ProductUpdate) {
    const product = await withTenant(storeId, (tx) => productRepo.update(id, storeId, data, tx));

    if (!product) {
      throw Object.assign(new Error('Product not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    return product;
  },

  async delete(id: string, storeId: string) {
    const product = await withTenant(storeId, (tx) => productRepo.delete(id, storeId, tx));

    if (!product) {
      throw Object.assign(new Error('Product not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    return product;
  },

  // ─── Variant operations ───

  async createVariant(data: VariantInsert) {
    const variant = await withTenant(data.storeId, (tx) => productRepo.createVariant(data, tx));

    if (!variant) {
      throw Object.assign(new Error('Failed to create product variant'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return variant;
  },

  async updateVariant(id: string, storeId: string, data: VariantUpdate) {
    const variant = await withTenant(storeId, (tx) => productRepo.updateVariant(id, storeId, data, tx));

    if (!variant) {
      throw Object.assign(new Error('Product variant not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    return variant;
  },

  async deleteVariant(id: string, storeId: string) {
    const variant = await withTenant(storeId, (tx) => productRepo.deleteVariant(id, storeId, tx));

    if (!variant) {
      throw Object.assign(new Error('Product variant not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    return variant;
  },

  // ─── Variant option operations ───

  async createVariantOption(data: VariantOptionInsert) {
    const option = await withTenant(data.storeId, (tx) => productRepo.createVariantOption(data, tx));

    if (!option) {
      throw Object.assign(new Error('Failed to create variant option'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return option;
  },

  async updateVariantOption(
    id: string,
    storeId: string,
    data: VariantOptionUpdate,
  ) {
    const option = await withTenant(storeId, (tx) => productRepo.updateVariantOption(id, storeId, data, tx));

    if (!option) {
      throw Object.assign(new Error('Variant option not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    return option;
  },

  async deleteVariantOption(id: string, storeId: string) {
    const option = await withTenant(storeId, (tx) => productRepo.deleteVariantOption(id, storeId, tx));

    if (!option) {
      throw Object.assign(new Error('Variant option not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    return option;
  },

  async search(storeId: string, opts: {
    q?: string;
    categoryId?: string;
    minPrice?: string;
    maxPrice?: string;
    isPublished?: boolean;
    sort?: 'price_asc' | 'price_desc' | 'newest' | 'name_asc' | 'name_desc';
    page?: number;
    limit?: number;
  }) {
    // Business logic: clamp page/limit and convert page -> offset for the repo
    const limit = Math.max(1, Math.min(opts.limit ?? 20, 100));
    const page = Math.max(1, opts.page ?? 1);
    const offset = (page - 1) * limit;

    return withTenant(storeId, (tx) => productRepo.search(storeId, {
      ...opts,
      limit,
      offset,
    }, tx));
  },
};
```

(`sanitizePublicProduct` and `stripSensitive` above the object stay unchanged.)

- [ ] **Step 4: Run the withTenant test to verify it passes**

Run:
```bash
pnpm -C apps/backend test product.service.withTenant
```
Expected: PASS.

- [ ] **Step 5: Update `product.service.test.ts` — add `withTenant` sentinel mock + fix assertions**

Open `apps/backend/src/modules/product/product.service.test.ts`. It currently mocks `productRepo` and asserts e.g. `mockProductRepo.findById.toHaveBeenCalledWith('prod-1', 'store-1')`. Once wrapped, `withTenant` runs for real and `productRepo` receives a trailing real-tx arg → existing assertions fail.

Add the sentinel mock at the top, right after the `import { describe, it, expect, vi, beforeEach } from 'vitest';` line and BEFORE `vi.mock('./product.repo.js'…)`:

```typescript
const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn({ __sentinel: 'tx' });
  },
}));
```

Find all `toHaveBeenCalledWith` assertions on `mockProductRepo`:
```bash
grep -n "toHaveBeenCalledWith" apps/backend/src/modules/product/product.service.test.ts
```
For each `mockProductRepo.<method>` assertion, append the trailing sentinel tx to the expected args:
- `findById(id, storeId)` → `findById(id, storeId, expect.objectContaining({ __sentinel: 'tx' }))`
- `findByStoreId(storeId, options)` → `findByStoreId(storeId, options, expect.objectContaining({ __sentinel: 'tx' }))`
- `create(data)` → `create(data, expect.objectContaining({ __sentinel: 'tx' }))`
- `update(id, storeId, data)` → `update(id, storeId, data, expect.objectContaining({ __sentinel: 'tx' }))`
- `delete(id, storeId)` → `delete(id, storeId, expect.objectContaining({ __sentinel: 'tx' }))`
- `search(storeId, opts)` → `search(storeId, opts, expect.objectContaining({ __sentinel: 'tx' }))`
- Apply the same trailing-arg addition to `createVariant`/`updateVariant`/`deleteVariant`/`createVariantOption`/`updateVariantOption`/`deleteVariantOption` assertions.

(Use `expect.objectContaining({ __sentinel: 'tx' })` rather than a strict equality so the assertion is robust to the sentinel object identity.)

- [ ] **Step 6: Run the product service test suite**

Run:
```bash
pnpm -C apps/backend test product.service.test
```
Expected: PASS.

- [ ] **Step 7: Check `product.route.merchant.test.ts` for direct `productService` calls**

Run:
```bash
grep -n "productService\|withTenant" apps/backend/src/modules/product/product.route.merchant.test.ts | head
```
If this test calls `productService` directly (not via `app.inject`) and asserts on a mocked `productRepo`, it needs the same `withTenant` sentinel mock added at its top (same block as step 5) and its `productRepo` assertions updated with the trailing sentinel tx. If it only uses `app.inject` against a running Fastify with `productService` mocked, the mock already short-circuits the wrap and no change is needed. Apply the fix only if needed.

- [ ] **Step 8: Typecheck + full suite (RLS off → green)**

Run:
```bash
pnpm -C apps/backend typecheck
pnpm -C apps/backend test
```
Expected: typecheck 0 errors; full suite green. Public + merchant product routes now flow through `withTenant`-wrapped `productService`; with RLS off, `set_config` is a no-op so behavior is identical.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/modules/product/product.service.ts apps/backend/src/modules/product/product.service.withTenant.test.ts apps/backend/src/modules/product/product.service.test.ts apps/backend/src/modules/product/product.route.merchant.test.ts
git commit -m "refactor(rls): wrap productService (all 12 entries) in withTenant (Phase 1 prep)

product.repo already threads tx on every method (no signature change). Public
+ merchant routes need no change — productService self-wraps. product.service.test
+ product.route.merchant.test updated with the sentinel-tx withTenant mock.
Behavior-identical with RLS off; full suite green.

Co-Authored-By: Claude <noreply@anthropic.com>"
```
(If `product.route.merchant.test.ts` was not modified, drop it from `git add`.)

---

### Task 5: Switch seed catalog inserts to `dbOwner`

**Files:**
- Modify: `apps/backend/src/db/seed.ts:447,457,466` (and any `db.query.products` lookups in the same region)

**Interfaces:**
- Consumes: `dbOwner` (BYPASSRLS) from `apps/backend/src/db/index.js` (already imported in `seed.ts` — confirmed at `:572` etc.).
- Produces: seed inserts for `products`, `productVariants`, `productVariantOptions` bypass `WITH CHECK` (RLS will be enabled in Task 6; this task is a no-op behavior change until then, but is required so the seed doesn't break once Task 6 ships — and so the seed runs correctly during Task 6's verification).

- [ ] **Step 1: Locate the exact catalog insert lines**

Run:
```bash
grep -n "db.insert(schema.products)\|db.insert(schema.productVariants)\|db.insert(schema.productVariantOptions)\|db.query.products" apps/backend/src/db/seed.ts
```
Expected hits: `:447` (`products`), `:457` (`productVariants`), `:466` (`productVariantOptions`). Note any `db.query.products.findFirst` lookups too.

- [ ] **Step 2: Switch the three inserts to `dbOwner`**

In `apps/backend/src/db/seed.ts`:

At `:447`, change:
```typescript
  const insertedProducts = await db.insert(schema.products).values(productData).onConflictDoUpdate({ target: schema.products.id, set: { updatedAt: new Date() } }).returning();
```
to:
```typescript
  const insertedProducts = await dbOwner.insert(schema.products).values(productData).onConflictDoUpdate({ target: schema.products.id, set: { updatedAt: new Date() } }).returning();
```

At `:457`, change:
```typescript
    const [colorVariant] = await db.insert(schema.productVariants).values({
```
to:
```typescript
    const [colorVariant] = await dbOwner.insert(schema.productVariants).values({
```

At `:466`, change:
```typescript
      await db.insert(schema.productVariantOptions).values([
```
to:
```typescript
      await dbOwner.insert(schema.productVariantOptions).values([
```

If step 1 found any `db.query.products.findFirst` lookup in the same region (e.g. resolving an existing product id), change it to `dbOwner.query.products.findFirst`. (None were observed in the spec exploration, but verify.)

**Do NOT change** the `modifierGroups` (`:503`), `modifierOptions` (`:515`), or `reviews` (`:826`) inserts — those tables have no RLS this phase and stay on `db`.

- [ ] **Step 3: Typecheck + full suite (RLS off → green; seed file itself isn't run by the suite, but typecheck must pass)**

Run:
```bash
pnpm -C apps/backend typecheck
pnpm -C apps/backend test
```
Expected: typecheck 0 errors; full suite green. (The seed is not exercised by the test suite, so this is just a typecheck + regression gate. Optionally run `pnpm -C apps/backend db:seed` against a local dev DB to confirm the seed still applies — skip if no local Postgres.)

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/db/seed.ts
git commit -m "refactor(rls): seed products + product_variants + product_variant_options via dbOwner (Phase 1 prep)

Under catalog RLS an app_tenant insert with no app.tenant_id hits WITH CHECK and
fails; dbOwner (BYPASSRLS) bypasses it. Same fix Phase 1 applied to the orders
+ coupons + customers seeds. modifierGroups/modifierOptions/reviews stay on db
(no RLS this phase).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Enable RLS via migration `0028` + `catalog.rls.test.ts` negative test

**Files:**
- Create: `apps/backend/drizzle/0028_catalog_rls.sql`
- Modify: `apps/backend/drizzle/meta/_journal.json` (append `idx: 29`)
- Create: `apps/backend/src/modules/catalog/catalog.rls.test.ts`

**Interfaces:**
- Consumes: `dbOwner` (BYPASSRLS) from `apps/backend/src/db/index.js`; `runMigrations()` (runs via `dbOwner`); env vars `DATABASE_URL` + `RLS_TENANT_PASSWORD` (already used by `customers.rls.test.ts`).
- Produces: RLS enabled + `FORCE`d on the 4 catalog tables with `tenant_iso` policy; a real-DB test proving the database enforces isolation independent of the app layer.

- [ ] **Step 1: Write the migration SQL**

Create `apps/backend/drizzle/0028_catalog_rls.sql`:

```sql
-- RLS Phase 1: catalog — products + product_variants + product_variant_options
-- + product_variant_combinations. All four are §4.1 tenant tables (storeId uuid
-- notNull) → direct policy. See
-- docs/superpowers/specs/2026-07-03-rls-phase1-catalog-design.md §3.
-- Roles + grants are created by src/scripts/rls-roles.ts (idempotent bootstrap,
-- grants DML on ALL TABLES in public to app_tenant + app_admin), NOT here, so
-- the migration carries only ENABLE/FORCE/policy statements.

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON products;
CREATE POLICY tenant_iso ON products
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON product_variants;
CREATE POLICY tenant_iso ON product_variants
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE product_variant_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant_options FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON product_variant_options;
CREATE POLICY tenant_iso ON product_variant_options
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE product_variant_combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant_combinations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON product_variant_combinations;
CREATE POLICY tenant_iso ON product_variant_combinations
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```

- [ ] **Step 2: Add the journal entry**

In `apps/backend/drizzle/meta/_journal.json`, the last entry is:
```json
    {
      "idx": 28,
      "version": "7",
      "when": 1780843300000,
      "tag": "0027_customers_rls",
      "breakpoints": true
    }
```
Append after it (before the closing `]`):
```json
    ,
    {
      "idx": 29,
      "version": "7",
      "when": 1780843400000,
      "tag": "0028_catalog_rls",
      "breakpoints": true
    }
```
(Use a `when` value one increment past `0027`'s `1780843300000`; the exact timestamp doesn't matter for correctness, only that `idx` and `tag` match the migration filename.)

- [ ] **Step 3: Write the real-DB RLS negative test**

Create `apps/backend/src/modules/catalog/catalog.rls.test.ts`:

```typescript
// apps/backend/src/modules/catalog/catalog.rls.test.ts
// Real-DB RLS negative test for the 4 catalog tables (RLS Phase 1).
// Connects as app_tenant (RLS-enforced) via a dedicated (max: 1) connection so
// session-level set_config is safe. Proves the database enforces catalog
// isolation independently of the application layer (the withTenant refactor in
// Tasks 1-5 sets app.tenant_id; this test verifies RLS actually uses it).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema.js';
import { dbOwner } from '../../db/index.js';

function tenantUrl(): string {
  const owner = process.env.DATABASE_URL!;
  const pw = process.env.RLS_TENANT_PASSWORD!;
  const u = new URL(owner);
  u.username = 'app_tenant';
  u.password = pw;
  return u.toString();
}

const tenantClient = postgres(tenantUrl(), { max: 1, onnotice: () => {} });
const tenantDb = drizzle(tenantClient, { schema });

let storeAId: string;
let storeBId: string;
let productAId: string;
let productBId: string;
let variantAId: string;
let optionAId: string;
let combinationAId: string;

// Distinct domains so this test's residue is identifiable and cleanable.
const DOMAIN_A = 'rls-cat-a.test';
const DOMAIN_B = 'rls-cat-b.test';

beforeAll(async () => {
  // ─── Self-cleaning pre-pass (FK-respecting: options→variants→products→stores,
  //   combinations→products→stores) ─── Delete residue from a prior crashed run
  //   BEFORE inserting, so the test is re-runnable. Owned by dbOwner (BYPASSRLS).
  for (const domain of [DOMAIN_A, DOMAIN_B]) {
    const stores = await dbOwner
      .select({ id: schema.stores.id })
      .from(schema.stores)
      .where(eq(schema.stores.domain, domain));
    for (const s of stores) {
      await dbOwner
        .delete(schema.productVariantCombinations)
        .where(eq(schema.productVariantCombinations.storeId, s.id));
      await dbOwner
        .delete(schema.productVariantOptions)
        .where(eq(schema.productVariantOptions.storeId, s.id));
      await dbOwner
        .delete(schema.productVariants)
        .where(eq(schema.productVariants.storeId, s.id));
      await dbOwner
        .delete(schema.products)
        .where(eq(schema.products.storeId, s.id));
    }
    await dbOwner.delete(schema.stores).where(eq(schema.stores.domain, domain));
  }

  // ─── Seed as the OWNER (bypasses RLS) ────────────────────────────────────
  // Required notNull on stores: name, domain, ownerEmail, storeType, currency,
  // language (mirror customers.rls.test.ts).
  const [storeA] = await dbOwner.insert(schema.stores).values({
    name: 'rls-cat-A', domain: DOMAIN_A, ownerEmail: 'a@rls-cat-a.test',
    storeType: 'food', currency: 'USD', language: 'en',
  }).returning();
  const [storeB] = await dbOwner.insert(schema.stores).values({
    name: 'rls-cat-B', domain: DOMAIN_B, ownerEmail: 'b@rls-cat-b.test',
    storeType: 'food', currency: 'USD', language: 'en',
  }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;

  // products: required notNull storeId, categoryId, titleEn, salePrice.
  // Need a category per store (categoryId notNull, references categories).
  const [catA] = await dbOwner.insert(schema.categories).values({
    storeId: storeAId, nameEn: 'Cat A',
  }).returning();
  const [catB] = await dbOwner.insert(schema.categories).values({
    storeId: storeBId, nameEn: 'Cat B',
  }).returning();

  const [prodA] = await dbOwner.insert(schema.products).values({
    storeId: storeAId, categoryId: catA.id, titleEn: 'Product A', salePrice: '10.00',
  }).returning();
  const [prodB] = await dbOwner.insert(schema.products).values({
    storeId: storeBId, categoryId: catB.id, titleEn: 'Product B', salePrice: '20.00',
  }).returning();
  productAId = prodA.id;
  productBId = prodB.id;

  // product_variants: required notNull storeId, productId, nameEn.
  const [varA] = await dbOwner.insert(schema.productVariants).values({
    storeId: storeAId, productId: productAId, nameEn: 'Variant A',
  }).returning();
  variantAId = varA.id;

  // product_variant_options: required notNull variantId, storeId, nameEn.
  const [optA] = await dbOwner.insert(schema.productVariantOptions).values({
    variantId: variantAId, storeId: storeAId, nameEn: 'Option A',
  }).returning();
  optionAId = optA.id;

  // product_variant_combinations: required notNull storeId, productId, sku, combinationKey.
  const [comboA] = await dbOwner.insert(schema.productVariantCombinations).values({
    storeId: storeAId, productId: productAId, sku: 'SKU-A', combinationKey: 'key-a',
  }).returning();
  combinationAId = comboA.id;
});

afterAll(async () => {
  // Clean up as the owner (RLS-bypass). Order respects FKs.
  await dbOwner.delete(schema.productVariantCombinations).where(eq(schema.productVariantCombinations.id, combinationAId));
  await dbOwner.delete(schema.productVariantOptions).where(eq(schema.productVariantOptions.id, optionAId));
  await dbOwner.delete(schema.productVariants).where(eq(schema.productVariants.id, variantAId));
  await dbOwner.delete(schema.products).where(eq(schema.products.id, productAId));
  await dbOwner.delete(schema.products).where(eq(schema.products.id, productBId));
  await dbOwner.delete(schema.categories).where(eq(schema.categories.storeId, storeAId));
  await dbOwner.delete(schema.categories).where(eq(schema.categories.storeId, storeBId));
  await dbOwner.delete(schema.stores).where(eq(schema.stores.id, storeAId));
  await dbOwner.delete(schema.stores).where(eq(schema.stores.id, storeBId));
  await tenantClient.end();
});

async function setTenant(storeId: string | null) {
  if (storeId === null) {
    await tenantClient.unsafe('RESET app.tenant_id');
    return;
  }
  await tenantClient.unsafe(
    `SELECT set_config('app.tenant_id', '${storeId}', false)`,
  );
}

describe('catalog RLS (products + variants + options + combinations, app_tenant role)', () => {
  it('returns zero rows when no tenant context is set (fail-closed)', async () => {
    await setTenant(null);
    expect((await tenantDb.query.products.findMany()).length).toBe(0);
    expect((await tenantDb.query.productVariants.findMany()).length).toBe(0);
    expect((await tenantDb.query.productVariantOptions.findMany()).length).toBe(0);
    expect((await tenantDb.query.productVariantCombinations.findMany()).length).toBe(0);
  });

  it('shows only store A rows when app.tenant_id = storeA (single-tenant)', async () => {
    await setTenant(storeAId);
    const products = await tenantDb.query.products.findMany();
    expect(products.length).toBe(1);
    expect(products[0].id).toBe(productAId);
    expect(products[0].storeId).toBe(storeAId);
    const variants = await tenantDb.query.productVariants.findMany();
    expect(variants.length).toBe(1);
    expect(variants[0].id).toBe(variantAId);
    const options = await tenantDb.query.productVariantOptions.findMany();
    expect(options.length).toBe(1);
    expect(options[0].id).toBe(optionAId);
    const combos = await tenantDb.query.productVariantCombinations.findMany();
    expect(combos.length).toBe(1);
    expect(combos[0].id).toBe(combinationAId);
  });

  it('does NOT show store B rows when app.tenant_id = storeA (cross-tenant isolation)', async () => {
    await setTenant(storeAId);
    const products = await tenantDb.query.products.findMany();
    expect(products.find((r) => r.id === productBId)).toBeUndefined();
    expect(products.every((r) => r.storeId === storeAId)).toBe(true);
  });

  it('shows store B rows when app.tenant_id = storeB', async () => {
    await setTenant(storeBId);
    const products = await tenantDb.query.products.findMany();
    expect(products.length).toBe(1);
    expect(products[0].id).toBe(productBId);
    expect(products[0].storeId).toBe(storeBId);
  });

  it('rejects inserts whose storeId does not match app.tenant_id (WITH CHECK)', async () => {
    await setTenant(storeAId);
    // products: wrong storeId → reject
    await expect(
      tenantDb.insert(schema.products).values({
        storeId: storeBId, categoryId: (await dbOwner.select({ id: schema.categories.id }).from(schema.categories).where(eq(schema.categories.storeId, storeAId)).limit(1))[0].id,
        titleEn: 'Reject', salePrice: '1.00',
      }),
    ).rejects.toThrow();
    // product_variants: wrong storeId (productId belongs to store A) → reject
    await expect(
      tenantDb.insert(schema.productVariants).values({
        storeId: storeBId, productId: productAId, nameEn: 'Reject',
      }),
    ).rejects.toThrow();
    // product_variant_options: wrong storeId → reject
    await expect(
      tenantDb.insert(schema.productVariantOptions).values({
        variantId: variantAId, storeId: storeBId, nameEn: 'Reject',
      }),
    ).rejects.toThrow();
    // product_variant_combinations: wrong storeId → reject
    await expect(
      tenantDb.insert(schema.productVariantCombinations).values({
        storeId: storeBId, productId: productAId, sku: 'REJECT', combinationKey: 'reject',
      }),
    ).rejects.toThrow();
  });

  it('accepts inserts whose storeId matches app.tenant_id (WITH CHECK accept)', async () => {
    await setTenant(storeAId);
    const catAId = (await dbOwner.select({ id: schema.categories.id }).from(schema.categories).where(eq(schema.categories.storeId, storeAId)).limit(1))[0].id;
    const [prod] = await tenantDb.insert(schema.products).values({
      storeId: storeAId, categoryId: catAId, titleEn: 'OK', salePrice: '2.00',
    }).returning();
    expect(prod.storeId).toBe(storeAId);
    const [variant] = await tenantDb.insert(schema.productVariants).values({
      storeId: storeAId, productId: prod.id, nameEn: 'OK V',
    }).returning();
    expect(variant.storeId).toBe(storeAId);
    const [option] = await tenantDb.insert(schema.productVariantOptions).values({
      variantId: variant.id, storeId: storeAId, nameEn: 'OK O',
    }).returning();
    expect(option.storeId).toBe(storeAId);
    const [combo] = await tenantDb.insert(schema.productVariantCombinations).values({
      storeId: storeAId, productId: prod.id, sku: 'OK-SKU', combinationKey: 'ok-key',
    }).returning();
    expect(combo.storeId).toBe(storeAId);
    // cleanup (as the tenant — allowed since storeId matches)
    await tenantDb.delete(schema.productVariantCombinations).where(eq(schema.productVariantCombinations.id, combo.id));
    await tenantDb.delete(schema.productVariantOptions).where(eq(schema.productVariantOptions.id, option.id));
    await tenantDb.delete(schema.productVariants).where(eq(schema.productVariants.id, variant.id));
    await tenantDb.delete(schema.products).where(eq(schema.products.id, prod.id));
  });
});
```

- [ ] **Step 4: Apply the migration to your local DB**

Run:
```bash
pnpm -C apps/backend db:migrate
```
Expected: migration `0028_catalog_rls` applies (ENABLE+FORCE+policy on the 4 tables). `runMigrations()` runs via `dbOwner` (BYPASSRLS) so the `ALTER TABLE … ENABLE ROW LEVEL SECURITY` succeeds (the migration connection is the owner). If the command fails because `db:migrate` isn't a script, run via the project's existing migration invocation (check `apps/backend/package.json` scripts; the app calls `runMigrations()` at boot, so a test that boots the server or a dedicated `db:migrate` script applies it — use whichever the project uses; `customers.rls.test.ts` shipped the same way).

- [ ] **Step 5: Run the catalog RLS test (live Postgres required)**

Run:
```bash
pnpm -C apps/backend test catalog.rls
```
Expected: all 5 cases PASS — fail-closed (0 rows with no context), single-tenant visibility, cross-tenant isolation, store B visibility, WITH CHECK reject on all 4 tables, WITH CHECK accept on all 4 tables. This requires a live Postgres with the `app_tenant`/`app_admin` roles applied (Phase 0) and `DATABASE_URL` + `RLS_TENANT_PASSWORD` env set (same as `customers.rls.test.ts`).

If `RLS_TENANT_PASSWORD` is not set or the roles aren't applied, the test errors at the `tenantUrl()`/connect step — resolve by running `pnpm -C apps/backend db:roles` (or whatever script runs `rls-roles.ts`) and setting the env var. Do NOT skip or weaken the test.

- [ ] **Step 6: Run the FULL suite with RLS ON (the production-ready gate)**

Run:
```bash
pnpm -C apps/backend typecheck
pnpm -C apps/backend test
```
Expected: typecheck 0 errors; **full suite green with RLS ON**. This is the load-bearing gate: every mock-based test passes (withTenant mocked or self-contained), every real-DB RLS test passes, and — critically — the existing integration/route tests that touch products/variants (cart, checkout, order, payment, return, analytics, pos) pass because the app layer now sets `app.tenant_id` via `withTenant` on every catalog path.

If a test fails with "Product not found" / empty results, a catalog path was missed by the refactor — trace it (the test name tells you the path), add the missing `withTenant` wrap or `tx` thread, and re-run. The most likely misses (per spec §8): a `pricingRepo`/`productRepo` call in a service not yet wrapped, or a bare `db.query.products` in a repo. Grep for the failing table name in the failing module.

- [ ] **Step 7: Verify no `console.log` / `any` / `require` introduced**

Run:
```bash
grep -rn "console\.log" apps/backend/src/modules/pricing apps/backend/src/modules/product apps/backend/src/modules/catalog 2>/dev/null
grep -rn "require(" apps/backend/src/modules/pricing apps/backend/src/modules/product apps/backend/src/modules/catalog 2>/dev/null
```
Expected: no hits (test files use `/* eslint-disable @typescript-eslint/no-explicit-any */` for mock casts — that's the existing pattern, acceptable).

- [ ] **Step 8: Force-add the gitignored migration + commit**

```bash
git add -f apps/backend/drizzle/0028_catalog_rls.sql
git add apps/backend/drizzle/meta/_journal.json apps/backend/src/modules/catalog/catalog.rls.test.ts
git commit -m "feat(rls): enable RLS on products + product_variants + product_variant_options + product_variant_combinations (Phase 1)

Migration 0028: ENABLE+FORCE+tenant_iso (§4.1 direct, NULLIF-hardened) on all
4 catalog tables (each carries own store_id). Roles/grants already generic via
rls-roles.ts. catalog.rls.test.ts: real-DB negative test (fail-closed, single-
tenant, cross-tenant isolation, WITH CHECK reject+accept on all 4 tables).
Full suite green with RLS ON.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification (after all tasks)

- [ ] `pnpm -C apps/backend typecheck` → 0 errors.
- [ ] `pnpm -C apps/backend test` → full suite green **with RLS ON** (migration `0028` applied).
- [ ] No new `console.log` / `any` (in source) / `require()`.
- [ ] All 6 task commits present on `fix/domain-feature-p0` (not pushed).
- [ ] Update `docs/PROGRESS.md` with the catalog RLS phase outcome + the new tables-with-RLS list (append to the existing RLS Phase 1 progress section).
- [ ] Update the memory file `C:\Users\aroky\.claude\projects\D--project-saas-ecom\memory\rls_phase1_customers.md` (or a new `rls_phase1_catalog.md`) with: migration `0028` shipped, 4 catalog tables now RLS, total test count green with RLS ON, next module = ? (per parent spec §5 ordering — likely reviews/shipping/tax or the categories/modifier cluster). Tables with RLS after this phase: wishlists, orders, order_items, carts, cart_items, coupons, coupon_usages, customers, customer_addresses, products, product_variants, product_variant_options, product_variant_combinations.
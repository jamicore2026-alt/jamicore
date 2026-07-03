# RLS Phase 1 — taxonomy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable PostgreSQL Row-Level Security on the 6 taxonomy tables (categories, subcategories, modifier_groups, modifier_options, product_bundles, product_bundle_items) so the database enforces tenant isolation independently of the application layer, and thread a tenant-scoped transaction (`withTenant`) through every application read/write of those tables.

**Architecture:** All 6 tables carry their own `storeId notNull` → §4.1 direct tenant_iso policies (NULLIF-hardened, both USING + WITH CHECK). Wrap the bare-db service layers (category.service, modifier.service, bundle.service) in `withTenant(storeId, fn)` (Approach A — service owns the tx), thread the tx into category.repo (9 methods) + modifier.repo (11 functions), thread the tx into pricing.service:102 `bundleRepo.findById`, replace bundle.service's bare `db.transaction` with `withTenant`'s own tx, switch seed taxonomy inserts/reads to `dbOwner`, then enable RLS via migration 0029. bundle.repo, pricing.repo modifier lookups, product.repo relations, and seo.route.public sitemap reads are already threaded/wrapped (no change). Tasks 1–4 are pure refactor (RLS off → suite stays green); Task 5 flips RLS on and adds the negative real-DB test.

**Tech Stack:** Fastify v5, Drizzle ORM, PostgreSQL 17, Vitest, pnpm (NEVER npm), TypeScript strict ESM.

## Global Constraints

Copied verbatim from the spec (`docs/superpowers/specs/2026-07-03-rls-phase1-taxonomy-design.md`) — every task's requirements implicitly include these:

- Tables in scope (Drizzle symbol → Postgres name): `categories`→`categories`, `subcategories`→`subcategories`, `modifierGroups`→`modifier_groups`, `modifierOptions`→`modifier_options`, `productBundles`→`product_bundles`, `productBundleItems`→`product_bundle_items`.
- All 6 carry own `storeId notNull` → **§4.1 direct tenant-table policy** (no §4.2 subquery children).
- **Approach A — service owns the transaction:** each service entry wrapped in `withTenant(storeId, (tx) => repo.<method>(..., tx))`. `withTenant` opens a `db.transaction`, calls `set_config('app.tenant_id', storeId, true)` (tx-local), forwards tx to repo. Repos accept `tx?: DbOrTx` and use `const executor = tx ?? db;`.
- `DbOrTx = typeof db | Transaction` from `apps/backend/src/modules/_shared/db-types.ts`.
- **RLS policy shape (NULLIF-hardened §4.1, both USING + WITH CHECK):**
  ```sql
  ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
  ALTER TABLE <table> FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS tenant_iso ON <table>;
  CREATE POLICY tenant_iso ON <table>
    FOR ALL
    USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
  ```
  Apply to all 6 tables (substitute each table name). NULLIF-hardening means unset/NULL `app.tenant_id` yields zero rows instead of `''::uuid` throwing — fail-closed for code paths that forget `withTenant`.
- Migration 0029: `apps/backend/drizzle/0029_taxonomy_rls.sql` (gitignored → `git add -f`). No GRANT changes (`rls-roles.ts` is generic). Journal: append `idx: 30, version: 7, when: <ISO timestamp>, tag: "0029_taxonomy_rls", breakpoints: true` to `apps/backend/drizzle/meta/_journal.json`.
- `dbOwner`/`dbAdmin` (BYPASSRLS) for seed inserts + cross-tenant/admin reads. `db` is the `app_tenant` client (RLS-enforced).
- **pnpm ONLY** — never `npm`. **Zero TS errors** (`pnpm --filter backend typecheck`). **No `console.log`** in source (use `fastify.log.*`; seed.ts is allowed its existing `console.log` seed-progress lines — only `db`→`dbOwner` changes there). **No `any`** in source (test files may use `as any` in fixture payloads + the `/* eslint-disable @typescript-eslint/no-explicit-any */` header). **ESM imports only** (`.js` extensions). **No inline preHandler.** **`ErrorCodes.*`** — no bare string literals for error codes. **storeId from JWT/request.user ONLY** — never from body/query/params. **Commit only when the user explicitly asks; never push without explicit user request.**
- **Goal gate:** all test files green, `1036+` assertions pass with RLS ON; `pnpm --filter backend typecheck` 0 errors; no new `console.log`; no `any` in source.

---

## Reference

- **Spec:** `docs/superpowers/specs/2026-07-03-rls-phase1-taxonomy-design.md` — §3 has the full bare-db audit (load-bearing). §6 documents the fix-wave lesson applied upfront: the cross-module reads (bundle.service all entries + pricing.service:102) are folded into Tasks 1–3, not deferred to a fix wave.
- **Predecessor plan (structure to mirror):** `docs/superpowers/plans/2026-07-03-rls-phase1-catalog.md`.
- **Patterns to mirror:**
  - Real-DB RLS test: `apps/backend/src/modules/catalog/catalog.rls.test.ts`.
  - Sentinel-tx withTenant test: `apps/backend/src/modules/product/product.service.withTenant.test.ts` and `apps/backend/src/modules/pricing/pricing.service.withTenant.test.ts`.

## Key file paths

- `apps/backend/src/modules/category/category.repo.ts` — MODIFY (Task 1): add `tx?: DbOrTx` to 9 methods.
- `apps/backend/src/modules/category/category.service.ts` — MODIFY (Task 1): wrap 8 entries in `withTenant`.
- `apps/backend/src/modules/category/category.service.withTenant.test.ts` — CREATE (Task 1).
- `apps/backend/src/modules/modifier/modifier.repo.ts` — MODIFY (Task 2): add `tx?: DbOrTx` to 10 functions.
- `apps/backend/src/modules/modifier/modifier.service.ts` — MODIFY (Task 2): wrap 10 entries in `withTenant`.
- `apps/backend/src/modules/modifier/modifier.service.withTenant.test.ts` — CREATE (Task 2).
- `apps/backend/src/modules/bundle/bundle.service.ts` — MODIFY (Task 3): wrap 6 entries in `withTenant`, remove bare `db.transaction` + `db` import.
- `apps/backend/src/modules/bundle/bundle.service.withTenant.test.ts` — CREATE (Task 3).
- `apps/backend/src/modules/pricing/pricing.service.ts` — MODIFY (Task 3): thread `tx` into `bundleRepo.findById` at line ~102.
- `apps/backend/src/modules/pricing/pricing.service.withTenant.test.ts` — MODIFY (Task 3): add bundle-path assertion.
- `apps/backend/src/db/seed.ts` — MODIFY (Task 4): `db`→`dbOwner` for categories/subcategories/modifierGroups/modifierOptions.
- `apps/backend/drizzle/0029_taxonomy_rls.sql` — CREATE (Task 5).
- `apps/backend/drizzle/meta/_journal.json` — MODIFY (Task 5): append idx 30.
- `apps/backend/src/modules/taxonomy/taxonomy.rls.test.ts` — CREATE (Task 5).

## File Structure

The 6 taxonomy tables are owned by 3 modules (category, modifier, bundle) + read cross-module by pricing (bundle lookup) + product (relations, already threaded). No new module dir is created except `modules/taxonomy/` to hold the single real-DB RLS test (mirrors `modules/catalog/catalog.rls.test.ts` living alongside the catalog module's RLS test). Each modified file keeps its single responsibility (repo = DB-only, service = business logic + tx ownership, test = one behavior).

---

### Task 1: category module — tx-thread repo + wrap service in withTenant + sentinel test

**Files:**
- Modify: `apps/backend/src/modules/category/category.repo.ts`
- Modify: `apps/backend/src/modules/category/category.service.ts`
- Create: `apps/backend/src/modules/category/category.service.withTenant.test.ts`

**Interfaces:**
- Consumes: `withTenant(storeId, fn)` from `../../lib/withTenant.js`; `DbOrTx` from `../_shared/db-types.js`.
- Produces: `categoryRepo.<method>(..., tx?: DbOrTx)` for all 9 methods; `categoryService.<entry>` each running inside `withTenant`. Later tasks do NOT call categoryRepo directly — only categoryService does — so the only consumer of the new `tx` param is categoryService itself. (Note: `product.route.merchant.ts` calls `categoryService.findById`; that path is covered by this wrap. `product.route.merchant.test.ts` mocks `categoryService` so the wrap is short-circuited there — no change expected, but Task 1 runs the full suite to confirm.)

- [ ] **Step 1: Write the failing sentinel test**

Create `apps/backend/src/modules/category/category.service.withTenant.test.ts`:

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
// Verifies categoryService wraps every entry in withTenant(storeId, fn) and
// threads the tx into categoryRepo (RLS Phase 1, Approach A).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  // Run fn with a sentinel tx so we can assert categoryRepo received it.
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn({ __sentinel: 'tx' });
  },
}));

const { categoryRepo } = vi.hoisted(() => ({
  categoryRepo: {
    findManyByStoreId: vi.fn().mockResolvedValue([]),
    countByStoreId: vi.fn().mockResolvedValue([{ count: 0 }]),
    findById: vi.fn().mockResolvedValue({ id: 'c1', storeId: 's1', subcategories: [] }),
    create: vi.fn().mockResolvedValue([{ id: 'c1', storeId: 's1' }]),
    update: vi.fn().mockResolvedValue([{ id: 'c1', storeId: 's1' }]),
    delete: vi.fn().mockResolvedValue([{ id: 'c1', storeId: 's1' }]),
    createSubcategory: vi.fn().mockResolvedValue([{ id: 'sc1', storeId: 's1' }]),
    updateSubcategory: vi.fn().mockResolvedValue([{ id: 'sc1', storeId: 's1' }]),
    deleteSubcategory: vi.fn().mockResolvedValue([{ id: 'sc1', storeId: 's1' }]),
  },
}));
vi.mock('./category.repo.js', () => ({ categoryRepo }));

import { categoryService } from './category.service.js';

const tx = expect.objectContaining({ __sentinel: 'tx' });

describe('categoryService wraps category work in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findByStoreId runs inside withTenant(storeId) and threads tx into both repo reads', async () => {
    await categoryService.findByStoreId('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(categoryRepo.findManyByStoreId).toHaveBeenCalledWith('s1', undefined, tx);
    expect(categoryRepo.countByStoreId).toHaveBeenCalledWith('s1', tx);
  });

  it('findById runs inside withTenant(storeId) and threads tx', async () => {
    await categoryService.findById('c1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(categoryRepo.findById).toHaveBeenCalledWith('c1', 's1', tx);
  });

  it('create runs inside withTenant(data.storeId) and threads tx', async () => {
    await categoryService.create({ storeId: 's1', nameEn: 'Cat' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(categoryRepo.create).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1' }), tx);
  });

  it('update runs inside withTenant(storeId) and threads tx', async () => {
    await categoryService.update('c1', 's1', { nameEn: 'X' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(categoryRepo.update).toHaveBeenCalledWith('c1', 's1', { nameEn: 'X' }, tx);
  });

  it('delete runs inside withTenant(storeId) and threads tx', async () => {
    await categoryService.delete('c1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(categoryRepo.delete).toHaveBeenCalledWith('c1', 's1', tx);
  });

  it('createSubcategory runs inside withTenant(data.storeId) and threads tx', async () => {
    await categoryService.createSubcategory({ storeId: 's1', categoryId: 'c1', nameEn: 'Sub' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(categoryRepo.createSubcategory).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1' }), tx);
  });

  it('updateSubcategory runs inside withTenant(storeId) and threads tx', async () => {
    await categoryService.updateSubcategory('sc1', 's1', { nameEn: 'X' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(categoryRepo.updateSubcategory).toHaveBeenCalledWith('sc1', 's1', { nameEn: 'X' }, tx);
  });

  it('deleteSubcategory runs inside withTenant(storeId) and threads tx', async () => {
    await categoryService.deleteSubcategory('sc1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(categoryRepo.deleteSubcategory).toHaveBeenCalledWith('sc1', 's1', tx);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend vitest run src/modules/category/category.service.withTenant.test.ts`
Expected: FAIL — `categoryRepo.create` (etc.) called with 2 args, not 3 (the sentinel tx); and `withTenant` is not imported/invoked by the service yet. (Some assertions on `withTenantMock` may already pass spuriously if the real `withTenant` happens to call back, but the repo-arg assertions fail because the real service doesn't pass `tx`.)

- [ ] **Step 3: Thread tx into category.repo (9 methods)**

Replace the entire body of `apps/backend/src/modules/category/category.repo.ts` with:

```ts
// Category repository — Drizzle queries only, no business logic
import { db } from '../../db/index.js';
import { categories, subcategories } from '../../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

export type CategorySelect = typeof categories.$inferSelect;
export type CategoryInsert = typeof categories.$inferInsert;
export type SubcategorySelect = typeof subcategories.$inferSelect;
export type SubcategoryInsert = typeof subcategories.$inferInsert;

export const categoryRepo = {
  findManyByStoreId(storeId: string, options?: { limit?: number; offset?: number }, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor.query.categories.findMany({
      where: eq(categories.storeId, storeId),
      with: {
        subcategories: true,
      },
      orderBy: [desc(categories.createdAt)],
      limit: options?.limit ?? 200,
      offset: options?.offset,
    });
  },

  countByStoreId(storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor
      .select({ count: sql<number>`count(*)::int` })
      .from(categories)
      .where(eq(categories.storeId, storeId));
  },

  findById(id: string, storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor.query.categories.findFirst({
      where: and(eq(categories.id, id), eq(categories.storeId, storeId)),
      with: {
        subcategories: true,
      },
    });
  },

  create(data: CategoryInsert, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor.insert(categories).values(data).returning();
  },

  update(id: string, storeId: string, data: Partial<CategoryInsert>, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(categories.id, id), eq(categories.storeId, storeId)))
      .returning();
  },

  delete(id: string, storeId: string, tx?: DbOrTx): Promise<CategorySelect[]> {
    const executor = tx ?? db;
    return executor
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.storeId, storeId)))
      .returning();
  },

  // --- Subcategory queries ---

  createSubcategory(data: SubcategoryInsert, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor.insert(subcategories).values(data).returning();
  },

  updateSubcategory(id: string, storeId: string, data: Partial<SubcategoryInsert>, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor
      .update(subcategories)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(subcategories.id, id), eq(subcategories.storeId, storeId)))
      .returning();
  },

  deleteSubcategory(id: string, storeId: string, tx?: DbOrTx): Promise<SubcategorySelect[]> {
    const executor = tx ?? db;
    return executor
      .delete(subcategories)
      .where(and(eq(subcategories.id, id), eq(subcategories.storeId, storeId)))
      .returning();
  },
};
```

- [ ] **Step 4: Wrap category.service in withTenant**

Replace the entire body of `apps/backend/src/modules/category/category.service.ts` with:

```ts
// Category service — business logic, calls repo, throws domain errors.
// RLS Phase 1 (Approach A): every entry runs inside withTenant(storeId, fn)
// so app.tenant_id is set on the tx and forwarded to categoryRepo.
import { categoryRepo } from './category.repo.js';
import { ErrorCodes } from '../../errors/codes.js';
import { withTenant } from '../../lib/withTenant.js';

export const categoryService = {
  async findByStoreId(
    storeId: string,
    options?: { limit?: number; offset?: number },
  ) {
    return withTenant(storeId, async (tx) => {
      const [items, countResult] = await Promise.all([
        categoryRepo.findManyByStoreId(storeId, options, tx),
        categoryRepo.countByStoreId(storeId, tx),
      ]);

      const total = countResult[0]?.count ?? 0;

      return { items, total };
    });
  },

  async findById(id: string, storeId: string) {
    const category = await withTenant(storeId, (tx) => categoryRepo.findById(id, storeId, tx));

    if (!category) {
      throw Object.assign(new Error('Category not found'), {
        code: ErrorCodes.CATEGORY_NOT_FOUND,
      });
    }

    return category;
  },

  async create(data: Parameters<typeof categoryRepo.create>[0]) {
    const [category] = await withTenant(data.storeId, (tx) => categoryRepo.create(data, tx));

    if (!category) {
      throw Object.assign(new Error('Failed to create category'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return category;
  },

  async update(id: string, storeId: string, data: Parameters<typeof categoryRepo.update>[2]) {
    const [category] = await withTenant(storeId, (tx) => categoryRepo.update(id, storeId, data, tx));

    if (!category) {
      throw Object.assign(new Error('Category not found'), {
        code: ErrorCodes.CATEGORY_NOT_FOUND,
      });
    }

    return category;
  },

  async delete(id: string, storeId: string) {
    const [category] = await withTenant(storeId, (tx) => categoryRepo.delete(id, storeId, tx));

    if (!category) {
      throw Object.assign(new Error('Category not found'), {
        code: ErrorCodes.CATEGORY_NOT_FOUND,
      });
    }

    return category;
  },

  // --- Subcategory operations ---

  async createSubcategory(data: Parameters<typeof categoryRepo.createSubcategory>[0]) {
    const [subcategory] = await withTenant(data.storeId, (tx) =>
      categoryRepo.createSubcategory(data, tx),
    );

    if (!subcategory) {
      throw Object.assign(new Error('Failed to create subcategory'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return subcategory;
  },

  async updateSubcategory(
    id: string,
    storeId: string,
    data: Parameters<typeof categoryRepo.updateSubcategory>[2],
  ) {
    const [subcategory] = await withTenant(storeId, (tx) =>
      categoryRepo.updateSubcategory(id, storeId, data, tx),
    );

    if (!subcategory) {
      throw Object.assign(new Error('Subcategory not found'), {
        code: ErrorCodes.CATEGORY_NOT_FOUND,
      });
    }

    return subcategory;
  },

  async deleteSubcategory(id: string, storeId: string) {
    const [subcategory] = await withTenant(storeId, (tx) =>
      categoryRepo.deleteSubcategory(id, storeId, tx),
    );

    if (!subcategory) {
      throw Object.assign(new Error('Subcategory not found'), {
        code: ErrorCodes.CATEGORY_NOT_FOUND,
      });
    }

    return subcategory;
  },
};
```

- [ ] **Step 5: Run the sentinel test to verify it passes**

Run: `pnpm --filter backend vitest run src/modules/category/category.service.withTenant.test.ts`
Expected: PASS — 8 tests green.

- [ ] **Step 6: Run typecheck**

Run: `pnpm --filter backend typecheck`
Expected: 0 errors.

- [ ] **Step 7: Run the full backend suite (RLS still OFF for taxonomy — confirm no regression)**

Run: `pnpm --filter backend vitest run`
Expected: all green (1036+). category repo/service now thread tx but pass `undefined` when no tx is supplied by a direct caller — only categoryService calls categoryRepo, and it always passes the withTenant tx, so no bare-db path remains. `product.route.merchant.test.ts` mocks `categoryService` so it is unaffected.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/modules/category/category.repo.ts apps/backend/src/modules/category/category.service.ts apps/backend/src/modules/category/category.service.withTenant.test.ts
git commit -m "refactor(rls): thread tx into category.repo + wrap category.service in withTenant (Phase 1 taxonomy)"
```

---

### Task 2: modifier module — tx-thread repo + wrap service in withTenant + sentinel test

**Files:**
- Modify: `apps/backend/src/modules/modifier/modifier.repo.ts`
- Modify: `apps/backend/src/modules/modifier/modifier.service.ts`
- Create: `apps/backend/src/modules/modifier/modifier.service.withTenant.test.ts`

**Interfaces:**
- Consumes: `withTenant` from `../../lib/withTenant.js`; `DbOrTx` from `../_shared/db-types.js`.
- Produces: 10 exported repo functions each taking `tx?: DbOrTx` as the **last** parameter. `findGroupsByProductId(productId, storeId, limit = 50, tx?: DbOrTx)` — `tx` is added after the existing `limit` default arg (preserves the positional `limit` arg so any caller passing `limit` is unaffected). `modifierService.<entry>` each running inside `withTenant`. No other module calls `modifier.repo` directly (audit §3.3) — only `modifier.service` does.

- [ ] **Step 1: Write the failing sentinel test**

Create `apps/backend/src/modules/modifier/modifier.service.withTenant.test.ts`:

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
// Verifies modifierService wraps every entry in withTenant(storeId, fn) and
// threads the tx into the modifier repo (RLS Phase 1, Approach A).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  // Run fn with a sentinel tx so we can assert the repo received it.
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn({ __sentinel: 'tx' });
  },
}));

const repoMock = vi.hoisted(() => ({
  findGroupsByStoreId: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  findGroupById: vi.fn().mockResolvedValue({ id: 'g1', storeId: 's1' }),
  findGroupsByProductId: vi.fn().mockResolvedValue([]),
  insertGroup: vi.fn().mockResolvedValue({ id: 'g1', storeId: 's1' }),
  updateGroup: vi.fn().mockResolvedValue({ id: 'g1', storeId: 's1' }),
  deleteGroup: vi.fn().mockResolvedValue({ id: 'g1', storeId: 's1' }),
  findOptionById: vi.fn().mockResolvedValue({ id: 'o1', storeId: 's1' }),
  insertOption: vi.fn().mockResolvedValue({ id: 'o1', storeId: 's1' }),
  updateOption: vi.fn().mockResolvedValue({ id: 'o1', storeId: 's1' }),
  deleteOption: vi.fn().mockResolvedValue({ id: 'o1', storeId: 's1' }),
}));
vi.mock('./modifier.repo.js', () => repoMock);

import { modifierService } from './modifier.service.js';

const tx = expect.objectContaining({ __sentinel: 'tx' });

describe('modifierService wraps modifier work in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findByStoreId runs inside withTenant(storeId) and threads tx', async () => {
    await modifierService.findByStoreId('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoMock.findGroupsByStoreId).toHaveBeenCalledWith('s1', undefined, tx);
  });

  it('findById runs inside withTenant(storeId) and threads tx', async () => {
    await modifierService.findById('g1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoMock.findGroupById).toHaveBeenCalledWith('g1', 's1', tx);
  });

  it('findByProductId runs inside withTenant(storeId) and threads tx', async () => {
    await modifierService.findByProductId('p1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoMock.findGroupsByProductId).toHaveBeenCalledWith('p1', 's1', 50, tx);
  });

  it('create runs inside withTenant(data.storeId) and threads tx', async () => {
    await modifierService.create({ storeId: 's1', name: 'G' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoMock.insertGroup).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1' }), tx);
  });

  it('update runs inside withTenant(storeId) and threads tx', async () => {
    await modifierService.update('g1', 's1', { name: 'X' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoMock.updateGroup).toHaveBeenCalledWith('g1', 's1', { name: 'X' }, tx);
  });

  it('delete runs inside withTenant(storeId) and threads tx', async () => {
    await modifierService.delete('g1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoMock.deleteGroup).toHaveBeenCalledWith('g1', 's1', tx);
  });

  it('findOptionById runs inside withTenant(storeId) and threads tx', async () => {
    await modifierService.findOptionById('o1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoMock.findOptionById).toHaveBeenCalledWith('o1', 's1', tx);
  });

  it('createOption runs inside withTenant(data.storeId) and threads tx', async () => {
    await modifierService.createOption({ storeId: 's1', modifierGroupId: 'g1', nameEn: 'O' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoMock.insertOption).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1' }), tx);
  });

  it('updateOption runs inside withTenant(storeId) and threads tx', async () => {
    await modifierService.updateOption('o1', 's1', { nameEn: 'X' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoMock.updateOption).toHaveBeenCalledWith('o1', 's1', { nameEn: 'X' }, tx);
  });

  it('deleteOption runs inside withTenant(storeId) and threads tx', async () => {
    await modifierService.deleteOption('o1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoMock.deleteOption).toHaveBeenCalledWith('o1', 's1', tx);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend vitest run src/modules/modifier/modifier.service.withTenant.test.ts`
Expected: FAIL — repo calls not yet receiving the sentinel tx; `withTenant` not yet imported by the service.

- [ ] **Step 3: Thread tx into modifier.repo (10 functions)**

Replace the entire body of `apps/backend/src/modules/modifier/modifier.repo.ts` with:

```ts
// Modifier repository — DB-only operations, no business logic
import { db } from '../../db/index.js';
import { modifierGroups, modifierOptions } from '../../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

// ─── Modifier Group queries ───

export async function findGroupsByStoreId(
  storeId: string,
  options?: { limit?: number; offset?: number },
  tx?: DbOrTx,
) {
  const executor = tx ?? db;
  const items = await executor.query.modifierGroups.findMany({
    where: eq(modifierGroups.storeId, storeId),
    with: {
      product: true,
      category: true,
      options: true,
    },
    orderBy: [desc(modifierGroups.createdAt)],
    limit: options?.limit ?? 50,
    offset: options?.offset,
  });

  const [{ count }] = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(modifierGroups)
    .where(eq(modifierGroups.storeId, storeId));

  return { items, total: count };
}

export async function findGroupById(id: string, storeId: string, tx?: DbOrTx) {
  const executor = tx ?? db;
  return executor.query.modifierGroups.findFirst({
    where: and(eq(modifierGroups.id, id), eq(modifierGroups.storeId, storeId)),
    with: {
      product: true,
      category: true,
      options: true,
    },
  });
}

// NOTE: `tx` is added AFTER the existing `limit` default arg to preserve the
// positional `limit` parameter for any caller that passes it positionally.
export async function findGroupsByProductId(
  productId: string,
  storeId: string,
  limit = 50,
  tx?: DbOrTx,
) {
  const executor = tx ?? db;
  return executor.query.modifierGroups.findMany({
    where: and(
      eq(modifierGroups.productId, productId),
      eq(modifierGroups.storeId, storeId),
    ),
    with: {
      options: true,
    },
    orderBy: [desc(modifierGroups.sortOrder)],
    limit,
  });
}

export async function insertGroup(data: typeof modifierGroups.$inferInsert, tx?: DbOrTx): Promise<typeof modifierGroups.$inferSelect> {
  const executor = tx ?? db;
  const [group] = await executor.insert(modifierGroups).values(data).returning();
  return group;
}

export async function updateGroup(
  id: string,
  storeId: string,
  data: Partial<typeof modifierGroups.$inferInsert>,
  tx?: DbOrTx,
): Promise<typeof modifierGroups.$inferSelect | undefined> {
  const executor = tx ?? db;
  const [group] = await executor
    .update(modifierGroups)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(modifierGroups.id, id), eq(modifierGroups.storeId, storeId)))
    .returning();
  return group;
}

export async function deleteGroup(id: string, storeId: string, tx?: DbOrTx): Promise<typeof modifierGroups.$inferSelect | undefined> {
  const executor = tx ?? db;
  const [group] = await executor
    .delete(modifierGroups)
    .where(and(eq(modifierGroups.id, id), eq(modifierGroups.storeId, storeId)))
    .returning();
  return group;
}

// ─── Modifier Option queries ───

export async function findOptionById(id: string, storeId: string, tx?: DbOrTx): Promise<typeof modifierOptions.$inferSelect | undefined> {
  const executor = tx ?? db;
  return executor.query.modifierOptions.findFirst({
    where: and(eq(modifierOptions.id, id), eq(modifierOptions.storeId, storeId)),
  });
}

export async function insertOption(data: typeof modifierOptions.$inferInsert, tx?: DbOrTx): Promise<typeof modifierOptions.$inferSelect> {
  const executor = tx ?? db;
  const [option] = await executor.insert(modifierOptions).values(data).returning();
  return option;
}

export async function updateOption(
  id: string,
  storeId: string,
  data: Partial<typeof modifierOptions.$inferInsert>,
  tx?: DbOrTx,
): Promise<typeof modifierOptions.$inferSelect | undefined> {
  const executor = tx ?? db;
  const [option] = await executor
    .update(modifierOptions)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(modifierOptions.id, id), eq(modifierOptions.storeId, storeId)))
    .returning();
  return option;
}

export async function deleteOption(id: string, storeId: string, tx?: DbOrTx): Promise<typeof modifierOptions.$inferSelect | undefined> {
  const executor = tx ?? db;
  const [option] = await executor
    .delete(modifierOptions)
    .where(and(eq(modifierOptions.id, id), eq(modifierOptions.storeId, storeId)))
    .returning();
  return option;
}
```

- [ ] **Step 4: Wrap modifier.service in withTenant**

Replace the entire body of `apps/backend/src/modules/modifier/modifier.service.ts` with:

```ts
// Modifier Service - CRUD for modifier groups with options.
// RLS Phase 1 (Approach A): every entry runs inside withTenant(storeId, fn)
// so app.tenant_id is set on the tx and forwarded to the repo.
import { ErrorCodes } from '../../errors/codes.js';
import { withTenant } from '../../lib/withTenant.js';
import * as repo from './modifier.repo.js';

export const modifierService = {
  // --- Modifier Group operations ---

  async findByStoreId(
    storeId: string,
    options?: { limit?: number; offset?: number },
  ) {
    return withTenant(storeId, (tx) => repo.findGroupsByStoreId(storeId, options, tx));
  },

  async findById(id: string, storeId: string) {
    const group = await withTenant(storeId, (tx) => repo.findGroupById(id, storeId, tx));

    if (!group) {
      throw Object.assign(new Error('Modifier group not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return group;
  },

  async findByProductId(productId: string, storeId: string) {
    return withTenant(storeId, (tx) => repo.findGroupsByProductId(productId, storeId, 50, tx));
  },

  async create(data: typeof import('../../db/schema.js').modifierGroups.$inferInsert) {
    const group = await withTenant(data.storeId, (tx) => repo.insertGroup(data, tx));

    if (!group) {
      throw Object.assign(new Error('Failed to create modifier group'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return group;
  },

  async update(
    id: string,
    storeId: string,
    data: Partial<typeof import('../../db/schema.js').modifierGroups.$inferInsert>,
  ) {
    const group = await withTenant(storeId, (tx) => repo.updateGroup(id, storeId, data, tx));

    if (!group) {
      throw Object.assign(new Error('Modifier group not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return group;
  },

  async delete(id: string, storeId: string) {
    const group = await withTenant(storeId, (tx) => repo.deleteGroup(id, storeId, tx));

    if (!group) {
      throw Object.assign(new Error('Modifier group not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return group;
  },

  // --- Modifier Option operations ---

  async findOptionById(id: string, storeId: string) {
    const option = await withTenant(storeId, (tx) => repo.findOptionById(id, storeId, tx));

    if (!option) {
      throw Object.assign(new Error('Modifier option not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return option;
  },

  async createOption(data: typeof import('../../db/schema.js').modifierOptions.$inferInsert) {
    const option = await withTenant(data.storeId, (tx) => repo.insertOption(data, tx));

    if (!option) {
      throw Object.assign(new Error('Failed to create modifier option'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return option;
  },

  async updateOption(
    id: string,
    storeId: string,
    data: Partial<typeof import('../../db/schema.js').modifierOptions.$inferInsert>,
  ) {
    const option = await withTenant(storeId, (tx) => repo.updateOption(id, storeId, data, tx));

    if (!option) {
      throw Object.assign(new Error('Modifier option not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return option;
  },

  async deleteOption(id: string, storeId: string) {
    const option = await withTenant(storeId, (tx) => repo.deleteOption(id, storeId, tx));

    if (!option) {
      throw Object.assign(new Error('Modifier option not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return option;
  },
};
```

- [ ] **Step 5: Run the sentinel test to verify it passes**

Run: `pnpm --filter backend vitest run src/modules/modifier/modifier.service.withTenant.test.ts`
Expected: PASS — 10 tests green.

- [ ] **Step 6: Run typecheck**

Run: `pnpm --filter backend typecheck`
Expected: 0 errors.

- [ ] **Step 7: Run the full backend suite**

Run: `pnpm --filter backend vitest run`
Expected: all green (1036+). `modifier.repo`'s `findGroupsByProductId` now has `tx` as the 4th arg; `modifier.service.findByProductId` calls it as `(productId, storeId, 50, tx)`. No other caller passes `limit` positionally (audit §3.3 — only modifier.service calls modifier.repo), so no positional breakage.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/modules/modifier/modifier.repo.ts apps/backend/src/modules/modifier/modifier.service.ts apps/backend/src/modules/modifier/modifier.service.withTenant.test.ts
git commit -m "refactor(rls): thread tx into modifier.repo + wrap modifier.service in withTenant (Phase 1 taxonomy)"
```

---

### Task 3: bundle.service — wrap in withTenant (replace bare db.transaction) + pricing.service bundle-lookup tx + tests

**Files:**
- Modify: `apps/backend/src/modules/bundle/bundle.service.ts`
- Create: `apps/backend/src/modules/bundle/bundle.service.withTenant.test.ts`
- Modify: `apps/backend/src/modules/pricing/pricing.service.ts` (the `bundleRepo.findById(params.bundleId, storeId)` call at ~line 102)
- Modify: `apps/backend/src/modules/pricing/pricing.service.withTenant.test.ts`

**Interfaces:**
- Consumes: `withTenant` from `../../lib/withTenant.js`. `bundleRepo` is ALREADY threaded (`tx?: DbOrTx` on every method, `executor = tx ?? db`) — Task 3 changes ONLY the callers (bundle.service + pricing.service:102), not bundle.repo.
- Produces: `bundleService.<entry>` each running inside `withTenant`, all `bundleRepo` calls receiving the withTenant tx; `bundle.service` no longer imports `db`; `pricing.service`'s bundle lookup receives `tx`.
- `bundleRepo` method signatures (already present, for reference when writing the test): `findManyByStoreId(storeId, options?, tx?)`, `findById(bundleId, storeId, tx?)`, `findBundlesByProductId(productId, storeId, tx?, limit = 50)`, `findProductsByIds(productIds, storeId, tx?, limit = 50)`, `createBundle(data, tx?)`, `createBundleItems(items, tx?)`, `updateBundle(bundleId, storeId, data, tx?)`, `deleteBundleItemsByBundleId(bundleId, storeId, tx?)`, `deleteBundle(bundleId, storeId, tx?)`.

- [ ] **Step 1: Write the failing sentinel test**

Create `apps/backend/src/modules/bundle/bundle.service.withTenant.test.ts`:

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
// Verifies bundleService wraps every entry in withTenant(storeId, fn) and
// threads the tx into bundleRepo — including the create/update paths that
// previously used a bare db.transaction with no app.tenant_id (RLS Phase 1,
// Approach A). bundleRepo is already tx-threaded; this test pins the callers.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  // Run fn with a sentinel tx so we can assert bundleRepo received it.
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn({ __sentinel: 'tx' });
  },
}));

const { bundleRepo } = vi.hoisted(() => ({
  bundleRepo: {
    findManyByStoreId: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    findById: vi.fn().mockResolvedValue({ id: 'b1', storeId: 's1', isActive: true, items: [] }),
    findBundlesByProductId: vi.fn().mockResolvedValue([]),
    findProductsByIds: vi.fn().mockResolvedValue([
      { id: 'p1', isPublished: true },
      { id: 'p2', isPublished: true },
    ]),
    createBundle: vi.fn().mockResolvedValue({ id: 'b1', storeId: 's1' }),
    createBundleItems: vi.fn().mockResolvedValue([]),
    updateBundle: vi.fn().mockResolvedValue({ id: 'b1', storeId: 's1' }),
    deleteBundleItemsByBundleId: vi.fn().mockResolvedValue(undefined),
    deleteBundle: vi.fn().mockResolvedValue({ id: 'b1', storeId: 's1' }),
  },
}));
vi.mock('./bundle.repo.js', () => ({ bundleRepo }));

import { bundleService } from './bundle.service.js';

const tx = expect.objectContaining({ __sentinel: 'tx' });

describe('bundleService wraps bundle work in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findByStoreId runs inside withTenant(storeId) and threads tx', async () => {
    await bundleService.findByStoreId('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(bundleRepo.findManyByStoreId).toHaveBeenCalledWith('s1', expect.any(Object), tx);
  });

  it('findById runs inside withTenant(storeId) and threads tx', async () => {
    await bundleService.findById('b1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(bundleRepo.findById).toHaveBeenCalledWith('b1', 's1', tx);
  });

  it('findBundlesByProductId runs inside withTenant(storeId) and threads tx', async () => {
    await bundleService.findBundlesByProductId('p1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(bundleRepo.findBundlesByProductId).toHaveBeenCalledWith('p1', 's1', tx);
  });

  it('create runs inside withTenant(data.storeId) and threads tx into every bundleRepo call', async () => {
    await bundleService.create({
      storeId: 's1', name: 'B', price: '10.00',
      items: [{ productId: 'p1', quantity: 1 }, { productId: 'p2', quantity: 1 }],
    } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(bundleRepo.findProductsByIds).toHaveBeenCalledWith(['p1', 'p2'], 's1', tx);
    expect(bundleRepo.createBundle).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1' }), tx);
    expect(bundleRepo.createBundleItems).toHaveBeenCalledWith(expect.any(Array), tx);
    expect(bundleRepo.findById).toHaveBeenCalledWith('b1', 's1', tx);
  });

  it('update runs inside withTenant(storeId) and threads tx (no items path)', async () => {
    await bundleService.update('b1', 's1', { name: 'B2' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(bundleRepo.findById).toHaveBeenCalledWith('b1', 's1', tx);
    expect(bundleRepo.updateBundle).toHaveBeenCalledWith('b1', 's1', expect.any(Object), tx);
  });

  it('delete runs inside withTenant(storeId) and threads tx into both lookup and deletes', async () => {
    await bundleService.delete('b1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(bundleRepo.findById).toHaveBeenCalledWith('b1', 's1', tx);
    expect(bundleRepo.deleteBundleItemsByBundleId).toHaveBeenCalledWith('b1', 's1', tx);
    expect(bundleRepo.deleteBundle).toHaveBeenCalledWith('b1', 's1', tx);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend vitest run src/modules/bundle/bundle.service.withTenant.test.ts`
Expected: FAIL — `bundleRepo.findById` called with 2 args not 3; `withTenant` not imported; `create`/`update`/`delete` still route through `db.transaction`.

- [ ] **Step 3: Wrap bundle.service in withTenant (remove bare db.transaction + db import)**

Replace the entire body of `apps/backend/src/modules/bundle/bundle.service.ts` with:

```ts
// Bundle service — business logic, calls bundleRepo, never imports db directly.
// RLS Phase 1 (Approach A): every entry runs inside withTenant(storeId, fn)
// so app.tenant_id is set on the tx. withTenant opens its own transaction, so
// the createBundle+createBundleItems / updateBundle+deleteBundleItems+createBundleItems
// pairs stay atomic (single tx) — the previous bare db.transaction is removed.
import { bundleRepo } from './bundle.repo.js';
import { ErrorCodes } from '../../errors/codes.js';
import { withTenant } from '../../lib/withTenant.js';

export const bundleService = {
  async findByStoreId(storeId: string, opts?: { page?: number; limit?: number; isActive?: boolean }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const offset = (page - 1) * limit;

    const { items, total } = await withTenant(storeId, (tx) =>
      bundleRepo.findManyByStoreId(storeId, { limit, offset, isActive: opts?.isActive }, tx),
    );

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(bundleId: string, storeId: string) {
    const bundle = await withTenant(storeId, (tx) => bundleRepo.findById(bundleId, storeId, tx));

    if (!bundle) {
      throw Object.assign(new Error('Bundle not found'), {
        code: ErrorCodes.NOT_FOUND,
      });
    }

    return bundle;
  },

  async findBundlesByProductId(productId: string, storeId: string) {
    return withTenant(storeId, (tx) => bundleRepo.findBundlesByProductId(productId, storeId, tx));
  },

  async create(data: {
    storeId: string;
    name: string;
    description?: string;
    price: string;
    isActive?: boolean;
    items: Array<{ productId: string; quantity: number; sortOrder?: number }>;
  }) {
    if (data.items.length < 2) {
      throw Object.assign(new Error('Bundle must contain at least 2 items'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return withTenant(data.storeId, async (tx) => {
      const productIds = data.items.map((item) => item.productId);
      const products = await bundleRepo.findProductsByIds(productIds, data.storeId, tx);

      if (products.length !== productIds.length) {
        throw Object.assign(new Error('One or more products not found in this store'), {
          code: ErrorCodes.PRODUCT_NOT_FOUND,
        });
      }

      const unpublished = products.filter((p) => !p.isPublished);
      if (unpublished.length > 0) {
        throw Object.assign(new Error('All products in a bundle must be published'), {
          code: ErrorCodes.PRODUCT_UNPUBLISHED,
        });
      }

      const bundle = await bundleRepo.createBundle(
        {
          storeId: data.storeId,
          name: data.name,
          description: data.description,
          price: data.price,
          isActive: data.isActive ?? true,
        },
        tx,
      );

      if (!bundle) {
        throw Object.assign(new Error('Failed to create bundle'), {
          code: ErrorCodes.VALIDATION_ERROR,
        });
      }

      const bundleItems = data.items.map((item) => ({
        storeId: data.storeId,
        bundleId: bundle.id,
        productId: item.productId,
        quantity: item.quantity,
        sortOrder: item.sortOrder ?? 0,
      }));

      await bundleRepo.createBundleItems(bundleItems, tx);

      return bundleRepo.findById(bundle.id, data.storeId, tx);
    });
  },

  async update(
    bundleId: string,
    storeId: string,
    data: Partial<{
      name: string;
      description: string;
      price: string;
      isActive: boolean;
      items: Array<{ productId: string; quantity: number; sortOrder?: number }>;
    }>,
  ) {
    return withTenant(storeId, async (tx) => {
      const bundle = await bundleRepo.findById(bundleId, storeId, tx);

      if (!bundle) {
        throw Object.assign(new Error('Bundle not found'), {
          code: ErrorCodes.NOT_FOUND,
        });
      }

      if (data.items) {
        if (data.items.length < 2) {
          throw Object.assign(new Error('Bundle must contain at least 2 items'), {
            code: ErrorCodes.VALIDATION_ERROR,
          });
        }

        const productIds = data.items.map((item) => item.productId);
        const products = await bundleRepo.findProductsByIds(productIds, storeId, tx);

        if (products.length !== productIds.length) {
          throw Object.assign(new Error('One or more products not found in this store'), {
            code: ErrorCodes.PRODUCT_NOT_FOUND,
          });
        }

        const unpublished = products.filter((p) => !p.isPublished);
        if (unpublished.length > 0) {
          throw Object.assign(new Error('All products in a bundle must be published'), {
            code: ErrorCodes.PRODUCT_UNPUBLISHED,
          });
        }
      }

      await bundleRepo.updateBundle(
        bundleId,
        storeId,
        {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.price !== undefined && { price: data.price }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
        tx,
      );

      if (data.items) {
        await bundleRepo.deleteBundleItemsByBundleId(bundleId, storeId, tx);

        const bundleItems = data.items.map((item) => ({
          storeId,
          bundleId,
          productId: item.productId,
          quantity: item.quantity,
          sortOrder: item.sortOrder ?? 0,
        }));

        await bundleRepo.createBundleItems(bundleItems, tx);
      }

      return bundleRepo.findById(bundleId, storeId, tx);
    });
  },

  async delete(bundleId: string, storeId: string) {
    const bundle = await withTenant(storeId, (tx) => bundleRepo.findById(bundleId, storeId, tx));

    if (!bundle) {
      throw Object.assign(new Error('Bundle not found'), {
        code: ErrorCodes.NOT_FOUND,
      });
    }

    await withTenant(storeId, async (tx) => {
      await bundleRepo.deleteBundleItemsByBundleId(bundleId, storeId, tx);
      await bundleRepo.deleteBundle(bundleId, storeId, tx);
    });

    return { id: bundleId, deleted: true };
  },
};
```

> Note on `delete`: the lookup pre-check and the delete run in two separate `withTenant` transactions (mirroring the original structure, which read outside its `db.transaction`). Both are RLS-safe via `withTenant`; atomicity of the two deletes is preserved within the second `withTenant` tx.

- [ ] **Step 4: Thread tx into pricing.service bundle lookup**

In `apps/backend/src/modules/pricing/pricing.service.ts`, change line ~102 from:

```ts
      const bundle = await bundleRepo.findById(params.bundleId, storeId);
```

to:

```ts
      const bundle = await bundleRepo.findById(params.bundleId, storeId, tx);
```

(This call is already inside `withTenant(storeId, async (tx) => {` at line 84, so `tx` is in scope. `productBundles` gets RLS in Task 5 — without this `tx`, the lookup would fall back to bare `db` and RLS USING would hide every row.)

- [ ] **Step 5: Add a bundle-path assertion to the pricing withTenant test**

In `apps/backend/src/modules/pricing/pricing.service.withTenant.test.ts`, the `bundleRepo` mock currently resolves `findById` to `undefined` (line 32). Add one test that exercises the bundle path. Append this `it(...)` inside the existing `describe(...)` block (after the `computeOrderPricing` test, before the closing `});`):

```ts
  it('computeItemPrice threads tx into bundleRepo.findById when bundleId is provided', async () => {
    const { bundleRepo } = await import('../bundle/bundle.repo.js');
    (bundleRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'b1', storeId: 's1', isActive: true, price: '5.00',
    });
    await pricingService.computeItemPrice({
      storeId: 's1', productId: 'p1', quantity: 2, bundleId: 'b1',
    } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(bundleRepo.findById).toHaveBeenCalledWith('b1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });
```

Add `/* eslint-disable @typescript-eslint/no-explicit-any */` as the first line of the file if it is not already present (the existing file has no `as any` today; this one test introduces one in the params payload).

- [ ] **Step 6: Run the bundle + pricing withTenant tests to verify they pass**

Run: `pnpm --filter backend vitest run src/modules/bundle/bundle.service.withTenant.test.ts src/modules/pricing/pricing.service.withTenant.test.ts`
Expected: PASS — 6 bundle tests + 3 pricing tests green.

- [ ] **Step 7: Run typecheck**

Run: `pnpm --filter backend typecheck`
Expected: 0 errors. (Confirms `db` import removal from bundle.service leaves no dangling reference.)

- [ ] **Step 8: Run the full backend suite**

Run: `pnpm --filter backend vitest run`
Expected: all green (1036+). Any existing bundle.service.test.ts / bundle.route test that asserted on the old `db.transaction` shape would surface here — none exists (audit found no `*.test.ts` for the bundle module), so this is a regression guard.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/modules/bundle/bundle.service.ts apps/backend/src/modules/bundle/bundle.service.withTenant.test.ts apps/backend/src/modules/pricing/pricing.service.ts apps/backend/src/modules/pricing/pricing.service.withTenant.test.ts
git commit -m "refactor(rls): wrap bundle.service in withTenant (replace bare db.transaction) + thread tx into pricing bundle lookup (Phase 1 taxonomy)"
```

---

### Task 4: seed.ts — switch taxonomy inserts/reads to dbOwner

**Files:**
- Modify: `apps/backend/src/db/seed.ts`

**Interfaces:**
- Consumes: `dbOwner` (already imported at line 6: `import { db, dbOwner } from './index.js'`).
- Produces: no behavior change for fresh seed runs (dbOwner bypasses RLS the same as the pre-RLS `db` did); but seed becomes correct once Task 5 enables RLS on the 6 tables — `db` (app_tenant) inserts would fail WITH CHECK without `app.tenant_id`.

- [ ] **Step 1: Switch the 3 category inserts to dbOwner**

In `apps/backend/src/db/seed.ts`, make 3 edits — each changes `await db.insert(schema.categories)` to `await dbOwner.insert(schema.categories)`:

Edit 1 (line ~288):
```ts
  const [catPhones] = await dbOwner.insert(schema.categories).values({
    storeId: activeStoreId,
    nameEn: 'Phones & Accessories',
    nameAr: 'هواتف وملحقات',
  }).onConflictDoUpdate({ target: schema.categories.id, set: { updatedAt: new Date() } }).returning();
```

Edit 2 (line ~294):
```ts
  const [catAudio] = await dbOwner.insert(schema.categories).values({
    storeId: activeStoreId,
    nameEn: 'Audio',
    nameAr: 'صوتيات',
  }).onConflictDoUpdate({ target: schema.categories.id, set: { updatedAt: new Date() } }).returning();
```

Edit 3 (line ~300):
```ts
  const [catWearables] = await dbOwner.insert(schema.categories).values({
    storeId: activeStoreId,
    nameEn: 'Wearables',
    nameAr: 'ساعات ذكية',
  }).onConflictDoUpdate({ target: schema.categories.id, set: { updatedAt: new Date() } }).returning();
```

- [ ] **Step 2: Switch the 3 subcategory inserts to dbOwner**

Edit 4 (line ~307):
```ts
  const [subCases] = await dbOwner.insert(schema.subcategories).values({
    categoryId: catPhones?.id || '00000000-0000-0000-0000-000000000000',
    storeId: activeStoreId,
    nameEn: 'Cases',
    nameAr: 'حقائب',
  }).onConflictDoUpdate({ target: schema.subcategories.id, set: { updatedAt: new Date() } }).returning();
```

Edit 5 (line ~314):
```ts
  const [_subChargers] = await dbOwner.insert(schema.subcategories).values({
    categoryId: catPhones?.id || '00000000-0000-0000-0000-000000000000',
    storeId: activeStoreId,
    nameEn: 'Chargers',
    nameAr: 'شواحن',
  }).onConflictDoUpdate({ target: schema.subcategories.id, set: { updatedAt: new Date() } }).returning();
```

Edit 6 (line ~321):
```ts
  const [_subHeadphones] = await dbOwner.insert(schema.subcategories).values({
    categoryId: catAudio?.id || '00000000-0000-0000-0000-000000000000',
    storeId: activeStoreId,
    nameEn: 'Headphones',
    nameAr: 'سماعات',
  }).onConflictDoUpdate({ target: schema.subcategories.id, set: { updatedAt: new Date() } }).returning();
```

- [ ] **Step 3: Switch the 4 ID-resolution reads to dbOwner**

Edit 7 (lines ~330–333) — change each `db.query.categories.findFirst` / `db.query.subcategories.findFirst` to `dbOwner.query...`:

```ts
  const phoneCatId = catPhones?.id || (await dbOwner.query.categories.findFirst({ where: eq(schema.categories.nameEn, 'Phones & Accessories') }))?.id;
  const audioCatId = catAudio?.id || (await dbOwner.query.categories.findFirst({ where: eq(schema.categories.nameEn, 'Audio') }))?.id;
  const wearablesCatId = catWearables?.id || (await dbOwner.query.categories.findFirst({ where: eq(schema.categories.nameEn, 'Wearables') }))?.id;
  const subCasesId = subCases?.id || (await dbOwner.query.subcategories.findFirst({ where: eq(schema.subcategories.nameEn, 'Cases') }))?.id;
```

- [ ] **Step 4: Switch the modifierGroups insert to dbOwner**

Edit 8 (line ~503):
```ts
    const [warrantyGroup] = await dbOwner.insert(schema.modifierGroups).values({
      storeId: activeStoreId,
      productId: headphonesId,
      name: 'Extended Warranty',
      nameAr: 'ضمان ممتد',
      isRequired: false,
      minSelections: 0,
      maxSelections: 1,
      sortOrder: 1,
    }).onConflictDoUpdate({ target: schema.modifierGroups.id, set: { updatedAt: new Date() } }).returning();
```

- [ ] **Step 5: Switch the modifierOptions insert to dbOwner**

Edit 9 (line ~515):
```ts
      await dbOwner.insert(schema.modifierOptions).values([
```

(Only the `db.insert` → `dbOwner.insert` token on that line changes; the values array below it stays as-is.)

- [ ] **Step 6: Run typecheck**

Run: `pnpm --filter backend typecheck`
Expected: 0 errors.

- [ ] **Step 7: Sanity-run the seed against a clean DB (optional but recommended)**

If a local Postgres is available and the DB is clean, run the seed once to confirm the taxonomy inserts succeed via dbOwner:
Run: `pnpm --filter backend tsx src/db/seed.ts` (or the project's seed script) — expected: completes with the existing "Categories & subcategories seeded" / "Modifier groups" log lines, no RLS errors. (If the DB already has rows, `onConflictDoUpdate` handles it.) If running the seed is not practical in this environment, skip — Task 5's full suite (which seeds via dbOwner in the RLS test) exercises the same insert path.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/db/seed.ts
git commit -m "refactor(rls): seed categories/subcategories/modifierGroups/modifierOptions via dbOwner (Phase 1 taxonomy prep)"
```

---

### Task 5: migration 0029 + taxonomy.rls.test.ts (flip RLS ON, prove enforcement)

**Files:**
- Create: `apps/backend/drizzle/0029_taxonomy_rls.sql`
- Modify: `apps/backend/drizzle/meta/_journal.json`
- Create: `apps/backend/src/modules/taxonomy/taxonomy.rls.test.ts`

**Interfaces:**
- Consumes: the withTenant refactor from Tasks 1–3 (app.tenant_id now set on every read/write of the 6 tables) + the dbOwner seed from Task 4. Migration 0028 (catalog) is the immediately prior migration → journal idx 30 follows idx 29.
- Produces: RLS enabled+forced with `tenant_iso` §4.1 NULLIF-hardened policy on all 6 tables; a real-DB negative test proving enforcement.

- [ ] **Step 1: Write the migration SQL**

Create `apps/backend/drizzle/0029_taxonomy_rls.sql`:

```sql
-- 0029_taxonomy_rls.sql
-- RLS Phase 1 (taxonomy): enable + force row-level security on the 6 taxonomy
-- tables with a NULLIF-hardened §4.1 direct tenant_iso policy (both USING +
-- WITH CHECK). An unset/NULL app.tenant_id yields zero rows instead of
-- ''::uuid throwing — fail-closed for code paths that forget withTenant.
-- No GRANT changes: rls-roles.ts grants DML on ALL tables in public generically.

-- categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON categories;
CREATE POLICY tenant_iso ON categories
  FOR ALL
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- subcategories
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON subcategories;
CREATE POLICY tenant_iso ON subcategories
  FOR ALL
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- modifier_groups
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON modifier_groups;
CREATE POLICY tenant_iso ON modifier_groups
  FOR ALL
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- modifier_options
ALTER TABLE modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_options FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON modifier_options;
CREATE POLICY tenant_iso ON modifier_options
  FOR ALL
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- product_bundles
ALTER TABLE product_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_bundles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON product_bundles;
CREATE POLICY tenant_iso ON product_bundles
  FOR ALL
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- product_bundle_items
ALTER TABLE product_bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_bundle_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON product_bundle_items;
CREATE POLICY tenant_iso ON product_bundle_items
  FOR ALL
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```

- [ ] **Step 2: Append the journal entry**

In `apps/backend/drizzle/meta/_journal.json`, append a new entry to the `entries` array with `idx: 30` (the next after migration 0028's idx 29). Use the current ISO timestamp for `when`. The entry shape matches the existing entries:

```json
{
  "idx": 30,
  "version": "7",
  "when": <ISO_TIMESTAMP_AT_MIGRATION_CREATION>,
  "tag": "0029_taxonomy_rls",
  "breakpoints": true
}
```

(Read the existing `_journal.json` first to match the exact surrounding JSON syntax — array element separator, indentation. The `idx` values must be contiguous; confirm 0028 is idx 29 before adding.)

- [ ] **Step 3: Apply the migration**

Run: `pnpm --filter backend drizzle-kit push` (or the project's migration-apply command — check `apps/backend/package.json` scripts; the prior phases used the project's standard migration flow). 
Expected: migration 0029 applies cleanly — `ENABLE`/`FORCE`/`CREATE POLICY` on all 6 tables. Verify by connecting as `app_tenant` and confirming `SELECT` returns zero rows without `app.tenant_id` set (the Task 5 test does this).

If the project uses `drizzle-kit generate` + a migration runner instead of `push`, follow the same flow the catalog phase (migration 0028) used — the SQL file is hand-written and force-added (`git add -f`) because `drizzle/*.sql` is gitignored.

- [ ] **Step 4: Write the real-DB RLS test**

Create `apps/backend/src/modules/taxonomy/taxonomy.rls.test.ts`:

```ts
// apps/backend/src/modules/taxonomy/taxonomy.rls.test.ts
// Real-DB RLS negative test for the 6 taxonomy tables (RLS Phase 1).
// Connects as app_tenant (RLS-enforced) via a dedicated (max: 1) connection so
// session-level set_config is safe. Proves the database enforces taxonomy
// isolation independently of the application layer (the withTenant refactor in
// Tasks 1-3 sets app.tenant_id; this test verifies RLS actually uses it).
// Mirrors catalog.rls.test.ts.
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
let catAId: string;
let catBId: string;
let subAId: string;
let groupAId: string;
let optionAId: string;
let bundleAId: string;
let bundleItemAId: string;
let productAId: string;

// Distinct domains so this test's residue is identifiable and cleanable.
const DOMAIN_A = 'rls-tax-a.test';
const DOMAIN_B = 'rls-tax-b.test';

beforeAll(async () => {
  // ─── Self-cleaning pre-pass (FK-respecting: product_bundle_items →
  //   product_bundles → stores; modifier_options → modifier_groups →
  //   stores; subcategories → categories → stores) ─── Delete residue from a
  //   prior crashed run BEFORE inserting, so the test is re-runnable. Owned by
  //   dbOwner (BYPASSRLS).
  for (const domain of [DOMAIN_A, DOMAIN_B]) {
    const stores = await dbOwner
      .select({ id: schema.stores.id })
      .from(schema.stores)
      .where(eq(schema.stores.domain, domain));
    for (const s of stores) {
      await dbOwner
        .delete(schema.productBundleItems)
        .where(eq(schema.productBundleItems.storeId, s.id));
      await dbOwner
        .delete(schema.productBundles)
        .where(eq(schema.productBundles.storeId, s.id));
      await dbOwner
        .delete(schema.modifierOptions)
        .where(eq(schema.modifierOptions.storeId, s.id));
      await dbOwner
        .delete(schema.modifierGroups)
        .where(eq(schema.modifierGroups.storeId, s.id));
      await dbOwner
        .delete(schema.subcategories)
        .where(eq(schema.subcategories.storeId, s.id));
      await dbOwner
        .delete(schema.categories)
        .where(eq(schema.categories.storeId, s.id));
      // products may have been seeded for bundle items
      await dbOwner
        .delete(schema.products)
        .where(eq(schema.products.storeId, s.id));
    }
    await dbOwner.delete(schema.stores).where(eq(schema.stores.domain, domain));
  }

  // ─── Seed as the OWNER (bypasses RLS) ────────────────────────────────────
  // Required notNull on stores: name, domain, ownerEmail (storeType, currency,
  // language have defaults — mirror catalog.rls.test.ts).
  const [storeA] = await dbOwner.insert(schema.stores).values({
    name: 'rls-tax-A', domain: DOMAIN_A, ownerEmail: 'a@rls-tax-a.test',
    storeType: 'food', currency: 'USD', language: 'en',
  }).returning();
  const [storeB] = await dbOwner.insert(schema.stores).values({
    name: 'rls-tax-B', domain: DOMAIN_B, ownerEmail: 'b@rls-tax-b.test',
    storeType: 'food', currency: 'USD', language: 'en',
  }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;

  // categories: required notNull storeId, nameEn.
  const [catA] = await dbOwner.insert(schema.categories).values({
    storeId: storeAId, nameEn: 'Cat A',
  }).returning();
  const [catB] = await dbOwner.insert(schema.categories).values({
    storeId: storeBId, nameEn: 'Cat B',
  }).returning();
  catAId = catA.id;
  catBId = catB.id;

  // subcategories: required notNull categoryId, storeId, nameEn.
  const [subA] = await dbOwner.insert(schema.subcategories).values({
    categoryId: catAId, storeId: storeAId, nameEn: 'Sub A',
  }).returning();
  subAId = subA.id;

  // A product is needed for product_bundles / modifier_groups (productId) and
  // product_bundle_items (productId). products already has RLS (0028) but we
  // seed via dbOwner here (BYPASSRLS) — this is the test's own fixture, not
  // the app layer. Required notNull: storeId, categoryId, titleEn, salePrice.
  const [prodA] = await dbOwner.insert(schema.products).values({
    storeId: storeAId, categoryId: catAId, titleEn: 'Tax Product A', salePrice: '10.00',
  }).returning();
  productAId = prodA.id;

  // modifier_groups: required notNull storeId, name (applyTo defaults 'product';
  // productId/categoryId nullable; isRequired defaults false).
  const [groupA] = await dbOwner.insert(schema.modifierGroups).values({
    storeId: storeAId, productId: productAId, name: 'Group A',
  }).returning();
  groupAId = groupA.id;

  // modifier_options: required notNull modifierGroupId, storeId, nameEn.
  const [optA] = await dbOwner.insert(schema.modifierOptions).values({
    modifierGroupId: groupAId, storeId: storeAId, nameEn: 'Option A',
  }).returning();
  optionAId = optA.id;

  // product_bundles: required notNull storeId, name, price (isActive defaults true).
  const [bundleA] = await dbOwner.insert(schema.productBundles).values({
    storeId: storeAId, name: 'Bundle A', price: '25.00',
  }).returning();
  bundleAId = bundleA.id;

  // product_bundle_items: required notNull storeId, bundleId, productId (quantity default 1).
  const [bundleItemA] = await dbOwner.insert(schema.productBundleItems).values({
    storeId: storeAId, bundleId: bundleAId, productId: productAId, quantity: 2,
  }).returning();
  bundleItemAId = bundleItemA.id;
});

afterAll(async () => {
  // Clean up as the owner (RLS-bypass). Order respects FKs.
  await dbOwner.delete(schema.productBundleItems).where(eq(schema.productBundleItems.id, bundleItemAId));
  await dbOwner.delete(schema.productBundles).where(eq(schema.productBundles.id, bundleAId));
  await dbOwner.delete(schema.modifierOptions).where(eq(schema.modifierOptions.id, optionAId));
  await dbOwner.delete(schema.modifierGroups).where(eq(schema.modifierGroups.id, groupAId));
  await dbOwner.delete(schema.products).where(eq(schema.products.id, productAId));
  await dbOwner.delete(schema.subcategories).where(eq(schema.subcategories.id, subAId));
  await dbOwner.delete(schema.categories).where(eq(schema.categories.id, catAId));
  await dbOwner.delete(schema.categories).where(eq(schema.categories.id, catBId));
  await dbOwner.delete(schema.stores).where(eq(schema.stores.id, storeAId));
  await dbOwner.delete(schema.stores).where(eq(schema.stores.id, storeBId));
  await tenantClient.end();
});

// Set app.tenant_id session-level on the dedicated connection. The `null` case
// uses RESET (truly unset) — mimics the real fail-closed scenario: a code path
// that forgets withTenant leaves the GUC unset, so current_setting(...,true)
// returns NULL → store_id = NULL → zero rows.
async function setTenant(storeId: string | null) {
  if (storeId === null) {
    await tenantClient.unsafe('RESET app.tenant_id');
    return;
  }
  await tenantClient.unsafe(
    `SELECT set_config('app.tenant_id', '${storeId}', false)`,
  );
}

describe('taxonomy RLS (categories/subcategories/modifier_groups/modifier_options/product_bundles/product_bundle_items, app_tenant role)', () => {
  it('returns zero rows when no tenant context is set (fail-closed)', async () => {
    await setTenant(null);
    expect((await tenantDb.query.categories.findMany()).length).toBe(0);
    expect((await tenantDb.query.subcategories.findMany()).length).toBe(0);
    expect((await tenantDb.query.modifierGroups.findMany()).length).toBe(0);
    expect((await tenantDb.query.modifierOptions.findMany()).length).toBe(0);
    expect((await tenantDb.query.productBundles.findMany()).length).toBe(0);
    expect((await tenantDb.query.productBundleItems.findMany()).length).toBe(0);
  });

  it('shows only store A rows when app.tenant_id = storeA (single-tenant)', async () => {
    await setTenant(storeAId);
    const cats = await tenantDb.query.categories.findMany();
    expect(cats.length).toBe(1);
    expect(cats[0].id).toBe(catAId);
    expect(cats[0].storeId).toBe(storeAId);
    const subs = await tenantDb.query.subcategories.findMany();
    expect(subs.length).toBe(1);
    expect(subs[0].id).toBe(subAId);
    const groups = await tenantDb.query.modifierGroups.findMany();
    expect(groups.length).toBe(1);
    expect(groups[0].id).toBe(groupAId);
    const opts = await tenantDb.query.modifierOptions.findMany();
    expect(opts.length).toBe(1);
    expect(opts[0].id).toBe(optionAId);
    const bundles = await tenantDb.query.productBundles.findMany();
    expect(bundles.length).toBe(1);
    expect(bundles[0].id).toBe(bundleAId);
    const bundleItems = await tenantDb.query.productBundleItems.findMany();
    expect(bundleItems.length).toBe(1);
    expect(bundleItems[0].id).toBe(bundleItemAId);
  });

  it('does NOT show store B rows when app.tenant_id = storeA (cross-tenant isolation)', async () => {
    await setTenant(storeAId);
    const cats = await tenantDb.query.categories.findMany();
    expect(cats.find((r) => r.id === catBId)).toBeUndefined();
    expect(cats.every((r) => r.storeId === storeAId)).toBe(true);
  });

  it('shows store B rows when app.tenant_id = storeB', async () => {
    await setTenant(storeBId);
    const cats = await tenantDb.query.categories.findMany();
    expect(cats.length).toBe(1);
    expect(cats[0].id).toBe(catBId);
    expect(cats[0].storeId).toBe(storeBId);
  });

  it('rejects inserts whose storeId does not match app.tenant_id (WITH CHECK reject)', async () => {
    await setTenant(storeAId);
    // categories: wrong storeId → reject
    await expect(
      tenantDb.insert(schema.categories).values({
        storeId: storeBId, nameEn: 'Reject',
      }),
    ).rejects.toThrow();
    // subcategories: wrong storeId (categoryId belongs to store A) → reject
    await expect(
      tenantDb.insert(schema.subcategories).values({
        categoryId: catAId, storeId: storeBId, nameEn: 'Reject',
      }),
    ).rejects.toThrow();
    // modifier_groups: wrong storeId → reject
    await expect(
      tenantDb.insert(schema.modifierGroups).values({
        storeId: storeBId, name: 'Reject',
      }),
    ).rejects.toThrow();
    // modifier_options: wrong storeId → reject
    await expect(
      tenantDb.insert(schema.modifierOptions).values({
        modifierGroupId: groupAId, storeId: storeBId, nameEn: 'Reject',
      }),
    ).rejects.toThrow();
    // product_bundles: wrong storeId → reject
    await expect(
      tenantDb.insert(schema.productBundles).values({
        storeId: storeBId, name: 'Reject', price: '1.00',
      }),
    ).rejects.toThrow();
    // product_bundle_items: wrong storeId (bundleId belongs to store A) → reject
    await expect(
      tenantDb.insert(schema.productBundleItems).values({
        storeId: storeBId, bundleId: bundleAId, productId: productAId,
      }),
    ).rejects.toThrow();
  });

  it('accepts inserts whose storeId matches app.tenant_id (WITH CHECK accept)', async () => {
    await setTenant(storeAId);
    const [cat] = await tenantDb.insert(schema.categories).values({
      storeId: storeAId, nameEn: 'OK Cat',
    }).returning();
    expect(cat.storeId).toBe(storeAId);

    const [sub] = await tenantDb.insert(schema.subcategories).values({
      categoryId: cat.id, storeId: storeAId, nameEn: 'OK Sub',
    }).returning();
    expect(sub.storeId).toBe(storeAId);

    const [group] = await tenantDb.insert(schema.modifierGroups).values({
      storeId: storeAId, name: 'OK Group',
    }).returning();
    expect(group.storeId).toBe(storeAId);

    const [opt] = await tenantDb.insert(schema.modifierOptions).values({
      modifierGroupId: group.id, storeId: storeAId, nameEn: 'OK Opt',
    }).returning();
    expect(opt.storeId).toBe(storeAId);

    const [bundle] = await tenantDb.insert(schema.productBundles).values({
      storeId: storeAId, name: 'OK Bundle', price: '2.00',
    }).returning();
    expect(bundle.storeId).toBe(storeAId);

    const [bundleItem] = await tenantDb.insert(schema.productBundleItems).values({
      storeId: storeAId, bundleId: bundle.id, productId: productAId,
    }).returning();
    expect(bundleItem.storeId).toBe(storeAId);

    // cleanup (as the tenant — allowed since storeId matches)
    await tenantDb.delete(schema.productBundleItems).where(eq(schema.productBundleItems.id, bundleItem.id));
    await tenantDb.delete(schema.productBundles).where(eq(schema.productBundles.id, bundle.id));
    await tenantDb.delete(schema.modifierOptions).where(eq(schema.modifierOptions.id, opt.id));
    await tenantDb.delete(schema.modifierGroups).where(eq(schema.modifierGroups.id, group.id));
    await tenantDb.delete(schema.subcategories).where(eq(schema.subcategories.id, sub.id));
    await tenantDb.delete(schema.categories).where(eq(schema.categories.id, cat.id));
  });
});
```

- [ ] **Step 5: Run the taxonomy RLS test to verify it passes**

Run: `pnpm --filter backend vitest run src/modules/taxonomy/taxonomy.rls.test.ts`
Expected: PASS — 6 tests green (fail-closed, single-tenant, cross-tenant isolation, store-B visibility, WITH CHECK reject on all 6 tables, WITH CHECK accept on all 6 tables). If any insert-accept case fails with an RLS error, double-check the `app.tenant_id` is set and the row's `storeId` matches — and that `product_bundle_items.productId`/`bundleId` FK rows exist for store A (they do: `productAId`, `bundleAId`, and the accept-case creates its own `bundle.id`).

- [ ] **Step 6: Run typecheck**

Run: `pnpm --filter backend typecheck`
Expected: 0 errors.

- [ ] **Step 7: Run the FULL backend suite WITH RLS ON**

Run: `pnpm --filter backend vitest run`
Expected: ALL green with RLS ON for the 6 taxonomy tables (1036+ assertions, now including the 6 new taxonomy RLS tests + 8 category + 10 modifier + 6 bundle + 1 new pricing withTenant assertions). This is the gate that proves the Tasks 1–4 refactor actually set `app.tenant_id` on every read/write path — any bare-db residue surfaces here as either a "0 rows where expected" failure or a WITH CHECK rejection.

- [ ] **Step 8: Verify no new console.log / no any in source**

Run (PowerShell): `Select-String -Path "apps/backend/src/modules/category","apps/backend/src/modules/modifier","apps/backend/src/modules/bundle","apps/backend/src/modules/taxonomy" -Pattern "console\.log" -Recurse`
Expected: no matches. (seed.ts keeps its pre-existing console.log seed-progress lines — out of scope.)
Confirm no `any` was introduced in source (test files' `as any` + eslint-disable header is allowed per Global Constraints).

- [ ] **Step 9: Force-add the gitignored migration SQL and commit**

```bash
git add -f apps/backend/drizzle/0029_taxonomy_rls.sql
git add apps/backend/drizzle/meta/_journal.json apps/backend/src/modules/taxonomy/taxonomy.rls.test.ts
git commit -m "feat(rls): enable RLS on categories/subcategories/modifier_groups/modifier_options/product_bundles/product_bundle_items (Phase 1 taxonomy, migration 0029)"
```

---

### Final: whole-branch opus review

After Task 5 is green, dispatch a final whole-branch code review on the most capable available model (NOT the session default). Scope: the entire taxonomy branch diff from the merge-base of `fix/domain-feature-p0` against this phase's first commit.

**Review brief:** Verify against spec §3 that every bare-db read/write of the 6 tables is now inside `withTenant` (or via `dbOwner`/`dbAdmin` for seed/cross-tenant). Pay special attention to the catalog-phase lesson (§6): audit which **tables** each module reads, not which module it is — confirm no reader of the newly-RLS'd taxonomy tables was missed. Known-already-safe readers (do NOT re-flag): `bundle.repo` (already tx-threaded), `pricing.repo` modifier lookups (already threaded), `product.repo` category/subcategory/modifierGroups relations (run on the tenant-scoped executor via `productService.findById`/search inside `withTenant`), `seo.route.public` sitemap (already wrapped from the catalog fix wave). Cross-check the RLS test covers all 6 tables for both fail-closed and WITH CHECK. Confirm zero TS errors, no `console.log` in source, no `any` in source, all tests green with RLS ON.

**On findings:** dispatch ONE fix subagent carrying the complete findings list (not one fixer per finding). Re-run the covering tests after the fix wave. Commit only on user request; never push without explicit user request.

---

## Self-review notes (kept for the record)

- **Spec coverage:** §3.1 category.repo (Task 1) ✓, category.service (Task 1) ✓, modifier.repo (Task 2) ✓, modifier.service (Task 2) ✓, bundle.service (Task 3) ✓, pricing.service:102 (Task 3) ✓; §3.4 seed dbOwner (Task 4) ✓; §4 migration 0029 (Task 5) ✓; §5 taxonomy.rls.test + 3 sentinel tests (Tasks 1/2/3/5) ✓; §6 fix-wave lesson applied upfront (cross-module reads folded into Tasks 1–3, not deferred) ✓.
- **Type consistency:** `findGroupsByProductId(productId, storeId, limit = 50, tx?: DbOrTx)` — `tx` is the 4th arg in both the repo signature (Task 2 Step 3) and the service call `repo.findGroupsByProductId(productId, storeId, 50, tx)` (Task 2 Step 4) and the test assertion `'p1', 's1', 50, tx` (Task 2 Step 1). `bundleRepo.findBundlesByProductId(productId, storeId, tx?, limit=50)` — service calls `(productId, storeId, tx)` (Task 3 Step 3) and test asserts `'p1', 's1', tx` (Task 3 Step 1); `tx` is the 3rd positional arg there (matches bundle.repo's existing signature). `categoryRepo.countByStoreId(storeId, tx)` — service passes `(storeId, tx)` and test asserts `'s1', tx` (no `options` arg, consistent). `bundleRepo.findProductsByIds(productIds, storeId, tx?, limit=50)` — service calls `(productIds, storeId, tx)` and test asserts `['p1','p2'], 's1', tx`.
- **No placeholders:** every code step contains complete code; commit messages and commands are exact.
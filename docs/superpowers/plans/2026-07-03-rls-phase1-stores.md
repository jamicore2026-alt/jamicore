# RLS Phase 1 — stores (tenant root) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable PostgreSQL RLS on `stores` (the tenant root) with a fail-closed `id = NULLIF(app.tenant_id)::uuid` policy, after moving every bare-`db` access on `stores` to `dbAdmin`/`dbOwner` (BYPASSRLS).

**Architecture:** Minimal-bypass (Option 2). `stores` has no `store_id` column — its `id` is the tenant id — so the policy keys on `id`. Nearly all `stores` access is pre-tenant (host-header resolution, registration, auth/session hooks) or cross-tenant (superAdmin, background job); it cannot use `withTenant` and must use `dbAdmin`/`dbOwner`. Swapping each repo's default executor `db` → `dbAdmin` makes all existing callers BYPASSRLS automatically with zero call-site changes. The RLS policy is a fail-closed backstop for future forgotten-`dbAdmin` bugs.

**Tech Stack:** Fastify v5, Drizzle ORM, PostgreSQL 17, Vitest, pnpm, TypeScript strict ESM.

## Global Constraints

- pnpm ONLY — never npm. Backend tests: `pnpm --filter backend test <path>` (focused) / `pnpm --filter backend test` (full); typecheck: `pnpm --filter backend typecheck`; migrate: `pnpm --filter backend db:migrate`.
- storeId from JWT/request.user ONLY — never from body/query/params.
- No `any` in source (test files may use `as any` with `eslint-disable` header).
- No `console.log` in source (seed.ts pre-existing seed-progress lines are exempt).
- ESM imports only (.js extensions), no `require()`.
- `DbOrTx = typeof db | Transaction` from `apps/backend/src/modules/_shared/db-types.ts`.
- Migrations are gitignored → use `git add -f` for the .sql file.
- `db` = app_tenant (RLS-enforced once on), `dbAdmin` = app_admin (BYPASSRLS), `dbOwner` = owner (BYPASSRLS).
- Full suite must stay green AFTER the `db`→`dbAdmin` swaps and BEFORE migration 0031 is applied (proves the swaps alone don't break anything; the public host-lookup must not 404).

**Spec:** `docs/superpowers/specs/2026-07-03-rls-phase1-stores-design.md`

---

### Task 1: store.repo → dbAdmin default + store.repo.dbAdmin.test.ts

**Files:**
- Modify: `apps/backend/src/modules/store/store.repo.ts`
- Create: `apps/backend/src/modules/store/store.repo.dbAdmin.test.ts`

**Interfaces:**
- Produces: `storeRepo` with `findById`/`findByDomain`/`findByOwnerId`/`create`/`update` all defaulting to `dbAdmin` (BYPASSRLS) when no `tx` is passed. `storeService` signatures unchanged → existing `store.service.test.ts` + `store.route.merchant.test.ts` unaffected.

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/modules/store/store.repo.dbAdmin.test.ts`:

```typescript
// Behavioral test: every storeRepo method routes through dbAdmin (BYPASSRLS)
// when no tx is passed, because stores is the tenant root and nearly every
// caller is pre-tenant (host-header resolution, registration, auth/session
// hooks) or cross-tenant (superAdmin). A tx, when provided, takes precedence.
// This is the RLS-on-stores fail-closed backstop wiring.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/index.js', () => {
  const makeUpdateChain = () => {
    const chain: Record<string, unknown> = {};
    for (const m of ['set', 'where', 'returning']) chain[m] = vi.fn(() => chain);
    chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve([{ id: 's1' }]));
    return chain;
  };
  const dbStoresFindFirst = vi.fn().mockResolvedValue(undefined);
  const dbAdminStoresFindFirst = vi.fn().mockResolvedValue(undefined);
  const dbInsert = vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 's1' }]) }));
  const dbAdminInsert = vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 's1' }]) }));
  const dbUpdate = vi.fn(() => makeUpdateChain());
  const dbAdminUpdate = vi.fn(() => makeUpdateChain());
  return {
    db: { query: { stores: { findFirst: dbStoresFindFirst } }, insert: dbInsert, update: dbUpdate },
    dbAdmin: { query: { stores: { findFirst: dbAdminStoresFindFirst } }, insert: dbAdminInsert, update: dbAdminUpdate },
  };
});

import { db, dbAdmin } from '../../db/index.js';
import { storeRepo } from './store.repo.js';

const dbStoresFindFirst = db.query.stores.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbAdminStoresFindFirst = dbAdmin.query.stores.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbInsert = db.insert as unknown as ReturnType<typeof vi.fn>;
const dbAdminInsert = dbAdmin.insert as unknown as ReturnType<typeof vi.fn>;
const dbUpdate = db.update as unknown as ReturnType<typeof vi.fn>;
const dbAdminUpdate = dbAdmin.update as unknown as ReturnType<typeof vi.fn>;

describe('storeRepo dbAdmin routing (no tx)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findById routes through dbAdmin, not db', async () => {
    await storeRepo.findById('s1');
    expect(dbAdminStoresFindFirst).toHaveBeenCalled();
    expect(dbStoresFindFirst).not.toHaveBeenCalled();
  });

  it('findByDomain routes through dbAdmin, not db', async () => {
    await storeRepo.findByDomain('shop.example.com');
    expect(dbAdminStoresFindFirst).toHaveBeenCalled();
    expect(dbStoresFindFirst).not.toHaveBeenCalled();
  });

  it('findByOwnerId routes through dbAdmin, not db', async () => {
    await storeRepo.findByOwnerId('owner@store.com');
    expect(dbAdminStoresFindFirst).toHaveBeenCalled();
    expect(dbStoresFindFirst).not.toHaveBeenCalled();
  });

  it('create routes through dbAdmin.insert, not db.insert', async () => {
    await storeRepo.create({ id: 's1', name: 'S', domain: 's', ownerEmail: 'e@x.com' } as any);
    expect(dbAdminInsert).toHaveBeenCalled();
    expect(dbInsert).not.toHaveBeenCalled();
  });

  it('update routes through dbAdmin.update, not db.update', async () => {
    await storeRepo.update('s1', { name: 'Updated' });
    expect(dbAdminUpdate).toHaveBeenCalled();
    expect(dbUpdate).not.toHaveBeenCalled();
  });

  it('a passed tx takes precedence over dbAdmin (findById)', async () => {
    const txFindFirst = vi.fn().mockResolvedValue({ id: 's1' });
    const tx = { query: { stores: { findFirst: txFindFirst } } } as any;
    await storeRepo.findById('s1', tx);
    expect(txFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.any(Function) }));
    expect(dbAdminStoresFindFirst).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend test src/modules/store/store.repo.dbAdmin.test.ts`
Expected: FAIL — `dbAdminStoresFindFirst` not called (current code uses `db`).

- [ ] **Step 3: Swap store.repo default to dbAdmin**

Replace `apps/backend/src/modules/store/store.repo.ts` contents:

```typescript
// Store repository — Drizzle queries only, no business logic.
// stores is the tenant root (its id IS the tenant id), so nearly every caller
// is pre-tenant (host-header resolution, registration, auth/session hooks) or
// cross-tenant (superAdmin). All methods default to dbAdmin (BYPASSRLS); a
// passed tx takes precedence. RLS-on-stores policy: id = app.tenant_id.
import { dbAdmin } from '../../db/index.js';
import { stores } from '../../db/schema.js';
import { eq, or } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

export type StoreSelect = typeof stores.$inferSelect;
export type StoreInsert = typeof stores.$inferInsert;

export const storeRepo = {
  async findById(storeId: string, tx?: DbOrTx): Promise<StoreSelect | undefined> {
    const executor = tx ?? dbAdmin;
    return executor.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });
  },

  // D1: resolve a store by EITHER its subdomain (stores.domain) OR its verified
  // custom domain (stores.customDomain). Pre-tenant path (public host-header
  // resolution) → dbAdmin bypass.
  async findByDomain(domain: string, tx?: DbOrTx): Promise<StoreSelect | undefined> {
    const executor = tx ?? dbAdmin;
    return executor.query.stores.findFirst({
      where: or(eq(stores.domain, domain), eq(stores.customDomain, domain)),
    });
  },

  async findByOwnerId(ownerEmail: string, tx?: DbOrTx): Promise<StoreSelect | undefined> {
    const executor = tx ?? dbAdmin;
    return executor.query.stores.findFirst({
      where: eq(stores.ownerEmail, ownerEmail),
    });
  },

  create(data: StoreInsert, tx?: DbOrTx) {
    const executor = tx ?? dbAdmin;
    return executor.insert(stores).values(data).returning();
  },

  update(storeId: string, data: Partial<StoreInsert>, tx?: DbOrTx) {
    const executor = tx ?? dbAdmin;
    return executor
      .update(stores)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(stores.id, storeId))
      .returning();
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend test src/modules/store/store.repo.dbAdmin.test.ts`
Expected: PASS (6/6).

- [ ] **Step 5: typecheck**

Run: `pnpm --filter backend typecheck`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/store/store.repo.ts apps/backend/src/modules/store/store.repo.dbAdmin.test.ts
git commit -m "refactor(rls): store.repo default → dbAdmin (Phase 1 stores prep)" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: auth.repo store methods → dbAdmin + extend auth.repo.dbAdmin.test.ts

**Files:**
- Modify: `apps/backend/src/modules/auth/auth.repo.ts` (lines 43-61, the 3 store methods only)
- Modify: `apps/backend/src/modules/auth/auth.repo.dbAdmin.test.ts`

**Interfaces:**
- `authRepo.findStoreByOwnerEmail`/`findStoreByDomain`/`createStore` default to `dbAdmin`. Other auth.repo methods (users/customers/verificationTokens) unchanged.

- [ ] **Step 1: Extend the failing test**

Replace `apps/backend/src/modules/auth/auth.repo.dbAdmin.test.ts` contents:

```typescript
// Behavioral test: pre-tenant auth reads route through dbAdmin (BYPASSRLS),
// not the tenant-scoped db. verification_tokens gets no grant to app_tenant
// (RLS spec §4.3) and the store-registration trio runs before any storeId
// exists, so both MUST bypass RLS.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/index.js', () => {
  const dbFindFirst = vi.fn();
  const dbAdminFindFirst = vi.fn();
  const dbStoresFindFirst = vi.fn().mockResolvedValue(undefined);
  const dbAdminStoresFindFirst = vi.fn().mockResolvedValue(undefined);
  const dbInsert = vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 's1' }]) }));
  const dbAdminInsert = vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 's1' }]) }));
  return {
    db: { query: { verificationTokens: { findFirst: dbFindFirst }, stores: { findFirst: dbStoresFindFirst } }, insert: dbInsert },
    dbAdmin: { query: { verificationTokens: { findFirst: dbAdminFindFirst }, stores: { findFirst: dbAdminStoresFindFirst } }, insert: dbAdminInsert },
  };
});

import { db, dbAdmin } from '../../db/index.js';
import { authRepo } from './auth.repo.js';

const dbFindFirst = db.query.verificationTokens.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbAdminFindFirst = dbAdmin.query.verificationTokens.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbStoresFindFirst = db.query.stores.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbAdminStoresFindFirst = dbAdmin.query.stores.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbInsert = db.insert as unknown as ReturnType<typeof vi.fn>;
const dbAdminInsert = dbAdmin.insert as unknown as ReturnType<typeof vi.fn>;

describe('authRepo pre-tenant dbAdmin routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbAdminFindFirst.mockResolvedValue(undefined);
  });

  it('findVerificationToken routes through dbAdmin, not db', async () => {
    await authRepo.findVerificationToken('tok-1', 'email_verify');
    expect(dbAdminFindFirst).toHaveBeenCalled();
    expect(dbFindFirst).not.toHaveBeenCalled();
  });

  it('findStoreByOwnerEmail routes through dbAdmin, not db', async () => {
    await authRepo.findStoreByOwnerEmail('owner@store.com');
    expect(dbAdminStoresFindFirst).toHaveBeenCalled();
    expect(dbStoresFindFirst).not.toHaveBeenCalled();
  });

  it('findStoreByDomain routes through dbAdmin, not db', async () => {
    await authRepo.findStoreByDomain('shop');
    expect(dbAdminStoresFindFirst).toHaveBeenCalled();
    expect(dbStoresFindFirst).not.toHaveBeenCalled();
  });

  it('createStore routes through dbAdmin.insert, not db.insert', async () => {
    await authRepo.createStore({ name: 'S', domain: 's', ownerEmail: 'e@x.com' } as any);
    expect(dbAdminInsert).toHaveBeenCalled();
    expect(dbInsert).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend test src/modules/auth/auth.repo.dbAdmin.test.ts`
Expected: FAIL on the 3 new store tests (current code uses `db`).

- [ ] **Step 3: Swap the 3 auth.repo store methods to dbAdmin**

In `apps/backend/src/modules/auth/auth.repo.ts`, change ONLY the 3 store methods (lines 43-61). Each: `const executor = tx ?? db;` → `const executor = tx ?? dbAdmin;`. `dbAdmin` is already imported (line 3). Do NOT touch the user/customer/verificationToken methods.

```typescript
  async findStoreByOwnerEmail(ownerEmail: string, tx?: DbExecutor): Promise<typeof stores.$inferSelect | undefined> {
    const executor = tx ?? dbAdmin;
    return executor.query.stores.findFirst({
      where: eq(stores.ownerEmail, ownerEmail),
    });
  },

  async findStoreByDomain(domain: string, tx?: DbExecutor): Promise<typeof stores.$inferSelect | undefined> {
    const executor = tx ?? dbAdmin;
    return executor.query.stores.findFirst({
      where: eq(stores.domain, domain),
    });
  },

  async createStore(data: typeof stores.$inferInsert, tx?: DbExecutor): Promise<typeof stores.$inferSelect> {
    const executor = tx ?? dbAdmin;
    const [store] = await executor.insert(stores).values(data).returning();
    return store;
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend test src/modules/auth/auth.repo.dbAdmin.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: typecheck + focused auth tests**

Run: `pnpm --filter backend typecheck` then `pnpm --filter backend test src/modules/auth`
Expected: 0 errors; auth suite green (auth.service.test.ts mocks authRepo, unaffected).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/auth/auth.repo.ts apps/backend/src/modules/auth/auth.repo.dbAdmin.test.ts
git commit -m "refactor(rls): auth.repo store-registration trio → dbAdmin (Phase 1 stores prep)" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: domain.repo store-write methods → dbAdmin + extend domain.repo.dbAdmin.test.ts

**Files:**
- Modify: `apps/backend/src/modules/domain/domain.repo.ts` (lines 103-144, the 3 store-write methods)
- Modify: `apps/backend/src/modules/domain/domain.repo.dbAdmin.test.ts`

**Interfaces:**
- `domainRepo.updateStoreDomain`/`updateStoreCustomDomain`/`clearStoreCustomDomain` default to `dbAdmin`. The 3 cross-tenant reads (already dbAdmin) unchanged.

- [ ] **Step 1: Extend the failing test**

Add an `.update` chain to the mock and 3 new tests. In `apps/backend/src/modules/domain/domain.repo.dbAdmin.test.ts`, first extend the mock's `db` and `dbAdmin` objects (inside `vi.mock('../../db/index.js', ...)`). Add after `dbSelect`/`dbAdminSelect` are created, and add the chain builder:

```typescript
  const makeUpdateChain = () => {
    const chain: Record<string, unknown> = {};
    for (const m of ['set', 'where', 'returning']) chain[m] = vi.fn(() => chain);
    chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve([{ id: 's1' }]));
    return chain;
  };
  const dbUpdate = vi.fn(() => makeUpdateChain());
  const dbAdminUpdate = vi.fn(() => makeUpdateChain());
```

Then in the returned object add `update: dbUpdate` to `db` and `update: dbAdminUpdate` to `dbAdmin`.

After the imports, add:
```typescript
const dbUpdate = db.update as unknown as ReturnType<typeof vi.fn>;
const dbAdminUpdate = dbAdmin.update as unknown as ReturnType<typeof vi.fn>;
```

Then add a new describe block at the end of the file:

```typescript
describe('domainRepo store-write dbAdmin routing (no tx)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updateStoreDomain routes through dbAdmin.update, not db.update', async () => {
    await domainRepo.updateStoreDomain('s1', 'newsub');
    expect(dbAdminUpdate).toHaveBeenCalled();
    expect(dbUpdate).not.toHaveBeenCalled();
  });

  it('updateStoreCustomDomain routes through dbAdmin.update, not db.update', async () => {
    await domainRepo.updateStoreCustomDomain('s1', 'shop.example.com', true);
    expect(dbAdminUpdate).toHaveBeenCalled();
    expect(dbUpdate).not.toHaveBeenCalled();
  });

  it('clearStoreCustomDomain routes through dbAdmin.update, not db.update', async () => {
    await domainRepo.clearStoreCustomDomain('s1');
    expect(dbAdminUpdate).toHaveBeenCalled();
    expect(dbUpdate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend test src/modules/domain/domain.repo.dbAdmin.test.ts`
Expected: FAIL on the 3 new store-write tests (current code uses `db`).

- [ ] **Step 3: Swap the 3 domain.repo store-write methods to dbAdmin**

In `apps/backend/src/modules/domain/domain.repo.ts`, change the 3 methods (lines 103-144). Each: `const executor = tx ?? db;` → `const executor = tx ?? dbAdmin;`. `dbAdmin` is already imported (line 2). Do NOT touch the 3 cross-tenant reads (already dbAdmin) or the `tx ?? db` on create/updateStatus/delete (domain_verifications, not stores — those are a later phase).

```typescript
  async updateStoreDomain(storeId: string, domain: string, tx?: DbOrTx) {
    const executor = tx ?? dbAdmin;
    const [result] = await executor
      .update(stores)
      .set({ domain, updatedAt: new Date() })
      .where(eq(stores.id, storeId))
      .returning();
    return result!;
  },

  async updateStoreCustomDomain(
    storeId: string,
    customDomain: string,
    verified: boolean,
    tx?: DbOrTx,
  ) {
    const executor = tx ?? dbAdmin;
    const [result] = await executor
      .update(stores)
      .set({
        customDomain,
        customDomainVerified: verified,
        customDomainVerifiedAt: verified ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(stores.id, storeId))
      .returning();
    return result!;
  },

  async clearStoreCustomDomain(storeId: string, tx?: DbOrTx) {
    const executor = tx ?? dbAdmin;
    await executor
      .update(stores)
      .set({
        customDomain: null,
        customDomainVerified: false,
        customDomainVerifiedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(stores.id, storeId));
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend test src/modules/domain/domain.repo.dbAdmin.test.ts`
Expected: PASS (6/6 — 3 existing reads + 3 new writes).

- [ ] **Step 5: typecheck**

Run: `pnpm --filter backend typecheck`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/domain/domain.repo.ts apps/backend/src/modules/domain/domain.repo.dbAdmin.test.ts
git commit -m "refactor(rls): domain.repo store-writes → dbAdmin (Phase 1 stores prep)" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: domain.service db→dbAdmin + seed.ts stores→dbOwner

**Files:**
- Modify: `apps/backend/src/modules/domain/domain.service.ts` (import line 1; reads at 52, 89, 130, 244, 293; transactions at 100, 146)
- Modify: `apps/backend/src/db/seed.ts` (lines 178, 209, 232, 253, 916)

**Interfaces:**
- `domainService` now reads/writes `stores` via `dbAdmin` (BYPASSRLS). No signature changes. The `db.transaction` calls become `dbAdmin.transaction` so the inner `domainRepo` store-writes run on a BYPASSRLS tx (after migration 0031, an app_tenant tx with unset `app.tenant_id` would fail-closed on the stores UPDATE — `dbAdmin.transaction` avoids that).
- `seed.ts` store inserts/updates use `dbOwner` (consistent with all other seed inserts).

- [ ] **Step 1: Swap domain.service db→dbAdmin**

In `apps/backend/src/modules/domain/domain.service.ts`:

Line 1: `import { db } from '../../db/index.js';` → `import { dbAdmin } from '../../db/index.js';`

Then replace every `db.` occurrence with `dbAdmin.`:
- Line 52: `db.query.stores.findFirst` → `dbAdmin.query.stores.findFirst`
- Line 89: `db.query.stores.findFirst` → `dbAdmin.query.stores.findFirst`
- Line 100: `db.transaction` → `dbAdmin.transaction`
- Line 130: `db.query.stores.findFirst` → `dbAdmin.query.stores.findFirst`
- Line 146: `db.transaction` → `dbAdmin.transaction`
- Line 244: `db.query.stores.findFirst` → `dbAdmin.query.stores.findFirst`
- Line 293: `db.query.stores.findFirst` → `dbAdmin.query.stores.findFirst`

Verify with a grep that no `db.` (the app_tenant client) references remain in this file: `grep -n "\bdb\." apps/backend/src/modules/domain/domain.service.ts` should return nothing (only `dbAdmin.`).

- [ ] **Step 2: Swap seed.ts stores accesses to dbOwner**

In `apps/backend/src/db/seed.ts`, change 5 `db.` → `dbOwner.` (dbOwner is already imported at line 6):
- Line 178: `db.insert(schema.stores)` → `dbOwner.insert(schema.stores)`
- Line 209: `db.insert(schema.stores)` → `dbOwner.insert(schema.stores)`
- Line 232: `db.insert(schema.stores)` → `dbOwner.insert(schema.stores)`
- Line 253: `db.query.stores.findFirst` → `dbOwner.query.stores.findFirst`
- Line 916: `db.update(schema.stores)` → `dbOwner.update(schema.stores)`

Leave all other `db.` references in seed.ts (categories/products/customers/orders/etc. are already on dbOwner from prior phases; any remaining `db.` on non-stores tables is out of scope). Verify: `grep -n "db\.\(insert\|update\|query\.stores\|delete\)(schema\.stores" apps/backend/src/db/seed.ts` should return nothing (all stores accesses now use dbOwner).

- [ ] **Step 3: typecheck**

Run: `pnpm --filter backend typecheck`
Expected: 0 errors (`dbAdmin` and `dbOwner` have the same Drizzle API surface as `db`).

- [ ] **Step 4: Run FULL suite (RLS still OFF — migration not applied yet)**

Run: `pnpm --filter backend test`
Expected: All green (1096 from the prior phase). This proves the `db`→`dbAdmin`/`dbOwner` swaps alone do not break any path — including the public host-lookup, registration, and domain flows. The suite count is unchanged because no tests were added/removed in this task.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/domain/domain.service.ts apps/backend/src/db/seed.ts
git commit -m "refactor(rls): domain.service + seed stores → dbAdmin/dbOwner (Phase 1 stores prep)" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: migration 0031 + stores.rls.test.ts

**Files:**
- Create: `apps/backend/drizzle/0031_stores_rls.sql` (gitignored → `git add -f`)
- Modify: `apps/backend/drizzle/meta/_journal.json` (append idx 32)
- Create: `apps/backend/src/modules/store/stores.rls.test.ts`

**Interfaces:**
- Migration 0031 enables + forces RLS on `stores` with `tenant_iso` policy `id = NULLIF(current_setting('app.tenant_id', true), '')::uuid` (USING + WITH CHECK). Journal idx 32, `when: 1780843700000` (idx 31 was 1780843600000, +100000).

- [ ] **Step 1: Write the migration**

Create `apps/backend/drizzle/0031_stores_rls.sql`:

```sql
-- 0031_stores_rls.sql
-- RLS Phase 1 (stores): enable + force row-level security on the tenant-root
-- table. stores has no store_id column — its id IS the tenant id — so the
-- tenant_iso policy keys on id, not store_id. NULLIF-hardened (both USING +
-- WITH CHECK): an unset/NULL app.tenant_id yields zero rows instead of
-- ''::uuid throwing — fail-closed for code paths that forget dbAdmin/dbOwner.
-- All real access is via dbAdmin/dbOwner (BYPASSRLS); this policy is the
-- fail-closed backstop. No GRANT changes (rls-roles.ts grants DML generically).

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON stores;
CREATE POLICY tenant_iso ON stores
  FOR ALL
  USING (id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```

- [ ] **Step 2: Append journal idx 32**

In `apps/backend/drizzle/meta/_journal.json`, append after the idx 31 entry:

```json
    {
      "idx": 32,
      "version": "7",
      "when": 1780843700000,
      "tag": "0031_stores_rls",
      "breakpoints": true
    }
```

- [ ] **Step 3: Apply the migration**

Run: `pnpm --filter backend db:migrate`
Expected: `[✓] migrations applied successfully`. NOTICEs for `DROP POLICY IF EXISTS` (policy didn't pre-exist) are fine.

- [ ] **Step 4: Write the RLS test**

Create `apps/backend/src/modules/store/stores.rls.test.ts`:

```typescript
// Real-DB RLS test for stores (tenant root). Connects as app_tenant
// (RLS-enforced) via a dedicated (max: 1) connection so session-level
// set_config is safe. Proves the id-based tenant_iso policy fails closed and
// isolates tenants, while dbAdmin/dbOwner (BYPASSRLS) still work for the
// pre-tenant/cross-tenant/registration paths. Mirrors shipping_tax_review.rls.test.ts.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema.js';
import { dbOwner, dbAdmin } from '../../db/index.js';

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
const DOMAIN_A = 'rls-stores-a.test';
const DOMAIN_B = 'rls-stores-b.test';

beforeAll(async () => {
  // Self-cleaning pre-pass (dbOwner, BYPASSRLS) for re-runnability.
  for (const domain of [DOMAIN_A, DOMAIN_B]) {
    await dbOwner.delete(schema.stores).where(eq(schema.stores.domain, domain));
  }

  // Seed as the OWNER (bypasses RLS). stores requires notNull name, domain, ownerEmail.
  const [storeA] = await dbOwner.insert(schema.stores).values({
    name: 'rls-stores-A', domain: DOMAIN_A, ownerEmail: 'a@rls-stores-a.test',
    storeType: 'food', currency: 'USD', language: 'en',
  }).returning();
  const [storeB] = await dbOwner.insert(schema.stores).values({
    name: 'rls-stores-B', domain: DOMAIN_B, ownerEmail: 'b@rls-stores-b.test',
    storeType: 'food', currency: 'USD', language: 'en',
  }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;
});

afterAll(async () => {
  await dbOwner.delete(schema.stores).where(eq(schema.stores.id, storeAId));
  await dbOwner.delete(schema.stores).where(eq(schema.stores.id, storeBId));
  await tenantClient.end();
});

async function setTenant(storeId: string | null) {
  if (storeId === null) {
    await tenantClient.unsafe('RESET app.tenant_id');
    return;
  }
  await tenantClient.unsafe(`SELECT set_config('app.tenant_id', '${storeId}', false)`);
}

describe('stores RLS (app_tenant role)', () => {
  it('returns zero rows when no tenant context is set (fail-closed)', async () => {
    await setTenant(null);
    expect((await tenantDb.query.stores.findMany()).length).toBe(0);
  });

  it('shows only store A when app.tenant_id = storeA (single-tenant)', async () => {
    await setTenant(storeAId);
    const rows = await tenantDb.query.stores.findMany();
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe(storeAId);
  });

  it('does NOT show store B when app.tenant_id = storeA (cross-tenant isolation)', async () => {
    await setTenant(storeAId);
    expect((await tenantDb.query.stores.findMany()).every((r) => r.id === storeAId)).toBe(true);
  });

  it('dbAdmin bypasses RLS and sees both stores', async () => {
    const rows = await dbAdmin.query.stores.findMany({
      where: eq(schema.stores.domain, DOMAIN_A),
    });
    // dbAdmin sees storeA (and would see storeB without the where filter).
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe(storeAId);
    const both = await dbAdmin.query.stores.findMany();
    expect(both.map((r) => r.id)).toContain(storeAId);
    expect(both.map((r) => r.id)).toContain(storeBId);
  });

  it('rejects inserts whose id does not match app.tenant_id (WITH CHECK reject)', async () => {
    await setTenant(storeAId);
    await expect(
      tenantDb.insert(schema.stores).values({
        id: storeBId, name: 'Reject', domain: 'reject.stores.test', ownerEmail: 'r@reject.test',
        storeType: 'food', currency: 'USD', language: 'en',
      }),
    ).rejects.toThrow();
  });

  it('registration/seed insert via dbOwner succeeds (BYPASSRLS)', async () => {
    const [store] = await dbOwner.insert(schema.stores).values({
      name: 'rls-stores-owner', domain: 'rls-stores-owner.test', ownerEmail: 'o@rls-stores-owner.test',
      storeType: 'food', currency: 'USD', language: 'en',
    }).returning();
    expect(store.id).toBeDefined();
    await dbOwner.delete(schema.stores).where(eq(schema.stores.id, store.id));
  });
});
```

- [ ] **Step 5: Run the RLS test**

Run: `pnpm --filter backend test src/modules/store/stores.rls.test.ts`
Expected: PASS (6/6).

- [ ] **Step 6: Run FULL suite WITH RLS ON**

Run: `pnpm --filter backend test`
Expected: **1102 green** (1096 baseline + 6 new RLS tests; the 3 dbAdmin-routing test files added in Tasks 1-3 contribute to the 1096 already — confirm by counting: Task 1 adds 6 tests, Task 2 adds 3 net new, Task 3 adds 3 net new = +12 unit tests, plus 6 RLS = +18 over the 1096 → expect ~1114). Whatever the exact count, it must be ALL green with RLS ON. This is the load-bearing proof that the `db`→`dbAdmin`/`dbOwner` refactor covers every stores access path; no bare-db residue surfaced.

- [ ] **Step 7: Verify no console.log in touched source**

Run (PowerShell): `Select-String -Path "apps/backend/src/modules/store/store.repo.ts","apps/backend/src/modules/auth/auth.repo.ts","apps/backend/src/modules/domain/domain.service.ts","apps/backend/src/modules/domain/domain.repo.ts","apps/backend/src/db/seed.ts" -Pattern "console\.log"`
Expected: only pre-existing seed.ts seed-progress lines (lines 24, 29, 43, 48, 172, 177, 247, 252, 266, 282...). No new console.log in store.repo/auth.repo/domain.service/domain.repo.

- [ ] **Step 8: Commit (git add -f for the gitignored migration)**

```bash
git add apps/backend/drizzle/meta/_journal.json apps/backend/src/modules/store/stores.rls.test.ts
git add -f apps/backend/drizzle/0031_stores_rls.sql
git commit -m "feat(rls): enable RLS on stores (tenant root) — Phase 1" -m "Migration 0031 enables + forces RLS with a NULLIF-hardened id-based tenant_iso policy (USING + WITH CHECK) on stores. stores has no store_id column — its id IS the tenant id — so the policy keys on id. All real access via dbAdmin/dbOwner (BYPASSRLS); the policy is the fail-closed backstop for future forgotten-dbAdmin bugs." -m "Real-DB RLS test (stores.rls.test.ts, 6 cases): fail-closed, single-tenant, cross-tenant isolation, dbAdmin-bypass, WITH CHECK reject, dbOwner registration-insert. Seeds storeA+storeB via dbOwner; self-cleans." -m "Full suite green with RLS ON. Tasks 1-4: dbAdmin/dbOwner swaps (store.repo, auth.repo, domain.repo/service, seed) committed per-task." -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Final opus whole-branch review + docs/memory

**Files:**
- Modify: `docs/PROGRESS.md`
- Create: `C:\Users\aroky\.claude\projects\D--project-saas-ecom\memory\rls_phase1_stores.md`
- Modify: `C:\Users\aroky\.claude\projects\D--project-saas-ecom\memory\MEMORY.md`
- Append: `.superpowers/sdd/progress.md`

- [ ] **Step 1: Build the review package**

```bash
BASE=be3fca6; HEAD=<task5-head>; OUT="D:/project_saas_ecom/.superpowers/sdd/review-stores-phase.txt"
{ echo "== commits =="; git log --oneline $BASE..$HEAD; echo; echo "== stat =="; git diff --stat $BASE..$HEAD; echo; echo "== full diff -U10 =="; git diff -U10 $BASE..$HEAD; } > "$OUT" 2>&1
wc -l "$OUT"
```

- [ ] **Step 2: Dispatch opus whole-branch review**

Dispatch a code-reviewer agent (opus) with the review package path. Focus areas: (1) bare-`db` leakage on `stores` — grep the WHOLE backend for any remaining `db.(insert|update|delete|query|select)` co-located with `stores` that is NOT dbAdmin/dbOwner and NOT a withTenant tx; (2) the id-based policy correctness (USING + WITH CHECK, NULLIF); (3) `dbAdmin.transaction` in domain.service actually runs on the BYPASSRLS client; (4) seed.ts all stores accesses on dbOwner; (5) the public host-lookup path (scopes/public.ts → storeService.findByDomain → storeRepo.findByDomain → dbAdmin) is BYPASSRLS; (6) no `console.log`/`any` in source; (7) RLS test correctness (connects as app_tenant, proves fail-closed + cross-tenant + bypass). If Critical/Important findings, run ONE fix wave inline.

- [ ] **Step 3: Update docs/PROGRESS.md**

Append a `## 2026-07-03: RLS Phase 1 — stores (tenant root)` section: scope, the id-based policy rationale, the minimal-bypass approach (Option 2) + why Option 1 was rejected, the per-task commits, the verification (typecheck 0, full suite green with RLS ON, no console.log), the opus review verdict, and "25 tables now have RLS". Note remaining modules: domain_verifications, staff, discounts, loyalty, leads.

- [ ] **Step 4: Create memory file + update MEMORY.md index**

Create `memory/rls_phase1_stores.md` (type: project) summarizing: stores RLS ENABLED (migration 0031, id-based NULLIF tenant_iso, USING+WITH CHECK), minimal-bypass approach, commits, green count, opus verdict, 25 tables with RLS, NEXT=domain_verifications/staff/discounts/loyalty/leads. Add one-line index entry to `MEMORY.md`.

- [ ] **Step 5: Append ledger + commit docs**

```bash
cat >> .superpowers/sdd/progress.md << 'EOF'

## RLS Phase 1 — stores (tenant root) (2026-07-03)
Task 6: complete. Migration 0031 ENABLE+FORCE+tenant_iso (id-based NULLIF, USING+WITH CHECK) on stores.
Real-DB RLS test 6/6 green. Full suite green with RLS ON. Opus review: <verdict>.
Phase commits: <list>. 25 tables now have RLS. NOT PUSHED (PR #16).
EOF

git add docs/PROGRESS.md .superpowers/sdd/progress.md
git commit -m "docs(rls): record stores Phase 1 — 25 tables now have RLS" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

- [ ] **Step 6: Report to user**

Report: phase done, opus verdict, commits, green count, 25 tables with RLS, next module. Do NOT push (standing rule).

---

## Self-Review

**Spec coverage:** Spec §4 inventory → Tasks 1-4 cover every row (store.repo, auth.repo, domain.repo writes, domain.service reads+tx, seed). Spec §5 migration → Task 5. Spec §6 tests → Tasks 1-3 (dbAdmin-routing) + Task 5 (RLS test). Spec §7 risk (host-lookup breakage) → Task 4 Step 4 full-suite green BEFORE migration mitigates. ✓

**Placeholder scan:** No TBD/TODO. All code blocks complete. The only `<...>` placeholders are `<task5-head>` and `<verdict>` in Task 6, which are filled at runtime from git output / the review result — not plan placeholders.

**Type consistency:** `dbAdmin`/`dbOwner` are the same Drizzle type as `db` (all are `drizzle(postgres(...))` instances), so `executor = tx ?? dbAdmin` typechecks identically to `tx ?? db`. `DbOrTx`/`DbExecutor` unchanged. ✓

**Execution order safety:** Tasks 1-4 (swaps) land and the full suite is verified green BEFORE Task 5 applies migration 0031. This guarantees the public host-lookup cannot 404 in the committed state — the migration only tightens an already-bypass-correct codebase.
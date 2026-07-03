# RLS Phase 1 — customers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable PostgreSQL Row-Level Security on `customers` + `customer_addresses` (defense-in-depth on the existing `where eq(storeId)` filters, plus one missing filter *added*) by threading every customer read/write through `withTenant(storeId, fn)`, handling the pre-auth token-based verify-email/reset-password paths via inline `set_config` mid-transaction, wrapping the `analyticsService` entries (fixes the latent orders-RLS zero-out from the prior phase too), seeding customers/addresses via `dbOwner`, then flipping RLS on in migration `0027` with a real-DB negative test.

**Architecture:** Apply the module spec `docs/superpowers/specs/2026-06-28-rls-phase1-customers-design.md` (which applies `docs/superpowers/specs/2026-06-27-rls-design.md` §3/§4.1/§5). Two tables get RLS, both §4.1 direct (both have own `storeId notNull`); `customer_addresses` is **not** a §4.2 subquery child. Each customer/auth/analytics service entry **self-wraps** in `withTenant(storeId, fn)` at the service-entry level (parent spec §3 — the preferred pattern, so routes/scope only need to pass `storeId`, not import `withTenant`). The single deliberate deviation: `authService.verifyEmail` / `resetPassword` run inside an existing `db.transaction` whose `storeId` is only known after reading the verification token — there we issue `tx.execute(sql\`SELECT set_config('app.tenant_id', ${record[0].storeId}, true)\`)` inline (the `db.transaction` *becomes* the withTenant tx, same pattern as cart/coupons but inlined because `storeId` is unknown at tx-open; the `withTenant` helper cannot be used there). **RLS stays OFF through Tasks 1–6** (behavior-identical: `set_config` is a no-op for tables without RLS, and `customers`/`customer_addresses` have none yet), then is enabled in Task 7. `order.service` / `cart.service` / `coupon.service` paths are already RLS-safe from prior Phase 1 modules — this plan does NOT touch them.

**Tech Stack:** Fastify v5, Drizzle ORM (postgres-js), PostgreSQL 17, vitest 4.1.4, pnpm ONLY.

## Global Constraints

Copied verbatim from `CLAUDE.md` + the parent RLS spec — every task's requirements implicitly include these:

- **pnpm ONLY** — Never `npm install`/`npm run`/any npm command. Run backend tests via `pnpm --filter backend test`; typecheck via `pnpm --filter backend typecheck`; lint via `pnpm --filter backend lint`.
- **Zero TypeScript errors** — `pnpm --filter backend typecheck` must pass with 0 errors after every task. **No `any` type** introduced (the `as never` casts in test mocks are the established exception for feeding partial fakes into typed call sites — they appear in the existing RLS prep tests and are acceptable).
- **No console.log** — Use `fastify.log.*` only (none of these tasks add logging; do not introduce `console.*`). `seed.ts` uses `console.log` intentionally for the seed runner — leave those.
- **ESM imports only** — No `require()`. Use `.js` extensions in relative imports.
- **`withTenant` is the ONLY sanctioned tenant-context primitive** — never bare `SET`/`set_config(..., false)`/`SET SESSION`. Import from `../../lib/withTenant.js` (or `../lib/withTenant.js` from `services/` / `scopes/`). The single exception is the inline `tx.execute(sql\`SELECT set_config('app.tenant_id', ${storeId}, true)\`)` inside `verifyEmail`/`resetPassword` (the withTenant helper inlined because `storeId` is read mid-tx) — this is still `set_config(..., true)` (transaction-local), so it obeys the safety rule.
- **`tx ?? db` pattern** — repo methods accept `tx?: DbOrTx` and use `const executor = tx ?? db;`. `DbOrTx` is `apps/backend/src/modules/_shared/db-types.ts`.
- **`dbAdmin` (BYPASSRLS) for inherently cross-tenant reads** — `superAdmin.repo.ts:64` already uses it; do NOT route tenant-scoped reads to `dbAdmin`.
- **`dbOwner` (BYPASSRLS) for seeding RLS tables** — the customers + customer_addresses seed must bypass `WITH CHECK`.
- **storeId from JWT/Host only** — never from request body/query. Customer-scope requests carry `request.storeId` from the JWT (set in `scopes/customer.ts:85`); pre-auth login/register/forgot-password resolve it via `resolveStoreId(request)` (host header).
- **External calls stay OUTSIDE any withTenant tx** — `emailQueue.add` / `cache.*` / Redis op / email-send run after/around the tx, never inside.
- **Existing suite must stay green** — Tasks 1–6 are pure refactor (RLS off → behavior identical). The 956-test backend suite is the primary regression gate and must remain green after every task. Do not weaken or delete existing tests; where an existing mock-based test breaks because a service now calls the real `withTenant`, add the sentinel-tx `vi.mock('../../lib/withTenant.js', ...)` to it (mirror `order.service.withTenant.test.ts`).
- **Migration `.sql` is gitignored** — use `git add -f` for `apps/backend/drizzle/0027_customers_rls.sql`. The drizzle journal (`apps/backend/drizzle/meta/_journal.json`) IS tracked; append the new entry there (idx 28, `when` > `1780843200000`). Roles/grants come from `src/scripts/rls-roles.ts` (grants DML on ALL tables in `public` to `app_tenant`+`app_admin`), so the migration carries ONLY `ENABLE`/`FORCE`/policy statements — NO grants.
- **TDD per task** — RED (failing test) → implement → GREEN → commit. Behavioral tests use `vi.mock` of `../../db/index.js` and/or `../../lib/withTenant.js` to assert routing, mirroring `order.repo.tx.test.ts` / `order.service.withTenant.test.ts`. The Task 7 RLS test is a real-DB test (needs live Postgres with roles applied).
- **Commit only when the user asks** (standing rule). The plan shows `git commit` per task — run them only when the user has authorized commits for this session.

**Reference files (read these in the task that touches them):**
- `apps/backend/src/lib/withTenant.ts` — the primitive.
- `apps/backend/src/db/index.ts` — `db`/`dbAdmin`/`dbOwner` definitions + `runMigrations`.
- `apps/backend/src/modules/order/orders.rls.test.ts` — the RLS negative-test pattern to mirror (closest template: two tenant tables).
- `apps/backend/src/modules/order/order.service.withTenant.test.ts` — the sentinel-tx service-wrapping test pattern to mirror.
- `apps/backend/src/modules/order/order.repo.tx.test.ts` — the behavioral repo-routing test pattern to mirror.
- `apps/backend/drizzle/0026_cart_coupons_rls.sql` — the migration pattern to mirror (NULLIF-hardened direct policy).
- `apps/backend/src/modules/_shared/db-types.ts` — `DbOrTx`.

---

### Task 1: Wrap `customer.service` operations in `withTenant`

**Why:** `customerService.findByStoreId/findById/create/update/findByEmail/gdprExport/deleteProfile` read/write `customers` + `customer_addresses`. Under RLS they zero out unless `app.tenant_id` is set. Wrap each at the service-entry level (parent spec §3). `create`'s existing `customerRepo.withTransaction` *becomes* the withTenant tx (the existence-check + insert + addresses-insert all run inside it — the existence-check MUST be inside withTenant, else it reads zero and the insert then fails `WITH CHECK`). `customer.repo.ts` already threads `tx?: DbExecutor` on every method — verify, no signature change needed there.

**Files:**
- Modify: `apps/backend/src/modules/customer/customer.service.ts`
- Verify (no change unless needed): `apps/backend/src/modules/customer/customer.repo.ts` (already threads `tx?`)
- Test: `apps/backend/src/modules/customer/customer.service.withTenant.test.ts` (create)

**Interfaces:**
- Consumes: `customerRepo` methods (already take `tx?: DbExecutor`).
- Produces: `customerService` methods run all customers/customer_addresses DB work inside `withTenant(storeId, fn)`. Callers (`customer.route.customer.ts`, `customer.route.gdpr.ts`, `customer.route.merchant.ts`) are unchanged — they already pass `storeId`.

- [ ] **Step 1: Write the failing test** — `apps/backend/src/modules/customer/customer.service.withTenant.test.ts`

```ts
// Verifies customerService wraps all customers/customer_addresses DB work in
// withTenant(storeId, fn) (RLS Phase 1 prep). withTenant + customerRepo mocked.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  // Run fn with a sentinel tx so we can assert repos received it.
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    const sentinelTx = { __sentinel: 'tx' };
    return fn(sentinelTx);
  },
}));

const { repo } = vi.hoisted(() => ({
  repo: {
    findByStoreId: vi.fn().mockResolvedValue({ rows: [{ id: 'c1', storeId: 's1', email: 'a@x.test' }], total: 1 }),
    findById: vi.fn().mockResolvedValue({ id: 'c1', storeId: 's1', email: 'a@x.test', addresses: [], orders: [] }),
    findByEmail: vi.fn().mockResolvedValue(undefined),
    insertCustomer: vi.fn().mockResolvedValue({ id: 'c1', storeId: 's1', email: 'a@x.test', password: 'hash' }),
    insertAddresses: vi.fn().mockResolvedValue(undefined),
    updateCustomer: vi.fn().mockResolvedValue({ id: 'c1', storeId: 's1', password: 'hash' }),
    findFullProfileForExport: vi.fn().mockResolvedValue({ id: 'c1', storeId: 's1', addresses: [], orders: [], reviews: [], couponUsages: [] }),
    anonymizeCustomer: vi.fn().mockResolvedValue({ id: 'c1', storeId: 's1', password: 'hash' }),
  },
}));
vi.mock('./customer.repo.js', () => ({ customerRepo: repo }));

import { customerService } from './customer.service.js';

describe('customer.service wraps customer work in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findByStoreId runs inside withTenant(storeId) and threads tx', async () => {
    await customerService.findByStoreId('s1', { page: 1, limit: 20 });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findByStoreId).toHaveBeenCalledWith('s1', expect.any(Object), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('findById runs inside withTenant(storeId) and threads tx', async () => {
    await customerService.findById('c1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findById).toHaveBeenCalledWith('c1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('findByEmail runs inside withTenant(storeId)', async () => {
    await customerService.findByEmail('a@x.test', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findByEmail).toHaveBeenCalledWith('a@x.test', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('create runs existence-check + insert inside withTenant(storeId) and threads tx', async () => {
    repo.findByEmail.mockResolvedValueOnce(undefined);
    const created = await customerService.create({
      storeId: 's1', email: 'a@x.test', password: 'pw', firstName: 'A', lastName: 'B',
    });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findByEmail).toHaveBeenCalledWith('a@x.test', 's1', expect.objectContaining({ __sentinel: 'tx' }));
    expect(repo.insertCustomer).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1', email: 'a@x.test' }), expect.objectContaining({ __sentinel: 'tx' }));
    expect(created.email).toBe('a@x.test');
  });

  it('create throws CUSTOMER_ALREADY_EXISTS inside withTenant when email exists', async () => {
    repo.findByEmail.mockResolvedValueOnce({ id: 'c1', email: 'a@x.test' });
    await expect(
      customerService.create({ storeId: 's1', email: 'a@x.test', password: 'pw' }),
    ).rejects.toThrow('Customer already exists');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.insertCustomer).not.toHaveBeenCalled();
  });

  it('update runs findById + updateCustomer inside withTenant(storeId)', async () => {
    await customerService.update('c1', 's1', { firstName: 'Z' });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findById).toHaveBeenCalledWith('c1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
    expect(repo.updateCustomer).toHaveBeenCalledWith('c1', 's1', expect.objectContaining({ firstName: 'Z' }), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('gdprExport runs inside withTenant(storeId)', async () => {
    await customerService.gdprExport('c1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findFullProfileForExport).toHaveBeenCalledWith('c1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('deleteProfile runs findById + anonymizeCustomer inside withTenant(storeId)', async () => {
    await customerService.deleteProfile('c1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.anonymizeCustomer).toHaveBeenCalledWith('c1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter backend test -- src/modules/customer/customer.service.withTenant.test.ts`
Expected: FAIL — `withTenant` not imported/used yet; `create` still uses `customerRepo.withTransaction`.

- [ ] **Step 3: Implement** — `apps/backend/src/modules/customer/customer.service.ts`

Add the import: `import { withTenant } from '../../lib/withTenant.js';`. The file currently imports `customerRepo` and `ErrorCodes` and `bcrypt`. Then wrap each entry:

1. `findByStoreId(storeId, opts?)`:
   ```ts
   async findByStoreId(storeId: string, opts?: { page?: number; limit?: number; search?: string; tags?: string }) {
     const page = Math.max(1, opts?.page ?? 1);
     const limit = Math.max(1, opts?.limit ?? 20);
     const offset = (page - 1) * limit;
     const { rows, total } = await withTenant(storeId, async (tx) =>
       customerRepo.findByStoreId(storeId, { limit, offset }, tx),
     );
     return {
       data: rows,
       pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
     };
   }
   ```
2. `findById(customerId, storeId)`:
   ```ts
   async findById(customerId: string, storeId: string) {
     const customer = await withTenant(storeId, async (tx) => customerRepo.findById(customerId, storeId, tx));
     if (!customer) {
       throw Object.assign(new Error('Customer not found'), { code: ErrorCodes.CUSTOMER_NOT_FOUND });
     }
     return customer;
   }
   ```
3. `create(data)`: replace the existing `customerRepo.withTransaction(async (tx) => {...})` body with a `withTenant` body. Move the `findByEmail` existence-check **inside** the withTenant (it must ride the tx). Keep `bcrypt.hash` **outside** the tx (pure CPU — don't hold the tx during hashing):
   ```ts
   async create(data: { storeId: string; email: string; password: string; firstName?: string; lastName?: string; phone?: string; addresses?: Array<{ /* ...existing shape... */ }> }) {
     const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
     const result = await withTenant(data.storeId, async (tx) => {
       const existing = await customerRepo.findByEmail(data.email, data.storeId, tx);
       if (existing) {
         throw Object.assign(new Error('Customer already exists'), { code: ErrorCodes.CUSTOMER_ALREADY_EXISTS });
       }
       const customer = await customerRepo.insertCustomer({
         storeId: data.storeId,
         email: data.email,
         password: hashedPassword,
         firstName: data.firstName ?? '',
         lastName: data.lastName ?? '',
         phone: data.phone,
       }, tx);
       if (data.addresses && data.addresses.length > 0) {
         await customerRepo.insertAddresses(
           data.addresses.map((addr) => ({
             customerId: customer.id,
             storeId: data.storeId,
             name: addr.name,
             firstName: addr.firstName,
             lastName: addr.lastName,
             addressLine1: addr.addressLine1,
             addressLine2: addr.addressLine2,
             city: addr.city,
             state: addr.state,
             country: addr.country,
             postalCode: addr.postalCode,
             phone: addr.phone,
             isDefault: addr.isDefault ?? false,
           })),
           tx,
         );
       }
       return customer;
     });
     const { password: _, ...created } = result;
     return created;
   }
   ```
   > Preserve the exact `addresses[]` element type from the current signature (copy it verbatim). `customerRepo.withTransaction` is no longer called from the service — if it has no other callers (grep `customerRepo.withTransaction` / `withTransaction`), leave the method in `customer.repo.ts` (it's harmless and may be referenced by tests); do NOT delete it unless a lint "unused" error appears, in which case remove it.
4. `update(customerId, storeId, data)`: wrap the findById + update in one tx:
   ```ts
   async update(customerId: string, storeId: string, data: Partial<{ firstName: string; lastName: string; phone: string; avatarUrl: string; marketingEmails: boolean }>) {
     const updated = await withTenant(storeId, async (tx) => {
       const customer = await customerRepo.findById(customerId, storeId, tx);
       if (!customer) {
         throw Object.assign(new Error('Customer not found'), { code: ErrorCodes.CUSTOMER_NOT_FOUND });
       }
       return customerRepo.updateCustomer(customerId, storeId, data, tx);
     });
     if (updated) {
       const { password: _, ...result } = updated;
       return result;
     }
     return updated;
   }
   ```
5. `findByEmail(email, storeId)`:
   ```ts
   async findByEmail(email: string, storeId: string) {
     return withTenant(storeId, async (tx) => customerRepo.findByEmail(email, storeId, tx));
   }
   ```
6. `gdprExport(customerId, storeId)`:
   ```ts
   async gdprExport(customerId: string, storeId: string) {
     const customer = await withTenant(storeId, async (tx) => customerRepo.findFullProfileForExport(customerId, storeId, tx));
     if (!customer) {
       throw Object.assign(new Error('Customer not found'), { code: ErrorCodes.CUSTOMER_NOT_FOUND });
     }
     return customer;
   }
   ```
7. `deleteProfile(customerId, storeId)`:
   ```ts
   async deleteProfile(customerId: string, storeId: string) {
     const anonymized = await withTenant(storeId, async (tx) => {
       const customer = await customerRepo.findById(customerId, storeId, tx);
       if (!customer) {
         throw Object.assign(new Error('Customer not found'), { code: ErrorCodes.CUSTOMER_NOT_FOUND });
       }
       return customerRepo.anonymizeCustomer(customerId, storeId, tx);
     });
     if (anonymized) {
       const { password: _, ...result } = anonymized;
       return result;
     }
     return anonymized;
   }
   ```

> Verify `customer.repo.ts` already passes `tx?` to every method used above (`findByStoreId`, `findById`, `findByEmail`, `insertCustomer`, `insertAddresses`, `updateCustomer`, `findFullProfileForExport`, `anonymizeCustomer`). It does (read in planning: every method takes `tx?: DbExecutor` and uses `executor = tx ?? db`). No change needed there.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter backend test -- src/modules/customer/customer.service.withTenant.test.ts`
Expected: PASS (8/8).

- [ ] **Step 5: Full suite + typecheck (critical regression gate)**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: 0 type errors; full suite green. If an existing `customer.service.test.ts` (if present) or `customer.route.*.test.ts` breaks because it now hits the real `withTenant` (real `db.transaction`), add the sentinel-tx `vi.mock('../../lib/withTenant.js', ...)` to that test (mirror the mock in Step 1). If no such test exists (planning found none in `modules/customer/`), this is a no-op. `customer.route.*.test.ts` mock `customerService` directly so they're unaffected.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/customer/customer.service.ts apps/backend/src/modules/customer/customer.service.withTenant.test.ts
git commit -m "refactor(rls): wrap customer.service in withTenant (Phase 1 prep)

findByStoreId/findById/findByEmail/create/update/gdprExport/deleteProfile now
run all customers+customer_addresses DB work inside withTenant(storeId, fn)
(set_config app.tenant_id tx-local). create's existence-check + insert + addresses
move inside the withTenant tx (the existing customerRepo.withTransaction is
replaced by the withTenant tx — no nesting); bcrypt.hash stays outside the tx.
Behavior unchanged (RLS off; set_config no-op for non-RLS tables)."
```

---

### Task 2: Add `storeId` to `findCustomerById` + wrap `auth.service` customer methods in `withTenant`

**Why:** `customers` is read from many auth paths. `authRepo.findCustomerById` currently has **no `storeId` filter** (latent cross-tenant read: `where eq(customers.id, customerId)` only) — add `eq(customers.storeId, storeId)` (defense-in-depth) and thread `storeId` + `tx`. The customer auth service methods (`verifyCustomerCredentials`, `registerCustomer`, `getCustomerProfile`, `findCustomerForVerification`, `updateCustomerLastLogin`, `requestPasswordReset`, `resendVerification`, `enableCustomerMfa`, `disableCustomerMfa`) read/write `customers` on bare `db`; under RLS they zero out. Self-wrap each at the service-entry level so routes/scope only pass `storeId`. `verifyEmail`/`resetPassword` are handled in Task 3 (inline `set_config`).

**Files:**
- Modify: `apps/backend/src/modules/auth/auth.repo.ts` (`findCustomerById` gains `storeId`; verify other customer methods already take `tx?`)
- Modify: `apps/backend/src/modules/auth/auth.service.ts` (customer methods → `withTenant`; `findCustomerForVerification`/`getCustomerProfile`/`enableCustomerMfa`/`disableCustomerMfa`/`updateCustomerLastLogin` gain `storeId`)
- Test: `apps/backend/src/modules/auth/auth.service.withTenant.test.ts` (create)

**Interfaces:**
- Consumes: `authRepo` customer methods (already take `tx?: DbExecutor`).
- Produces:
  - `authRepo.findCustomerById(customerId, storeId, tx?)` — signature change (added `storeId`, applied as `eq(customers.storeId, storeId)` in the `where`).
  - `authService.findCustomerForVerification(customerId, storeId)` — signature change (added `storeId`); self-wraps `withTenant`.
  - `authService.getCustomerProfile(customerId, storeId)` — signature change (added `storeId`); self-wraps.
  - `authService.updateCustomerLastLogin(customerId, storeId)` — unchanged signature (already takes `storeId`); now self-wraps.
  - `authService.enableCustomerMfa(customerId, storeId)` / `disableCustomerMfa(customerId, storeId)` — signature change (added `storeId`); self-wrap. (Task 4 updates the MFA route call sites.)
  - `authService.verifyCustomerCredentials`, `registerCustomer`, `requestPasswordReset`, `resendVerification` — unchanged signatures; self-wrap internally.
  - Later tasks (Task 4) rely on these new signatures.

**Current signatures (verify against the file before editing):**
```ts
// auth.repo.ts
findCustomerByEmailAndStoreId(email, storeId, tx?)   // :65  already filters by storeId
findCustomerById(customerId, tx?)                    // :75  NO storeId filter — THIS TASK adds storeId
findCustomerByEmailAndStoreIdForResetCheck(email, storeId, tx?)  // :97  already filters by storeId
createCustomer(data, tx?)                            // :108
updateCustomerPassword(email, storeId, password, tx?)// :114
updateCustomerVerified(email, storeId, tx?)          // :121
updateCustomerLastLogin(customerId, storeId, tx?)    // :160
updateCustomerMfaStatus(customerId, enabled, tx?)    // :181  filters by id only — fine under RLS w/ context
```

- [ ] **Step 1: Write the failing test** — `apps/backend/src/modules/auth/auth.service.withTenant.test.ts`

```ts
// Verifies authService customer methods wrap all customers DB work in
// withTenant(storeId, fn) (RLS Phase 1 prep) and that findCustomerById now
// requires + filters by storeId (defense-in-depth for the latent cross-tenant
// read). withTenant + authRepo + bcrypt mocked.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn({ __sentinel: 'tx' });
  },
}));

const { repo } = vi.hoisted(() => ({
  repo: {
    findUserByEmail: vi.fn().mockResolvedValue(undefined),
    findCustomerByEmailAndStoreId: vi.fn().mockResolvedValue(undefined),
    findCustomerById: vi.fn().mockResolvedValue({ id: 'c1', storeId: 's1', email: 'a@x.test', firstName: 'A', lastName: 'B', isVerified: true, marketingEmails: true, lastLoginAt: null, createdAt: new Date(), updatedAt: new Date(), phone: null }),
    findCustomerByEmailAndStoreIdForResetCheck: vi.fn().mockResolvedValue({ isVerified: false }),
    createCustomer: vi.fn().mockResolvedValue({ id: 'c1', storeId: 's1', email: 'a@x.test', password: 'hash', firstName: 'A', lastName: 'B' }),
    updateCustomerLastLogin: vi.fn().mockResolvedValue(undefined),
    updateCustomerMfaStatus: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('./auth.repo.js', () => ({ authRepo: repo }));

vi.mock('bcrypt', () => ({
  default: { hash: vi.fn().mockResolvedValue('hash'), compare: vi.fn().mockResolvedValue(true) },
  hash: vi.fn().mockResolvedValue('hash'),
  compare: vi.fn().mockResolvedValue(true),
}));

import { authService } from './auth.service.js';

const fullCustomer = { id: 'c1', storeId: 's1', email: 'a@x.test', password: 'hash', firstName: 'A', lastName: 'B', isVerified: true, mfaEnabled: false };

describe('auth.service customer methods wrap in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('verifyCustomerCredentials runs inside withTenant(storeId) and threads tx to findCustomerByEmailAndStoreId', async () => {
    repo.findCustomerByEmailAndStoreId.mockResolvedValueOnce(fullCustomer);
    await authService.verifyCustomerCredentials('a@x.test', 'pw', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findCustomerByEmailAndStoreId).toHaveBeenCalledWith('a@x.test', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('registerCustomer runs existence-check + create inside withTenant(storeId)', async () => {
    repo.findCustomerByEmailAndStoreId.mockResolvedValueOnce(undefined);
    await authService.registerCustomer({ storeId: 's1', email: 'a@x.test', password: 'pw', firstName: 'A', lastName: 'B' });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findCustomerByEmailAndStoreId).toHaveBeenCalledWith('a@x.test', 's1', expect.objectContaining({ __sentinel: 'tx' }));
    expect(repo.createCustomer).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1', email: 'a@x.test' }), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('getCustomerProfile(customerId, storeId) runs inside withTenant(storeId) and passes storeId to findCustomerById', async () => {
    await authService.getCustomerProfile('c1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findCustomerById).toHaveBeenCalledWith('c1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('findCustomerForVerification(customerId, storeId) runs inside withTenant(storeId) and passes storeId to findCustomerById', async () => {
    await authService.findCustomerForVerification('c1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findCustomerById).toHaveBeenCalledWith('c1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('updateCustomerLastLogin(customerId, storeId) runs inside withTenant(storeId)', async () => {
    await authService.updateCustomerLastLogin('c1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.updateCustomerLastLogin).toHaveBeenCalledWith('c1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('requestPasswordReset (customer branch) runs inside withTenant(storeId)', async () => {
    repo.findCustomerByEmailAndStoreId.mockResolvedValueOnce({ id: 'c1', isVerified: true });
    await authService.requestPasswordReset('a@x.test', 's1', 'customer');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findCustomerByEmailAndStoreId).toHaveBeenCalledWith('a@x.test', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('resendVerification (customer branch) runs inside withTenant(storeId)', async () => {
    repo.findCustomerByEmailAndStoreIdForResetCheck.mockResolvedValueOnce({ isVerified: false });
    await authService.resendVerification('a@x.test', 's1', 'customer');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findCustomerByEmailAndStoreIdForResetCheck).toHaveBeenCalledWith('a@x.test', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('enableCustomerMfa(customerId, storeId) runs inside withTenant(storeId)', async () => {
    await authService.enableCustomerMfa('c1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.updateCustomerMfaStatus).toHaveBeenCalledWith('c1', true, expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('disableCustomerMfa(customerId, storeId) runs inside withTenant(storeId)', async () => {
    await authService.disableCustomerMfa('c1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.updateCustomerMfaStatus).toHaveBeenCalledWith('c1', false, expect.objectContaining({ __sentinel: 'tx' }));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter backend test -- src/modules/auth/auth.service.withTenant.test.ts`
Expected: FAIL — `withTenant` not imported/used; `findCustomerById` doesn't take `storeId`; `getCustomerProfile`/`findCustomerForVerification`/`enableCustomerMfa`/`disableCustomerMfa` don't take `storeId`.

- [ ] **Step 3: Implement — `apps/backend/src/modules/auth/auth.repo.ts`**

Only `findCustomerById` changes. At `:75`:
```ts
async findCustomerById(customerId: string, storeId: string, tx?: DbExecutor): Promise<Pick<typeof customers.$inferSelect, 'id' | 'email' | 'firstName' | 'lastName' | 'phone' | 'storeId' | 'isVerified' | 'marketingEmails' | 'lastLoginAt' | 'createdAt' | 'updatedAt'> | undefined> {
  const executor = tx ?? db;
  return executor.query.customers.findFirst({
    where: and(eq(customers.id, customerId), eq(customers.storeId, storeId)),
    columns: { /* unchanged: id, email, firstName, lastName, phone, storeId, isVerified, marketingEmails, lastLoginAt, createdAt, updatedAt */ },
  });
}
```
> `and` is already imported (`import { eq, and, gt, isNull } from 'drizzle-orm';`). Keep the existing `columns` block verbatim. All other authRepo customer methods are unchanged (they already filter by `storeId` and take `tx?`).

- [ ] **Step 4: Implement — `apps/backend/src/modules/auth/auth.service.ts`**

Add `import { withTenant } from '../../lib/withTenant.js';` and `import { sql } from 'drizzle-orm';` if not present (Task 3 uses `sql`; add it now). Then wrap each customer method:

1. `verifyCustomerCredentials(email, password, storeId)`:
   ```ts
   async verifyCustomerCredentials(email: string, password: string, storeId: string) {
     const customer = await withTenant(storeId, async (tx) => authRepo.findCustomerByEmailAndStoreId(email, storeId, tx));
     if (!customer) {
       throw Object.assign(new Error('Invalid credentials'), { code: ErrorCodes.INVALID_CREDENTIALS });
     }
     const isValid = await bcrypt.compare(password, customer.password);
     if (!isValid) {
       throw Object.assign(new Error('Invalid credentials'), { code: ErrorCodes.INVALID_CREDENTIALS });
     }
     return customer;
   }
   ```
   > `bcrypt.compare` runs outside the withTenant tx (the tx resolves before compare). This is fine — the customer row is already fetched; the compare is pure CPU. (If you prefer to keep the original structure where compare is inside, that's also fine — `withTenant`'s fn can `await bcrypt.compare` before returning. Either works; the structure above releases the tx sooner.)
2. `registerCustomer(data)`:
   ```ts
   async registerCustomer(data: RegisterCustomerData) {
     const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
     return withTenant(data.storeId, async (tx) => {
       const existing = await authRepo.findCustomerByEmailAndStoreId(data.email, data.storeId, tx);
       if (existing) {
         throw Object.assign(new Error('Customer already exists'), { code: ErrorCodes.CUSTOMER_ALREADY_EXISTS });
       }
       return authRepo.createCustomer({
         email: data.email,
         password: hashedPassword,
         firstName: data.firstName ?? '',
         lastName: data.lastName ?? '',
         phone: data.phone,
         storeId: data.storeId,
       }, tx);
     });
   }
   ```
3. `getCustomerProfile(customerId, storeId)`:
   ```ts
   async getCustomerProfile(customerId: string, storeId: string) {
     const customer = await withTenant(storeId, async (tx) => authRepo.findCustomerById(customerId, storeId, tx));
     if (!customer) {
       throw Object.assign(new Error('Customer not found'), { code: ErrorCodes.CUSTOMER_NOT_FOUND });
     }
     return customer;
   }
   ```
4. `findCustomerForVerification(customerId, storeId)`:
   ```ts
   async findCustomerForVerification(customerId: string, storeId: string) {
     return withTenant(storeId, async (tx) => authRepo.findCustomerById(customerId, storeId, tx));
   }
   ```
5. `updateCustomerLastLogin(customerId, storeId)`:
   ```ts
   async updateCustomerLastLogin(customerId: string, storeId: string) {
     await withTenant(storeId, async (tx) => authRepo.updateCustomerLastLogin(customerId, storeId, tx));
   }
   ```
6. `requestPasswordReset(email, storeId, userType)` — wrap only the customer branch's read; the merchant branch is unchanged (users table, no RLS this phase). The `generateToken` call stays outside withTenant (it writes `verification_tokens` via `dbAdmin`, which is RLS-exempt):
   ```ts
   async requestPasswordReset(email, storeId, userType) {
     if (userType === 'customer' && storeId) {
       const customer = await withTenant(storeId, async (tx) => authRepo.findCustomerByEmailAndStoreId(email, storeId, tx));
       if (!customer) {
         return { token: null, emailNotFound: true };
       }
       if (customer.isVerified === false) {
         throw Object.assign(new Error('Email not verified'), { code: ErrorCodes.EMAIL_NOT_VERIFIED });
       }
     } else if (userType === 'merchant') {
       const user = await authRepo.findUserByEmail(email);
       if (!user) {
         return { token: null, emailNotFound: true };
       }
     }
     const record = await authService.generateToken(email, 'password_reset', userType, storeId);
     return { token: record.token, emailNotFound: false };
   }
   ```
7. `resendVerification(email, storeId, userType)` — wrap the customer branch's read; merchant branch unchanged:
   ```ts
   async resendVerification(email, storeId, userType) {
     if (userType === 'customer' && storeId) {
       const customer = await withTenant(storeId, async (tx) => authRepo.findCustomerByEmailAndStoreIdForResetCheck(email, storeId, tx));
       if (customer?.isVerified) {
         throw Object.assign(new Error('Email already verified'), { code: ErrorCodes.EMAIL_ALREADY_VERIFIED });
       }
     }
     if (userType === 'merchant') {
       const user = await authRepo.findUserByEmail(email);
       if (user?.isVerified) {
         throw Object.assign(new Error('Email already verified'), { code: ErrorCodes.EMAIL_ALREADY_VERIFIED });
       }
     }
     const record = await authService.generateToken(email, 'email_verification', userType, storeId);
     return { token: record.token };
   }
   ```
8. `enableCustomerMfa(customerId, storeId)` / `disableCustomerMfa(customerId, storeId)`:
   ```ts
   async enableCustomerMfa(customerId: string, storeId: string) {
     await withTenant(storeId, async (tx) => authRepo.updateCustomerMfaStatus(customerId, true, tx));
   }
   async disableCustomerMfa(customerId: string, storeId: string) {
     await withTenant(storeId, async (tx) => authRepo.updateCustomerMfaStatus(customerId, false, tx));
   }
   ```

> Do NOT touch `verifyEmail` / `resetPassword` (Task 3) or the merchant/superAdmin/refresh/MFA-code methods. Do NOT touch `authService.updateMerchantMfaStatus` etc.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter backend test -- src/modules/auth/auth.service.withTenant.test.ts`
Expected: PASS (9/9).

- [ ] **Step 6: Full suite + typecheck**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: 0 type errors. **The full suite will FAIL here** because `findCustomerForVerification`, `getCustomerProfile`, `enableCustomerMfa`, `disableCustomerMfa` gained a `storeId` param, breaking their call sites in `scopes/customer.ts`, `auth.route.session.ts`, `auth.route.password.ts`, `auth.route.mfa.ts`, and the mocks in `auth.route.customer.test.ts` / `auth.service.test.ts`. That's expected — Task 4 fixes the call sites; the test mocks are fixed in Step 7. Do NOT commit yet; proceed to fix the call sites (Task 4) and mocks, then return here.

> **If you prefer to keep tasks independently green**, do Task 4's route call-site changes + the mock fixes in this task's Step 7 before committing (they're tightly coupled by the signature change). The plan separates them for clarity, but the signature change and its call-site updates MUST land together to keep the suite green. Recommended: perform Task 4 Steps 1–3 (the call-site edits) and the mock updates below, then run the full suite, then commit both tasks' file changes together (or as two commits after the suite is green).

- [ ] **Step 7: Fix the broken mocks in `auth.route.customer.test.ts` / `auth.service.test.ts`**

`auth.route.customer.test.ts:19` mocks `findCustomerForVerification: vi.fn()`; lines `:649`/`:697` call `authService.findCustomerForVerification(mockCustomer)` / `(null)` with ONE arg. Update the mock to accept `(customerId, storeId)` and the call sites to pass `request.storeId` (the route will after Task 4). `auth.service.test.ts:30` mocks `findCustomerById: vi.fn()`; lines `:339`/`:346` call `mockAuthRepo.findCustomerById.mockResolvedValueOnce(...)` — the mock is on the repo (which now takes `(customerId, storeId, tx?)`); update the `.mockResolvedValueOnce` calls' surrounding `authService.getCustomerProfile`/`findCustomerForVerification` invocations to pass `storeId`. Read both test files and align the mocks + call args to the new signatures. The sentinel-tx `withTenant` mock must be added to both files (prepend `vi.mock('../../lib/withTenant.js', ...)` with the sentinel fn, mirroring Step 1) so the real `withTenant` doesn't open a real `db.transaction` during these mocked tests.

Run: `pnpm --filter backend test -- src/modules/auth/auth.route.customer.test.ts src/modules/auth/auth.service.test.ts`
Expected: PASS.

Then full suite + typecheck:
Run: `pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: 0 type errors; full suite green (Task 4's call-site edits applied).

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/modules/auth/auth.repo.ts apps/backend/src/modules/auth/auth.service.ts apps/backend/src/modules/auth/auth.service.withTenant.test.ts apps/backend/src/modules/auth/auth.route.customer.test.ts apps/backend/src/modules/auth/auth.service.test.ts
# plus the Task 4 call-site edits (scopes/customer.ts, auth.route.session/password/mfa.ts) if not committed separately
git commit -m "refactor(rls): add storeId to findCustomerById + wrap auth.service customer methods in withTenant (Phase 1 prep)

authRepo.findCustomerById gains a storeId param + eq(storeId) defense-in-depth
filter (was id-only — a latent cross-tenant read). authService customer methods
(verifyCustomerCredentials/registerCustomer/getCustomerProfile/findCustomerForVerification/
updateCustomerLastLogin/requestPasswordReset/resendVerification/enableCustomerMfa/
disableCustomerMfa) now self-wrap in withTenant(storeId, fn) and thread tx.
getCustomerProfile/findCustomerForVerification/enableCustomerMfa/disableCustomerMfa
gain a storeId param (callers updated in the route/scope layer). verifyEmail/
resetPassword deferred to the next commit (inline set_config). Behavior unchanged
(RLS off)."
```

---

### Task 3: Inline `set_config` in `verifyEmail` / `resetPassword` (token-based, no `storeId` in request)

**Why:** `authService.verifyEmail(token)` and `resetPassword(token, newPassword)` run `db.transaction(async (tx) => { … })` and read/update `customers` via `authRepo.updateCustomerVerified` / `updateCustomerPassword` / `findCustomerByEmailAndStoreId` on `tx` with **no tenant context**. Under customers-RLS these zero out → verify-email throws "Customer not found"; reset-password silently no-ops. The `storeId` is **not in the request** — it lives in the `verificationTokens` row read at the top of the same tx. The `withTenant` helper can't be used (storeId unknown at tx-open). Fix: after the token read + empty guard, issue `tx.execute(sql\`SELECT set_config('app.tenant_id', ${record[0].storeId}, true)\`)` on the existing tx (the `db.transaction` *becomes* the withTenant tx). The customer branch is gated on `record[0].storeId` truthy, so the value is a non-null string.

**Files:**
- Modify: `apps/backend/src/modules/auth/auth.service.ts` (`verifyEmail`, `resetPassword`)
- Test: `apps/backend/src/modules/auth/verifyEmail.resetPassword.withTenant.test.ts` (create)

**Interfaces:**
- Produces: `verifyEmail` / `resetPassword` set `app.tenant_id` transaction-locally from `record[0].storeId` before any `customers` read/write. No signature change. `verification_tokens` is still accessed via the raw `tx.select()` / `tx.update()` (the table is still granted to `app_tenant` today; Phase 2 will revisit).

- [ ] **Step 1: Write the failing test** — `apps/backend/src/modules/auth/verifyEmail.resetPassword.withTenant.test.ts`

```ts
// Verifies verifyEmail / resetPassword set app.tenant_id (transaction-local) from
// the verification-token row's storeId BEFORE any customers read/write, so the
// customer reads/writes see rows under customers-RLS. These paths have NO storeId
// in the request — the storeId lives in the verificationTokens row read at the top
// of the same db.transaction. The withTenant helper can't be used (storeId unknown
// at tx-open), so the fix is an inline set_config on the existing tx.
//
// We mock db.transaction to run the callback with a fake tx whose .execute() /
// .select() / .update() we can observe, and assert set_config('app.tenant_id',
// record.storeId, true) is called AFTER the token read and BEFORE the customer
// write.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { executeMock } = vi.hoisted(() => ({ executeMock: vi.fn().mockResolvedValue(undefined) }));
const { repo } = vi.hoisted(() => ({
  repo: {
    updateCustomerVerified: vi.fn().mockResolvedValue([{ id: 'c1', storeId: 's1' }]),
    updateCustomerPassword: vi.fn().mockResolvedValue(undefined),
    findCustomerByEmailAndStoreId: vi.fn().mockResolvedValue({ id: 'c1' }),
    revokeAllUserTokens: vi.fn().mockResolvedValue(undefined),
    findUserByEmail: vi.fn().mockResolvedValue(undefined),
    updateMerchantPassword: vi.fn().mockResolvedValue(undefined),
    deleteVerificationTokensByEmailTypeUserType: vi.fn().mockResolvedValue(undefined),
    createVerificationToken: vi.fn().mockResolvedValue({ token: 't', id: 'tk1' }),
  },
}));
vi.mock('./auth.repo.js', () => ({ authRepo: repo }));

vi.mock('bcrypt', () => ({
  default: { hash: vi.fn().mockResolvedValue('hash'), compare: vi.fn().mockResolvedValue(true) },
  hash: vi.fn().mockResolvedValue('hash'),
  compare: vi.fn().mockResolvedValue(true),
}));

// Capture the tx the callback receives so we can assert call order.
let capturedTx: any = null;
const selectChain = (rows: unknown[]) => {
  const chain: Record<string, unknown> = {};
  chain.where = vi.fn(() => chain);
  chain.for = vi.fn(() => chain);
  chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(rows));
  return chain;
};
vi.mock('../../db/index.js', () => ({
  db: {
    transaction: vi.fn(async (cb: (tx: any) => Promise<unknown>) => {
      capturedTx = {
        execute: executeMock,
        select: vi.fn(() => selectChain([{ id: 'tk1', email: 'a@x.test', storeId: 's1', userType: 'customer', type: 'email_verification' }])),
        update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) })),
      };
      return cb(capturedTx);
    }),
  },
  dbAdmin: {},
  dbOwner: {},
}));

import { authService } from './auth.service.js';

describe('verifyEmail/resetPassword set app.tenant_id from the token storeId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('verifyEmail calls set_config(app.tenant_id, record.storeId, true) before updateCustomerVerified', async () => {
    const calls: string[] = [];
    executeMock.mockImplementation(async (q: unknown) => {
      // sql\`...\` is a { sql: ..., params: [...] } object; stringify for ordering.
      calls.push(String((q as unknown as { sql?: string }).sql ?? q));
    });
    repo.updateCustomerVerified.mockImplementationOnce(async () => {
      calls.push('updateCustomerVerified');
      return [{ id: 'c1', storeId: 's1' }];
    });
    await authService.verifyEmail('tk-token');
    const setConfigCall = calls.find((c) => c.includes('set_config') && c.includes('app.tenant_id'));
    expect(setConfigCall).toBeDefined();
    expect(calls.indexOf(setConfigCall!)).toBeLessThan(calls.indexOf('updateCustomerVerified'));
    expect(repo.updateCustomerVerified).toHaveBeenCalledWith('a@x.test', 's1', expect.any(Object));
  });

  it('resetPassword calls set_config(app.tenant_id, record.storeId, true) before updateCustomerPassword', async () => {
    const calls: string[] = [];
    executeMock.mockImplementation(async (q: unknown) => {
      calls.push(String((q as unknown as { sql?: string }).sql ?? q));
    });
    repo.updateCustomerPassword.mockImplementationOnce(async () => {
      calls.push('updateCustomerPassword');
      return undefined;
    });
    // resetPassword reads a password_reset token
    const resetTx = {
      execute: executeMock,
      select: vi.fn(() => selectChain([{ id: 'tk1', email: 'a@x.test', storeId: 's1', userType: 'customer', type: 'password_reset' }])),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) })),
    };
    // re-capture by overriding the mocked db.transaction's tx
    const { db } = await import('../../db/index.js');
    (db.transaction as unknown as (cb: (tx: any) => Promise<unknown>) => Promise<unknown>) = (vi.fn(async (cb: (tx: any) => Promise<unknown>) => cb(resetTx)) as never) as (cb: (tx: any) => Promise<unknown>) => Promise<unknown>;
    await authService.resetPassword('tk-token', 'newpw');
    const setConfigCall = calls.find((c) => c.includes('set_config') && c.includes('app.tenant_id'));
    expect(setConfigCall).toBeDefined();
    expect(calls.indexOf(setConfigCall!)).toBeLessThan(calls.indexOf('updateCustomerPassword'));
    expect(repo.updateCustomerPassword).toHaveBeenCalledWith('a@x.test', 's1', expect.any(String), expect.any(Object));
  });
});
```

> This test is the trickiest in the plan because it asserts call *ordering* on a transaction whose `storeId` is read mid-tx. The exact mock plumbing (`db.transaction` capture, `sql` object stringification) may need adjustment to the real Drizzle `sql` template shape — read `lib/withTenant.ts` (which does `tx.execute(sql\`SELECT set_config(...)\`)`) to confirm the `sql` object exposes a `.sql` / `.getSQL()` / `.toQuery()` field and adjust the `setConfigCall` detection accordingly. The load-bearing invariant is: **`set_config('app.tenant_id', record[0].storeId, true)` is executed on the tx AFTER the token `select().for('update')` and BEFORE the first `authRepo.updateCustomer*` / `findCustomerByEmailAndStoreId` call.** If the string-detection approach proves fragile, assert instead via an ordered spy list on `executeMock` + `repo.updateCustomerVerified.mockImplementation` pushing markers (as shown). Keep the ordering assertion.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter backend test -- src/modules/auth/verifyEmail.resetPassword.withTenant.test.ts`
Expected: FAIL — no `set_config` call yet (the `setConfigCall` is `undefined`).

- [ ] **Step 3: Implement** — `apps/backend/src/modules/auth/auth.service.ts`

Ensure `import { sql } from 'drizzle-orm';` is present (added in Task 2 Step 4). In `verifyEmail(token)`:

```ts
async verifyEmail(token: string): Promise<{ verified: boolean; userType: 'customer' | 'merchant'; email: string }> {
  return db.transaction(async (tx) => {
    const record = await tx.select().from(verificationTokens)
      .where(and(eq(verificationTokens.token, token), eq(verificationTokens.type, 'email_verification'), gt(verificationTokens.expiresAt, new Date()), isNull(verificationTokens.usedAt)))
      .for('update');
    if (!record.length) {
      throw Object.assign(new Error('Invalid or expired verification token'), { code: ErrorCodes.VERIFICATION_TOKEN_EXPIRED });
    }
    // Mark token as used immediately
    await tx.update(verificationTokens).set({ usedAt: new Date() }).where(eq(verificationTokens.id, record[0].id));

    // ─── Set tenant context (transaction-local) from the token's storeId ───
    // These paths have NO storeId in the request; it lives in the token row. The
    // customer reads/writes below are RLS-gated on customers, so they need
    // app.tenant_id set on THIS tx. Inline set_config(..., true) = tx-local (same
    // safety as withTenant). The customer branch is gated on record[0].storeId
    // truthy, so the cast is safe.
    if (record[0].userType === 'customer' && record[0].storeId) {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${record[0].storeId}, true)`);
      const result = await authRepo.updateCustomerVerified(record[0].email, record[0].storeId, tx);
      if (result.length === 0) {
        throw Object.assign(new Error('Customer not found'), { code: ErrorCodes.CUSTOMER_NOT_FOUND });
      }
      return { verified: true, userType: 'customer' as const, email: record[0].email };
    }

    if (record[0].userType === 'merchant') {
      const user = await authRepo.findUserByEmail(record[0].email, tx);
      if (!user) {
        throw Object.assign(new Error('User not found'), { code: ErrorCodes.USER_NOT_FOUND });
      }
      await tx.update(users).set({ isVerified: true, updatedAt: new Date() }).where(eq(users.id, user.id));
      return { verified: true, userType: 'merchant' as const, email: record[0].email };
    }

    throw Object.assign(new Error('Invalid token'), { code: ErrorCodes.TOKEN_INVALID });
  });
}
```

In `resetPassword(token, newPassword)`:

```ts
async resetPassword(token: string, newPassword: string): Promise<{ reset: boolean; email: string }> {
  return db.transaction(async (tx) => {
    const record = await tx.select().from(verificationTokens)
      .where(and(eq(verificationTokens.token, token), eq(verificationTokens.type, 'password_reset'), gt(verificationTokens.expiresAt, new Date()), isNull(verificationTokens.usedAt)))
      .for('update');
    if (!record.length) {
      throw Object.assign(new Error('Invalid or expired reset token'), { code: ErrorCodes.PASSWORD_RESET_EXPIRED });
    }
    // Mark used immediately
    await tx.update(verificationTokens).set({ usedAt: new Date() }).where(eq(verificationTokens.id, record[0].id));

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // ─── Set tenant context (transaction-local) from the token's storeId ───
    if (record[0].userType === 'customer' && record[0].storeId) {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${record[0].storeId}, true)`);
      await authRepo.updateCustomerPassword(record[0].email, record[0].storeId, hashedPassword, tx);
      const customer = await authRepo.findCustomerByEmailAndStoreId(record[0].email, record[0].storeId, tx);
      if (customer) await authRepo.revokeAllUserTokens(customer.id);
      return { reset: true, email: record[0].email };
    } else if (record[0].userType === 'merchant') {
      await authRepo.updateMerchantPassword(record[0].email, hashedPassword, tx);
      const user = await authRepo.findUserByEmail(record[0].email, tx);
      if (user) await authRepo.revokeAllUserTokens(user.id);
      return { reset: true, email: record[0].email };
    }

    return { reset: true, email: record[0].email };
  });
}
```

> The `set_config` must run AFTER the token `select().for('update')` + `markUsed` (so the locked token row is read first) and BEFORE the first `authRepo.updateCustomer*` / `findCustomerByEmailAndStoreId` call. `record[0].storeId` is `string | null`; the `&& record[0].storeId` guard narrows it to `string` inside the branch, so `${record[0].storeId}` is a string (Drizzle `sql` param). The merchant branch is unchanged (users table — no RLS this phase).

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter backend test -- src/modules/auth/verifyEmail.resetPassword.withTenant.test.ts`
Expected: PASS (2/2). If the `sql` object stringification doesn't expose `.sql`, switch the detection to `String(q).includes('set_config')` or compare the `executeMock`'s call arg against `sql\`SELECT set_config('app.tenant_id', ${'s1'}, true)\`` via `.toEqual` after building the expected `sql` object. The ordering assertion is what matters.

- [ ] **Step 5: Full suite + typecheck**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: 0 type errors; full suite green. The existing `auth.service.test.ts` `verifyEmail`/`resetPassword` tests mock `db.transaction` — if they break on the new `tx.execute(sql\`...\`)` call, ensure their fake tx has an `execute: vi.fn().mockResolvedValue(undefined)` (add it if missing). Read `auth.service.test.ts`'s `db.transaction` mock and add `execute` to the fake tx if absent.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/auth/auth.service.ts apps/backend/src/modules/auth/verifyEmail.resetPassword.withTenant.test.ts
git commit -m "refactor(rls): inline set_config in verifyEmail/resetPassword (Phase 1 prep)

verifyEmail and resetPassword have NO storeId in the request — it lives in the
verificationTokens row read at the top of the same db.transaction. After the
token read + markUsed, set app.tenant_id transaction-locally from record[0].storeId
(inline set_config(..., true) — the withTenant helper can't be used since storeId
is unknown at tx-open; the db.transaction becomes the withTenant tx). The customer
reads/writes (updateCustomerVerified/updateCustomerPassword/findCustomerByEmailAndStoreId)
now run with tenant context so they see rows under customers-RLS. The merchant
branch is unchanged (users table, no RLS this phase). Behavior unchanged (RLS off)."
```

---

### Task 4: Update scope hook + route call-sites for the new `storeId` args

**Why:** Task 2 changed `findCustomerForVerification`, `getCustomerProfile`, `enableCustomerMfa`, `disableCustomerMfa` to require a `storeId` arg (self-wrapping). The call sites in `scopes/customer.ts`, `auth.route.session.ts`, `auth.route.password.ts`, `auth.route.mfa.ts` must pass it. Because the services self-wrap, these call sites do NOT need to import `withTenant` — they just pass `storeId`. **The worst zero-out risk (§1 risk #1) is closed here:** the scope hook's `findCustomerForVerification` now runs with tenant context on every authenticated customer request.

**Files:**
- Modify: `apps/backend/src/scopes/customer.ts` (line `:89`)
- Modify: `apps/backend/src/modules/auth/auth.route.session.ts` (`/me` at `:317`, login `updateCustomerLastLogin` at `:132` — already passes storeId)
- Modify: `apps/backend/src/modules/auth/auth.route.password.ts` (`/resend-verification` at `:37`)
- Modify: `apps/backend/src/modules/auth/auth.route.mfa.ts` (`/mfa/resend` at `:112`, `/mfa/enable` at `:137`+`:145`, `/mfa/disable` at `:164`+`:172`)

**Interfaces:**
- Consumes: Task 2's new signatures: `authService.findCustomerForVerification(customerId, storeId)`, `getCustomerProfile(customerId, storeId)`, `enableCustomerMfa(customerId, storeId)`, `disableCustomerMfa(customerId, storeId)`, `verifyCustomerCredentials(email, password, storeId)` (unchanged signature), `updateCustomerLastLogin(customerId, storeId)` (unchanged signature).

- [ ] **Step 1: Implement — `apps/backend/src/scopes/customer.ts`**

At line `:89`, change:
```ts
const customer = await fastify.authService.findCustomerForVerification(decoded.customerId);
```
to:
```ts
const customer = await fastify.authService.findCustomerForVerification(decoded.customerId, decoded.storeId);
```
> `decoded.storeId` is already verified non-empty (the `if (!decoded.customerId || !decoded.storeId)` guard at `:74` returns 401 before reaching here). No `withTenant` import — the service self-wraps. This single line is the load-bearing fix for §1 risk #1 (every authenticated customer request 401s without it).

- [ ] **Step 2: Implement — `auth.route.session.ts`**

At `/me` (`:317`), change:
```ts
const customer = await authService.getCustomerProfile(customerId);
```
to:
```ts
const customer = await authService.getCustomerProfile(customerId, storeId);
```
> `storeId` is already in scope at `:316` (`const storeId = request.storeId!;`). The login `updateCustomerLastLogin(customer.id, customer.storeId)` at `:132` already passes `customer.storeId` — no change (the service self-wraps now).

- [ ] **Step 3: Implement — `auth.route.password.ts`**

At `/resend-verification` (`:37`), change:
```ts
const customerId = request.customerId!;
const customer = await authService.findCustomerForVerification(customerId);
```
to:
```ts
const customerId = request.customerId!;
const customer = await authService.findCustomerForVerification(customerId, request.storeId!);
```
> `request.storeId` is set (the route is authenticated — the scope hook does NOT skip `/auth/resend-verification`, per the `:23` comment "resend-verification REQUIRES auth").

- [ ] **Step 4: Implement — `auth.route.mfa.ts`**

`/mfa/resend` (`:112`): change `const customer = await authService.getCustomerProfile(decoded.customerId);` to `await authService.getCustomerProfile(decoded.customerId, decoded.storeId);` — but the route uses `customer.email` after, so keep the binding: `const customer = await authService.getCustomerProfile(decoded.customerId, decoded.storeId);`. (`decoded.storeId` comes from the mfaToken JWT — `:99` decodes `{ customerId, email, scope, type }`; **verify the mfaToken JWT includes `storeId`** — the login route signs the mfaToken with `customerId, storeId, scope, jti, type` at `auth.route.session.ts:72-78`, so `decoded.storeId` is present. If the `decoded` type annotation at `:97` doesn't list `storeId`, add it: `let decoded: { customerId: string; email: string; storeId: string; scope: string; type: string };`.)

`/mfa/enable` (`:137`-`:145`): change `const customer = await authService.getCustomerProfile(customerId);` → `(customerId, request.storeId!)`; the `verifyCustomerCredentials(customer.email, password, customer.storeId)` call is unchanged (already passes storeId); change `await authService.enableCustomerMfa(customerId);` → `await authService.enableCustomerMfa(customerId, request.storeId!);`.

`/mfa/disable` (`:164`-`:172`): same — `getCustomerProfile(customerId, request.storeId!)` and `disableCustomerMfa(customerId, request.storeId!)`.

- [ ] **Step 5: Run the targeted + full suite + typecheck**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: 0 type errors; full suite green. (The mock fixes from Task 2 Step 7 should already be in place; if not, apply them now — `auth.route.customer.test.ts`/`auth.service.test.ts` mocks + call args aligned to the new signatures.)

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/scopes/customer.ts apps/backend/src/modules/auth/auth.route.session.ts apps/backend/src/modules/auth/auth.route.password.ts apps/backend/src/modules/auth/auth.route.mfa.ts
git commit -m "refactor(rls): pass storeId at customer scope hook + auth route call-sites (Phase 1 prep)

scopes/customer.ts:89 findCustomerForVerification(decoded.customerId, decoded.storeId)
— the load-bearing fix for the worst zero-out risk (every authenticated customer
request would 401 under customers-RLS without it; the service self-wraps
withTenant so no withTenant import in the scope file). /me, /resend-verification,
/mfa/{resend,enable,disable} pass request.storeId / decoded.storeId to the
now-storeId-gated getCustomerProfile/findCustomerForVerification/enableCustomerMfa/
disableCustomerMfa. Behavior unchanged (RLS off)."
```

---

### Task 5: Wrap `analytics.repo` + `analytics.service` in `withTenant`

**Why:** `analytics.repo.ts` reads `customers` (this phase) + `orders`/`orderItems` (already RLS from the orders phase) on bare `db` with **zero test coverage** — merchant dashboard counts are likely already silently zeroing out for orders since the orders phase shipped. Wrap every `analyticsService` entry in `withTenant(storeId)`; thread `tx?: DbOrTx` through every `analytics.repo` function. `products` reads are a no-op until catalog-RLS. This task closes the latent zero-out gap and adds the first analytics tests.

**Files:**
- Modify: `apps/backend/src/modules/analytics/analytics.repo.ts` (all exported functions gain `tx?: DbOrTx`)
- Modify: `apps/backend/src/modules/analytics/analytics.service.ts` (each entry wraps its DB calls in `withTenant(storeId, fn)`; cache `wrap` stays outside the tx)
- Test: `apps/backend/src/modules/analytics/analytics.service.withTenant.test.ts` (create)

**Interfaces:**
- Consumes: `withTenant` primitive; `getCacheService` (unchanged).
- Produces: every `analytics.repo` exported function accepts a trailing `tx?: DbOrTx` and uses `const executor = tx ?? db;`. `analyticsService` entries run all DB work inside `withTenant(storeId, async (tx) => repo.fn(storeId, ..., tx))`. `buildPeriodExpr` is pure CPU — no `tx`.

**Current signatures (verify against the file before editing):**
```ts
// analytics.repo.ts (all are standalone `export async function`s, not a repo object)
countOrders(storeId)                                  // :6   db.select({count}).from(orders).where(eq(orders.storeId, storeId))
countCustomers(storeId)                               // :13  db.select({count}).from(customers).where(eq(customers.storeId, storeId))
countProducts(storeId)                                // :20  db.select({count}).from(products).where(eq(products.storeId, storeId))
getRevenueStats(storeId)                              // :27  db.select({totalRevenue, averageOrderValue}).from(orders).where(...)
countRecentOrders(storeId, since)                      // :37  db.select({count}).from(orders).where(...)
getRecentRevenue(storeId, since)                      // :44  db.select({totalRevenue}).from(orders).where(...)
buildPeriodExpr(dateFormat)                           // :65  pure CPU — NO tx
getRevenueByPeriod(storeId, periodExpr, startDate, endDate)  // :73  db.select(...).from(orders).where(...)
getTopProducts(storeId, limit=5)                      // :99  db.select(...).from(orderItems).innerJoin(orders, ...).where(...)
getOrdersByStatus(storeId)                            // :120 db.select({status, count}).from(orders).where(...)
getNewVsReturningCustomers(storeId, since)            // :131 db.select({count}).from(customers).where(...) x2
```

- [ ] **Step 1: Write the failing test** — `apps/backend/src/modules/analytics/analytics.service.withTenant.test.ts`

```ts
// Verifies analyticsService wraps all analytics DB work in withTenant(storeId, fn)
// (RLS Phase 1 prep). Closes the latent zero-out gap: analytics.repo reads
// customers (this phase) + orders/orderItems (already RLS) on bare db with zero
// test coverage — merchant dashboard counts were silently zeroing out under
// orders-RLS. withTenant + repo + cache mocked.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn({ __sentinel: 'tx' });
  },
}));

const { repoFns } = vi.hoisted(() => ({
  repoFns: {
    countOrders: vi.fn().mockResolvedValue([{ count: 5 }]),
    countCustomers: vi.fn().mockResolvedValue([{ count: 3 }]),
    countProducts: vi.fn().mockResolvedValue([{ count: 10 }]),
    getRevenueStats: vi.fn().mockResolvedValue([{ totalRevenue: '1000', averageOrderValue: '100' }]),
    countRecentOrders: vi.fn().mockResolvedValue([{ count: 2 }]),
    getRecentRevenue: vi.fn().mockResolvedValue([{ totalRevenue: '200' }]),
    getTopProducts: vi.fn().mockResolvedValue([{ productId: 'p1', productTitle: 'A', totalSold: '5', totalRevenue: '500' }]),
    getOrdersByStatus: vi.fn().mockResolvedValue([{ status: 'paid', count: 3 }]),
    getNewVsReturningCustomers: vi.fn().mockResolvedValue({ newCustomers: 2, returningCustomers: 1 }),
    buildPeriodExpr: vi.fn().mockReturnValue({ sql: 'expr' }),
    getRevenueByPeriod: vi.fn().mockResolvedValue([{ period: '2026-01-01', revenue: '100', orderCount: '1', averageOrderValue: '100' }]),
  },
}));
vi.mock('./analytics.repo.js', () => ({
  countOrders: repoFns.countOrders,
  countCustomers: repoFns.countCustomers,
  countProducts: repoFns.countProducts,
  getRevenueStats: repoFns.getRevenueStats,
  countRecentOrders: repoFns.countRecentOrders,
  getRecentRevenue: repoFns.getRecentRevenue,
  getTopProducts: repoFns.getTopProducts,
  getOrdersByStatus: repoFns.getOrdersByStatus,
  getNewVsReturningCustomers: repoFns.getNewVsReturningCustomers,
  buildPeriodExpr: repoFns.buildPeriodExpr,
  getRevenueByPeriod: repoFns.getRevenueByPeriod,
}));

// cache.wrap runs the fn immediately (no real Redis in unit test).
const { cache } = vi.hoisted(() => ({
  cache: { wrap: vi.fn(async (_key: string, fn: () => Promise<unknown>) => fn()) },
}));
vi.mock('../../services/cache.service.js', () => ({ getCacheService: () => cache }));

import { analyticsService } from './analytics.service.js';

describe('analytics.service wraps analytics DB work in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getPublicStats runs countProducts inside withTenant(storeId) and threads tx', async () => {
    await analyticsService.getPublicStats('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoFns.countProducts).toHaveBeenCalledWith('s1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('getDashboardStats runs all 6 repo calls inside withTenant(storeId) and threads tx', async () => {
    await analyticsService.getDashboardStats('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoFns.countOrders).toHaveBeenCalledWith('s1', expect.objectContaining({ __sentinel: 'tx' }));
    expect(repoFns.countCustomers).toHaveBeenCalledWith('s1', expect.objectContaining({ __sentinel: 'tx' }));
    expect(repoFns.getRevenueStats).toHaveBeenCalledWith('s1', expect.objectContaining({ __sentinel: 'tx' }));
    expect(repoFns.countRecentOrders).toHaveBeenCalledWith('s1', expect.any(Date), expect.objectContaining({ __sentinel: 'tx' }));
    expect(repoFns.getRecentRevenue).toHaveBeenCalledWith('s1', expect.any(Date), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('getTopProducts runs inside withTenant(storeId)', async () => {
    await analyticsService.getTopProducts('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoFns.getTopProducts).toHaveBeenCalledWith('s1', 5, expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('getOrderStatusBreakdown runs inside withTenant(storeId)', async () => {
    await analyticsService.getOrderStatusBreakdown('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoFns.getOrdersByStatus).toHaveBeenCalledWith('s1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('getCustomerInsights runs inside withTenant(storeId)', async () => {
    await analyticsService.getCustomerInsights('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoFns.getNewVsReturningCustomers).toHaveBeenCalledWith('s1', expect.any(Date), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('getRevenueByPeriod runs inside withTenant(storeId) and threads tx', async () => {
    await analyticsService.getRevenueByPeriod('s1', 'daily');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoFns.getRevenueByPeriod).toHaveBeenCalledWith('s1', expect.any(Object), expect.any(Date), expect.any(Date), expect.objectContaining({ __sentinel: 'tx' }));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter backend test -- src/modules/analytics/analytics.service.withTenant.test.ts`
Expected: FAIL — `withTenant` not imported/used; repo functions don't accept `tx`.

- [ ] **Step 3: Implement — `apps/backend/src/modules/analytics/analytics.repo.ts`**

Add `import type { DbOrTx } from '../_shared/db-types.js';` and `import { db } from '../../db/index.js';` (the file currently imports `db`; keep it). For every exported function **except `buildPeriodExpr`** (pure CPU), add `, tx?: DbOrTx` as the **last** param and `const executor = tx ?? db;`, then replace `db.` with `executor.` in the body:

- `countOrders(storeId, tx?)` → `const executor = tx ?? db; return executor.select({ count: count() }).from(orders).where(eq(orders.storeId, storeId));`
- `countCustomers(storeId, tx?)` → same shape with `customers`.
- `countProducts(storeId, tx?)` → same with `products`.
- `getRevenueStats(storeId, tx?)` → `executor.select({ totalRevenue: sql<string>\`COALESCE(...)\`, ... }).from(orders).where(and(eq(orders.storeId, storeId), sql\`...\`));`
- `countRecentOrders(storeId, since, tx?)` → `executor.select(...).from(orders).where(and(eq(orders.storeId, storeId), gte(orders.createdAt, since)));`
- `getRecentRevenue(storeId, since, tx?)` → `executor.select(...).from(orders).where(...)`.
- `buildPeriodExpr(dateFormat)` → **unchanged** (pure CPU, no `tx`).
- `getRevenueByPeriod(storeId, periodExpr, startDate, endDate, tx?)` → `executor.select(...).from(orders).where(...).groupBy(periodExpr).orderBy(periodExpr);`
- `getTopProducts(storeId, limit = 5, tx?)` → `executor.select(...).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).where(...).groupBy(...).orderBy(...).limit(limit);`
- `getOrdersByStatus(storeId, tx?)` → `executor.select(...).from(orders).where(eq(orders.storeId, storeId)).groupBy(orders.status);`
- `getNewVsReturningCustomers(storeId, since, tx?)` → both inner `db.select(...)` become `executor.select(...)`.

> Only swap `db.` → `executor.` and add the trailing `tx?` param + `const executor = tx ?? db;`. Keep the exact query shapes, `.where`/`.groupBy`/`.orderBy`/`.limit` chains, and `sql\`...\`` templates verbatim. `buildPeriodExpr` is the ONLY function left unchanged.

- [ ] **Step 4: Implement — `apps/backend/src/modules/analytics/analytics.service.ts`**

Add `import { withTenant } from '../../lib/withTenant.js';`. Wrap each entry's DB-call section inside `cache.wrap`'s fn with `withTenant(storeId, async (tx) => {...})`, passing `tx` to every repo call. The `cache.wrap(cacheKey, fn, ttl)` call itself is unchanged — only the `fn` body is wrapped:

1. `getPublicStats(storeId)`:
   ```ts
   return cache.wrap(cacheKey, async () => {
     const productCount = await withTenant(storeId, async (tx) => repo.countProducts(storeId, tx));
     return { totalProducts: productCount[0]?.count ?? 0 };
   }, 300);
   ```
2. `getDashboardStats(storeId)`:
   ```ts
   return cache.wrap(cacheKey, async () => {
     const stats = await withTenant(storeId, async (tx) => {
       const [orderStats, customerCount, productCount, revenueStats] = await Promise.all([
         repo.countOrders(storeId, tx),
         repo.countCustomers(storeId, tx),
         repo.countProducts(storeId, tx),
         repo.getRevenueStats(storeId, tx),
       ]);
       const thirtyDaysAgo = new Date();
       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
       const recentOrders = await repo.countRecentOrders(storeId, thirtyDaysAgo, tx);
       const recentRevenue = await repo.getRecentRevenue(storeId, thirtyDaysAgo, tx);
       return {
         totalOrders: orderStats[0]?.count ?? 0,
         totalRevenue: revenueStats[0]?.totalRevenue ?? '0',
         totalCustomers: customerCount[0]?.count ?? 0,
         totalProducts: productCount[0]?.count ?? 0,
         averageOrderValue: revenueStats[0]?.averageOrderValue ?? '0',
         recentOrders: recentOrders[0]?.count ?? 0,
         recentRevenue: recentRevenue[0]?.totalRevenue ?? '0',
       };
     });
     return stats;
   }, 300);
   ```
3. `getTopProducts(storeId)`:
   ```ts
   return cache.wrap(cacheKey, async () => withTenant(storeId, async (tx) => repo.getTopProducts(storeId, 5, tx)), 300);
   ```
4. `getOrderStatusBreakdown(storeId)`:
   ```ts
   return cache.wrap(cacheKey, async () => withTenant(storeId, async (tx) => repo.getOrdersByStatus(storeId, tx)), 300);
   ```
5. `getCustomerInsights(storeId)`:
   ```ts
   return cache.wrap(cacheKey, async () => {
     const thirtyDaysAgo = new Date();
     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
     return withTenant(storeId, async (tx) => repo.getNewVsReturningCustomers(storeId, thirtyDaysAgo, tx));
   }, 300);
   ```
6. `getRevenueByPeriod(storeId, period, opts?)`:
   ```ts
   return cache.wrap(cacheKey, async () => {
     let dateFormat: string;
     if (period === 'daily') dateFormat = 'YYYY-MM-DD';
     else if (period === 'weekly') dateFormat = 'IYYY-IW';
     else dateFormat = 'YYYY-MM';
     const periodExpr = repo.buildPeriodExpr(dateFormat); // pure CPU — outside tx is fine
     const results = await withTenant(storeId, async (tx) => repo.getRevenueByPeriod(storeId, periodExpr, startDate, endDate, tx));
     return results.map((row) => ({ period: row.period, revenue: row.revenue, orderCount: Number(row.orderCount), averageOrderValue: row.averageOrderValue }));
   }, 300);
   ```

> The `cache.wrap` stays outside the withTenant tx (Redis op). The `new Date()` / `thirtyDaysAgo` computations are pure CPU — fine inside or outside the tx. `buildPeriodExpr` is pure CPU — keep it outside the tx (it builds a `sql` expression, no DB). Keep the `startDate`/`endDate` derivation at the top of `getRevenueByPeriod` unchanged.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter backend test -- src/modules/analytics/analytics.service.withTenant.test.ts`
Expected: PASS (6/6).

- [ ] **Step 6: Full suite + typecheck**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: 0 type errors; full suite green. There are no existing analytics tests (planning confirmed none), so nothing regresses. `analytics.route.merchant.ts` / `analytics.route.public.ts` call `analyticsService.*` with `request.storeId` — they're unaffected (the service signature is unchanged).

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/analytics/analytics.repo.ts apps/backend/src/modules/analytics/analytics.service.ts apps/backend/src/modules/analytics/analytics.service.withTenant.test.ts
git commit -m "refactor(rls): wrap analytics.repo + analytics.service in withTenant (Phase 1 prep)

analytics.repo functions (countOrders/countCustomers/countProducts/getRevenueStats/
countRecentOrders/getRecentRevenue/getRevenueByPeriod/getTopProducts/getOrdersByStatus/
getNewVsReturningCustomers) gain tx?: DbOrTx + executor = tx ?? db. buildPeriodExpr
is pure CPU, unchanged. analyticsService entries (getPublicStats/getDashboardStats/
getTopProducts/getOrderStatusBreakdown/getCustomerInsights/getRevenueByPeriod) now run
all DB work inside withTenant(storeId, fn); cache.wrap stays outside the tx. Closes the
latent zero-out gap: analytics.repo read customers (this phase) + orders/orderItems
(already RLS from the orders phase) on bare db with zero test coverage — merchant
dashboard counts were silently zeroing out. First analytics tests added. Behavior
unchanged (RLS off; set_config no-op for non-RLS tables)."
```

---

### Task 6: Seed `customers` + `customer_addresses` via `dbOwner`

**Why:** `db/seed.ts` inserts `customers` (`:572`), `db.query.customers.findFirst` (`:576`,`:577`), and `customer_addresses` (`:584`,`:613`) via bare `db` (app_tenant). Under customers-RLS the inserts hit `WITH CHECK` (no `app.tenant_id` in seed context) and fail; the reads return zero. Switch to `dbOwner` (BYPASSRLS) — same fix Phase 1 applied to the orders/order_items/coupons seeds.

**Files:**
- Modify: `apps/backend/src/db/seed.ts` (lines `:572`, `:576`, `:577`, `:584`, `:613`)
- Test: none (seed is not unit-tested; typecheck + lint + full suite is the gate)

**Interfaces:**
- Produces: `seed.ts` inserts/reads `customers` + `customer_addresses` via `dbOwner` (joining the existing `dbOwner` orders/order_items/coupons seed pattern). `dbOwner` is already imported (`:6` `import { db, dbOwner } from './index.js';`).

- [ ] **Step 1: Implement** — `apps/backend/src/db/seed.ts`

At line `:572`, change:
```ts
const insertedCustomers = await db.insert(schema.customers).values(customerData).onConflictDoUpdate({ target: [schema.customers.email, schema.customers.storeId], set: { updatedAt: new Date() } }).returning();
```
to:
```ts
const insertedCustomers = await dbOwner.insert(schema.customers).values(customerData).onConflictDoUpdate({ target: [schema.customers.email, schema.customers.storeId], set: { updatedAt: new Date() } }).returning();
```
At lines `:576` and `:577`, change `await db.query.customers.findFirst(...)` → `await dbOwner.query.customers.findFirst(...)` (both occurrences).
At line `:584`, change `await db.insert(schema.customerAddresses).values([...])` → `await dbOwner.insert(schema.customerAddresses).values([...])`.
At line `:613`, the `.onConflictDoUpdate({ target: schema.customerAddresses.id, ... })` chain stays — only the leading `db.insert` → `dbOwner.insert` changed (it's one statement `:584`-`:613`).

> `dbOwner` exposes the same Drizzle API (`insert`/`query`/`select`) as `db` (both are `PostgresJsDatabase`). No other change. Do NOT touch the other `db.insert(schema.<table>)` calls in `seed.ts` for tables that don't yet have RLS (users, stores, categories, products, etc.) — leave them on `db` (they're fine until their RLS phase; the seed runs as `db` which is `app_tenant` — but wait, see the note below).

> **Note on existing seed pattern:** the orders phase already moved `orders`/`order_items` (`:709`,`:767`) and the coupons phase moved `coupons` (`:775`) to `dbOwner`. `customers`/`customer_addresses` join that set. The remaining `db.insert(...)` calls (users, stores, categories, products, variants, modifierGroups, reviews, storeAnalytics, emailTemplates) stay on `db` — they'll be migrated to `dbOwner` in their respective RLS phases (or in a later "seed consolidation"). Do NOT bulk-migrate them now (out of scope, and they don't fail today).

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm --filter backend typecheck && pnpm --filter backend lint`
Expected: 0 type errors; lint clean.

- [ ] **Step 3: Full suite**

Run: `pnpm --filter backend test`
Expected: full suite green (seed isn't exercised by the suite, but this confirms no import/syntax breakage).

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/db/seed.ts
git commit -m "refactor(rls): seed customers + customer_addresses via dbOwner (Phase 1 prep)

The customers + customer_addresses seed inserts/reads switch from db (app_tenant)
to dbOwner (BYPASSRLS) so they pass WITH CHECK and see rows once customers has RLS.
Mirrors the Phase 1 orders/order_items/coupons seed fixes. Behavior unchanged
(RLS off; dbOwner bypasses)."
```

---

### Task 7: Enable RLS on `customers` + `customer_addresses` (migration `0027`) + negative test

**Why:** The refactor (Tasks 1–6) is behavior-identical with RLS off. Now flip RLS on and prove the DB enforces isolation independently of the app layer.

**Files:**
- Create: `apps/backend/drizzle/0027_customers_rls.sql` (gitignored → `git add -f`)
- Modify: `apps/backend/drizzle/meta/_journal.json` (append entry idx 28)
- Create: `apps/backend/src/modules/customer/customers.rls.test.ts` (real-DB negative test, mirrors `orders.rls.test.ts`)

- [ ] **Step 1: Write the migration SQL** — `apps/backend/drizzle/0027_customers_rls.sql`

```sql
-- RLS Phase 1: customers + customer_addresses.
-- Both are §4.1 tenant tables (storeId uuid notNull) → direct policy.
-- customer_addresses has its OWN storeId (not a subquery child of customers).
-- See docs/superpowers/specs/2026-06-28-rls-phase1-customers-design.md §3.
-- Roles + grants are created by src/scripts/rls-roles.ts (idempotent bootstrap,
-- grants DML on ALL tables in public to app_tenant + app_admin), NOT here, so
-- the migration carries only ENABLE/FORCE/policy statements.

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON customers;
CREATE POLICY tenant_iso ON customers
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON customer_addresses;
CREATE POLICY tenant_iso ON customer_addresses
  FOR ALL TO app_tenant
  USING    (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```

- [ ] **Step 2: Register the migration in the journal** — `apps/backend/drizzle/meta/_journal.json`

Append a new entry to the `entries` array (after the `0026` entry, idx 27). Use a `when` value strictly greater than `0026`'s `1780843200000` (e.g. `1780843300000`):

```json
    {
      "idx": 28,
      "version": "7",
      "when": 1780843300000,
      "tag": "0027_customers_rls",
      "breakpoints": true
    }
```

- [ ] **Step 3: Write the failing real-DB negative test** — `apps/backend/src/modules/customer/customers.rls.test.ts`

Mirror `apps/backend/src/modules/order/orders.rls.test.ts` exactly in structure (`tenantUrl`, `tenantClient`/`tenantDb` with `max: 1`, `beforeAll` seeds via `dbOwner`, `setTenant(storeId|null)` helper, `afterAll` cleanup; residue-robust `beforeAll` pre-cleanup via distinct `rls-%` domains). Seed via `dbOwner` (BYPASSRLS): two stores (A, B) with distinct `rls-cust-%` domains; one customer per store; one `customer_addresses` row per customer.

```ts
// apps/backend/src/modules/customer/customers.rls.test.ts
// Real-DB RLS negative test for customers + customer_addresses (RLS Phase 1).
// Connects as app_tenant (RLS-enforced) via a dedicated (max: 1) connection so
// session-level set_config is safe. Proves the database enforces isolation
// independently of the application layer (the withTenant refactor in Tasks 1-6
// sets app.tenant_id; this test verifies RLS actually uses it).
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
let customerAId: string;
let customerBId: string;
let addressAId: string;
let addressBId: string;

const DOMAIN_A = 'rls-cust-a.test';
const DOMAIN_B = 'rls-cust-b.test';

beforeAll(async () => {
  // ─── Self-cleaning pre-pass (FK-respecting: addresses → customers → stores) ───
  for (const domain of [DOMAIN_A, DOMAIN_B]) {
    const stores = await dbOwner.select({ id: schema.stores.id }).from(schema.stores).where(eq(schema.stores.domain, domain));
    for (const s of stores) {
      await dbOwner.delete(schema.customerAddresses).where(eq(schema.customerAddresses.storeId, s.id));
      await dbOwner.delete(schema.customers).where(eq(schema.customers.storeId, s.id));
    }
    await dbOwner.delete(schema.stores).where(eq(schema.stores.domain, domain));
  }

  // ─── Seed as the OWNER (bypasses RLS) ────────────────────────────────────
  const [storeA] = await dbOwner.insert(schema.stores).values({
    name: 'rls-cust-A', domain: DOMAIN_A, ownerEmail: 'a@rls-cust-a.test',
    storeType: 'food', currency: 'USD', language: 'en',
  }).returning();
  const [storeB] = await dbOwner.insert(schema.stores).values({
    name: 'rls-cust-B', domain: DOMAIN_B, ownerEmail: 'b@rls-cust-b.test',
    storeType: 'food', currency: 'USD', language: 'en',
  }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;

  // One customer per store (required notNull: storeId, email, password, firstName,
  // lastName; mfaEnabled notNull default).
  const [custA] = await dbOwner.insert(schema.customers).values({
    storeId: storeAId, email: `a-${Date.now()}@rls-cust-a.test`, password: 'hash',
    firstName: 'A', lastName: 'One', isVerified: true,
  }).returning();
  const [custB] = await dbOwner.insert(schema.customers).values({
    storeId: storeBId, email: `b-${Date.now()}@rls-cust-b.test`, password: 'hash',
    firstName: 'B', lastName: 'Two', isVerified: true,
  }).returning();
  customerAId = custA.id;
  customerBId = custB.id;

  // One address per customer (required notNull: customerId, storeId, name,
  // firstName, lastName, addressLine1, city, country, postalCode).
  const [addrA] = await dbOwner.insert(schema.customerAddresses).values({
    customerId: customerAId, storeId: storeAId, name: 'Home',
    firstName: 'A', lastName: 'One', addressLine1: '1 A St',
    city: 'Riyadh', country: 'SA', postalCode: '11111', isDefault: true,
  }).returning();
  const [addrB] = await dbOwner.insert(schema.customerAddresses).values({
    customerId: customerBId, storeId: storeBId, name: 'Home',
    firstName: 'B', lastName: 'Two', addressLine1: '2 B St',
    city: 'Jeddah', country: 'SA', postalCode: '22222', isDefault: true,
  }).returning();
  addressAId = addrA.id;
  addressBId = addrB.id;
});

afterAll(async () => {
  await dbOwner.delete(schema.customerAddresses).where(eq(schema.customerAddresses.id, addressAId));
  await dbOwner.delete(schema.customerAddresses).where(eq(schema.customerAddresses.id, addressBId));
  await dbOwner.delete(schema.customers).where(eq(schema.customers.id, customerAId));
  await dbOwner.delete(schema.customers).where(eq(schema.customers.id, customerBId));
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

describe('customers + customer_addresses RLS (app_tenant role)', () => {
  it('returns zero rows when no tenant context is set (fail-closed)', async () => {
    await setTenant(null);
    const customers = await tenantDb.query.customers.findMany();
    const addresses = await tenantDb.query.customerAddresses.findMany();
    expect(customers.length).toBe(0);
    expect(addresses.length).toBe(0);
  });

  it('shows only store A rows when app.tenant_id = storeA (single-tenant)', async () => {
    await setTenant(storeAId);
    const customers = await tenantDb.query.customers.findMany();
    const addresses = await tenantDb.query.customerAddresses.findMany();
    expect(customers.length).toBe(1);
    expect(customers[0].storeId).toBe(storeAId);
    expect(customers[0].id).toBe(customerAId);
    expect(addresses.length).toBe(1);
    expect(addresses[0].storeId).toBe(storeAId);
    expect(addresses[0].id).toBe(addressAId);
  });

  it('does NOT show store B rows when app.tenant_id = storeA (cross-tenant isolation)', async () => {
    await setTenant(storeAId);
    const customers = await tenantDb.query.customers.findMany();
    const addresses = await tenantDb.query.customerAddresses.findMany();
    expect(customers.every((r) => r.storeId === storeAId)).toBe(true);
    expect(customers.find((r) => r.storeId === storeBId)).toBeUndefined();
    expect(addresses.every((r) => r.storeId === storeAId)).toBe(true);
    expect(addresses.find((r) => r.storeId === storeBId)).toBeUndefined();
  });

  it('shows store B rows when app.tenant_id = storeB', async () => {
    await setTenant(storeBId);
    const customers = await tenantDb.query.customers.findMany();
    const addresses = await tenantDb.query.customerAddresses.findMany();
    expect(customers.length).toBe(1);
    expect(customers[0].storeId).toBe(storeBId);
    expect(addresses.length).toBe(1);
    expect(addresses[0].storeId).toBe(storeBId);
  });

  it('rejects inserts whose storeId does not match app.tenant_id (WITH CHECK)', async () => {
    await setTenant(storeAId);
    // customers: wrong storeId → reject
    await expect(
      tenantDb.insert(schema.customers).values({
        storeId: storeBId, email: `reject-${Date.now()}@rls.test`, password: 'h',
        firstName: 'R', lastName: 'J',
      }),
    ).rejects.toThrow();
    // customer_addresses: wrong storeId (customerId belongs to store A) → reject
    await expect(
      tenantDb.insert(schema.customerAddresses).values({
        customerId: customerAId, storeId: storeBId, name: 'Home',
        firstName: 'R', lastName: 'J', addressLine1: '9 R St',
        city: 'X', country: 'SA', postalCode: '99999',
      }),
    ).rejects.toThrow();
  });

  it('accepts inserts whose storeId matches app.tenant_id (WITH CHECK accept)', async () => {
    await setTenant(storeAId);
    // customers: matching storeId → accept
    const [cust] = await tenantDb.insert(schema.customers).values({
      storeId: storeAId, email: `ok-${Date.now()}-${Math.random().toString(36).slice(2)}@rls.test`,
      password: 'h', firstName: 'O', lastName: 'K',
    }).returning();
    expect(cust.storeId).toBe(storeAId);
    // customer_addresses: matching storeId + the new customer's id → accept
    const [addr] = await tenantDb.insert(schema.customerAddresses).values({
      customerId: cust.id, storeId: storeAId, name: 'Home',
      firstName: 'O', lastName: 'K', addressLine1: '1 O St',
      city: 'X', country: 'SA', postalCode: '11111',
    }).returning();
    expect(addr.storeId).toBe(storeAId);
    // cleanup (as the tenant — allowed since storeId matches)
    await tenantDb.delete(schema.customerAddresses).where(eq(schema.customerAddresses.id, addr.id));
    await tenantDb.delete(schema.customers).where(eq(schema.customers.id, cust.id));
  });
});
```

> Required notNull columns (from `schema.ts`): `customers` (`:323-341`): `storeId`, `email`, `password`, `firstName`, `lastName`, `mfaEnabled` (notNull, has default). `customer_addresses` (`:347-...`): `customerId`, `storeId`, `name`, `firstName`, `lastName`, `addressLine1`, `city`, `country`, `postalCode`. Verify these against `schema.ts` before running — adjust if any column is `notNull` without a default and isn't seeded above. The `emailStoreUnique` unique constraint (`email`+`storeId`) means the test emails must be unique per store — the `Date.now()` suffix ensures that; if a prior crashed run left residue, the `beforeAll` pre-pass deletes by domain first.

- [ ] **Step 4: Apply the migration + run the RLS test**

Apply the migration (runs as `dbOwner`): check `apps/backend/package.json` `scripts` for a `db:migrate`/`migrate` script; if present, `pnpm --filter backend run <script>`. Otherwise: `pnpm --filter backend exec node --experimental-vm-modules -e "import('./src/db/index.js').then(m => m.runMigrations()).then(() => { console.log('migrated'); process.exit(0); })"`. Verify via psql that the policies exist:
```bash
psql "$DATABASE_URL" -c "SELECT tablename, polname FROM pg_policy WHERE polrelid IN ('customers'::regclass,'customer_addresses'::regclass);"
```
Expected: 2 rows, each `tenant_iso`. And `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname IN ('customers','customer_addresses');` → both `t/t`.

Run: `pnpm --filter backend test -- src/modules/customer/customers.rls.test.ts`
Expected: PASS (6/6) — requires live Postgres with `app_tenant`/`app_admin` roles applied (`pnpm --filter backend exec tsx src/scripts/rls-roles.ts`) and `DATABASE_URL` + `RLS_TENANT_PASSWORD` set. If a test fails with `23505 stores_domain_unique` or `23505 customers_email_store_unique` or `UNDEFINED_VALUE`, it's test-DB residue from a crashed prior run — clean it (FK-respecting order: `DELETE FROM customer_addresses WHERE store_id IN (SELECT id FROM stores WHERE domain LIKE 'rls-cust-%'); DELETE FROM customers WHERE store_id IN (SELECT id FROM stores WHERE domain LIKE 'rls-cust-%'); DELETE FROM stores WHERE domain LIKE 'rls-cust-%';`) and re-run. Not a code regression.

- [ ] **Step 5: Full suite + typecheck + lint (final gate before RLS goes live)**

Run: `pnpm --filter backend typecheck && pnpm --filter backend lint && pnpm --filter backend test`
Expected: 0 type errors; lint clean; full suite green (956 + all the new routing tests + 6 RLS tests). This is the proof the withTenant refactor survives RLS being ON — a missed wrap zeros out and surfaces here. **Pay special attention to the customer auth path tests** (`auth.route.customer.test.ts`, `auth.service.test.ts`, `auth.route.session/password/mfa` tests): if any customer read now returns zero where the test expected a row, it means a missed `withTenant` wrap — fix it before committing.

- [ ] **Step 6: Force-add the gitignored migration + commit**

```bash
git add -f apps/backend/drizzle/0027_customers_rls.sql
git add apps/backend/drizzle/meta/_journal.json apps/backend/src/modules/customer/customers.rls.test.ts
git commit -m "feat(rls): enable RLS on customers + customer_addresses (Phase 1)

Migration 0027: ENABLE+FORCE RLS + tenant_iso policy (NULLIF-hardened) on customers
and customer_addresses (both 4.1 direct store_id — customer_addresses has its own
storeId, not a subquery child of customers). Closes the customer zero-out risks:
every customer/auth/analytics read/write now runs inside withTenant(storeId)
(Tasks 1-2,4-5), the scope-hook findCustomerForVerification runs with tenant context
on every request (Task 4 — the worst risk), verify-email/reset-password inline
set_config from the token storeId (Task 3), customers/addresses seed uses dbOwner
(Task 6). Real-DB negative test (customers.rls.test.ts) proves fail-closed,
single-tenant visibility, cross-tenant isolation, and WITH CHECK reject/accept.
Defense-in-depth on the existing where eq(storeId) filters (plus the missing one
added on findCustomerById)."
```

---

## Post-implementation

- Update `docs/PROGRESS.md` with a "## 2026-06-28 — RLS Phase 1: customers" record (tables enabled: customers, customer_addresses; services refactored: customer.service, auth.service customer methods, analytics.service; the inline-set_config verify-email/reset-password technique; test count).
- Update memory: write a new `rls_phase1_customers` memory and update `resume-2026-06-28-next-rls-module` (mark customers done; next = catalog: products/variants/options/modifiers). Update the "tables with RLS" list: `wishlists` (0024), `orders`+`order_items` (0025), `carts`+`cart_items`+`coupons`+`coupon_usages` (0026), `customers`+`customer_addresses` (0027).
- Note the new reusable technique for future pre-auth token-based paths: **inline `tx.execute(sql\`SELECT set_config('app.tenant_id', ${storeId}, true)\`)` mid-`db.transaction`** when `storeId` is read from a token row inside the tx (the `withTenant` helper can't be used because `storeId` is unknown at tx-open). Any future RLS-gated table read from a verification-token-gated path (e.g. if merchant email-verification ever reads a merchant table under users-RLS) follows the same pattern.
- The remaining RLS Phase 1 modules (catalog: products/variants/options/modifiers → reviews → shipping/tax → payments-table → webhooks → support/invoices/returns-table → cms/apiKeys) are separate plans per parent spec §5. Do not start them in this plan.
- Do NOT push without an explicit user ask (standing rule). Commit only on user request per task (the plan shows `git commit` per task — run them only when the user has authorized commits for this session).

## Self-review (run after writing — done during planning)

- **Spec coverage:** every item in `2026-06-28-rls-phase1-customers-design.md` §4 maps to a task: §4.1 customer.repo+service → Task 1; §4.2 auth.repo findCustomerById + auth.service customer methods → Task 2; §4.2 verifyEmail/resetPassword inline set_config → Task 3; §4.3 scopes/customer.ts scope hook → Task 4; §4.2/§4.4 auth route call-sites → Task 4; §4.4 analytics.repo+service → Task 5; §4.5 seed.ts → Task 6. §3 migration → Task 7. §6 testing → per-task + Task 7. §1 worst risk #1 (scope hook) → Task 4 (load-bearing); §1 risk #3 (verify-email/reset-password) → Task 3 (load-bearing); §1 risk #5 (analytics latent zero-out) → Task 5. The "Already safe" `findCustomerById` defense-in-depth add → Task 2. ✓
- **Placeholder scan:** no TBD/TODO; migration + all test code are complete. Behavioral-test mocks specify exact shapes with "adjust if Drizzle `sql`/`call` form differs" guards (instructions for the trickiest mock — the verifyEmail ordering test — not placeholders). ✓
- **Type consistency:** `tx?: DbOrTx` + `const executor = tx ?? db;` uniform across customer.repo (already), auth.repo (findCustomerById gains storeId), analytics.repo; `withTenant(storeId, fn)` signature matches `lib/withTenant.ts`; `findCustomerForVerification(customerId, storeId)`, `getCustomerProfile(customerId, storeId)`, `enableCustomerMfa(customerId, storeId)`, `disableCustomerMfa(customerId, storeId)` signature changes flagged in Task 2 + applied to all call sites in Task 4. ✓
- **Invariants preserved:** `order.service`/`cart.service`/`coupon.service` untouched (already RLS-safe from prior Phase 1); superAdmin customer count stays on `dbAdmin`; `buildPeriodExpr` not wrapped (pure CPU); cache `wrap` + email-send + queue-adds outside tx; `verification_tokens` raw tx reads left as-is (Phase 2 edge case); merchant branch of verifyEmail/resetPassword/requestPasswordReset/resendVerification unchanged (users table, no RLS this phase). ✓
- **Coupling note:** Tasks 2 and 4 are coupled by the `storeId` signature change — the plan flags this (Task 2 Step 6 note + Step 7) and recommends landing the call-site edits + mock fixes together so the suite stays green between commits. ✓
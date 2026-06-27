# RLS Phase 2a — dbAdmin Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route all cross-tenant / pre-tenant DB reads to `dbAdmin` (the BYPASSRLS connection) so that enabling RLS on hub tables (orders next) does not zero out super-admin views, pre-tenant API-key auth, or signup/MFA verification-token flows.

**Architecture:** Three drizzle clients exist in `apps/backend/src/db/index.ts` (from Phase 0): `db` (app_tenant — RLS-enforced in prod, falls back to owner in dev/test), `dbAdmin` (app_admin — BYPASSRLS; same fallback), `dbOwner` (owner — migrations). This plan makes four targeted groups of reads use `dbAdmin` instead of `db`: (1) the entire `superAdmin.repo.ts` (cross-tenant by design, no service ever passes a `tx`), (2) the three unscoped admin reads in `order.repo.ts` (`findAll`, `findByIdAdmin`, `findOrderItems`), (3) the two pre-tenant methods in `apiKey.repo.ts` (`findByKeyHash`, `touchLastUsed`), and (4) the four `verification_tokens` methods in `auth.repo.ts`. Because `dbAdmin` falls back to the owner URL when `DATABASE_URL_ADMIN` is unset, every change is a **no-op in dev/test** (dbAdmin === owner === BYPASSRLS, same rows as today) and only becomes meaningful in prod (app_admin BYPASSRLS). Existing tests therefore stay green; correctness is proven structurally (behavioral unit tests asserting `dbAdmin` routing) and end-to-end in the *next* plan (orders RLS negative test).

**Tech Stack:** Fastify v5, Drizzle ORM (postgres-js), PostgreSQL 17, Vitest, pnpm.

## Global Constraints

- **pnpm ONLY** — never `npm install`, `npm run`, or any npm command.
- **Zero TypeScript errors** — `pnpm typecheck` passes with zero errors.
- **No `any` type** — do not add any new `any`/`as any`. (`order.repo.ts` has a pre-existing file-level `eslint-disable @typescript-eslint/no-explicit-any` and existing `as any` casts — do not touch those lines, and do not add new ones.)
- **No console.log** — use `fastify.log.*` only (N/A in repos; none added here).
- **No inline preHandler** — hooks only in scope files (N/A here).
- **Zod strictObject()** on route bodies (N/A here — no route body changes).
- **storeId from JWT only** — never from body/query (N/A here — these are cross-tenant paths by design).
- **ESM imports only** — no `require()`.
- **Tenant isolation** — every *tenant* query filtered by storeId from JWT. The reads this plan moves to `dbAdmin` are **deliberately cross-tenant** (super-admin platform views, pre-tenant auth lookups); they must NOT gain a storeId filter. Moving them to `dbAdmin` is what *preserves* tenant isolation: it takes them off the RLS-subject (`app_tenant`) connection so they cannot accidentally read tenant rows through the subject role.
- **Migration .sql files are gitignored (`*.sql`)** — N/A here (no new migration in this plan). Roles already bootstrapped by `scripts/rls-roles.ts` in Phase 0; `DATABASE_URL_ADMIN` already required in prod by `env.ts` superRefine (Phase 0).
- **Commit only when the user explicitly asks.** This plan's tasks end with a commit step because the user already said "continue pannu commit pannidu" (do it + commit as you go) for the RLS rollout — each task commits its own TDD slice. Do not push.

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `apps/backend/src/modules/superAdmin/superAdmin.repo.ts` | All cross-tenant super-admin DB queries (stores, plans, orders stats, activity logs, tickets, settings, invoices, notifications, domains, staff) | Wholesale `db` → `dbAdmin` |
| `apps/backend/src/modules/order/order.repo.ts` | Order queries (mix of tenant-scoped and admin reads) | `findAll`, `findByIdAdmin`, `findOrderItems` → `dbAdmin`; import `dbAdmin`; all other methods unchanged |
| `apps/backend/src/modules/apiKey/apiKey.repo.ts` | API-key queries (pre-tenant lookup + merchant-scoped CRUD) | `findByKeyHash`, `touchLastUsed` default executor → `dbAdmin`; other methods unchanged |
| `apps/backend/src/modules/auth/auth.repo.ts` | Auth lookups + verification tokens | 4 `verification_tokens` methods default executor → `dbAdmin`; other methods unchanged |
| `apps/backend/src/modules/superAdmin/superAdmin.repo.dbAdmin.test.ts` (new) | Behavioral test: superAdmin.repo routes through dbAdmin | New |
| `apps/backend/src/modules/order/order.repo.dbAdmin.test.ts` (new) | Behavioral test: order admin reads route through dbAdmin | New |
| `apps/backend/src/modules/apiKey/apiKey.repo.dbAdmin.test.ts` (new) | Behavioral test: apiKey pre-tenant lookup routes through dbAdmin | New |
| `apps/backend/src/modules/auth/auth.repo.dbAdmin.test.ts` (new) | Behavioral test: verification_tokens flows route through dbAdmin | New |
| `docs/PROGRESS.md` | Session log | Append Phase 2a record |

**Out of scope (deliberately):** `findCouponById` in order.repo (no production caller — only `order.service.test.ts` mocks it; it already takes `tx?: DbOrTx` so if revived inside checkout it is `withTenant`-compatible). Pre-tenant auth lookups like `findUserByEmail` / `findStoreByOwnerEmail` / `findCustomerByEmailAndStoreId` (these move to `dbAdmin` when the `users`/`stores`/`customers` tables get RLS in their own Phase 1 module plans, not here). The rest of `apiKey.repo` and `auth.repo` (merchant/customer-scoped CRUD) stays on `db` and moves to `withTenant` in later Phase 1 module plans.

---

### Task 1: superAdmin.repo → dbAdmin (wholesale)

**Why:** Every method in `superAdmin.repo.ts` is cross-tenant (platform-wide store/plan/order/ticket/invoice/notification/staff stats and CRUD). `superAdmin.service.ts` has **no `db.transaction()` calls** and never passes a `tx` to any repo method, so `tx ?? <executor>` always resolves to the executor. Once `orders`/`stores`/`customers`/etc. get RLS, reads on the `app_tenant` connection with no tenant context would return zero rows and break the entire super-admin dashboard. Routing the whole repo to `dbAdmin` (BYPASSRLS) fixes this for all super-admin paths at once. Per RLS spec §4.3, `platformSettings`/`adminNotifications` get no grant to `app_tenant` at all, so they *must* be read via `dbAdmin` — this wholesale change satisfies that too.

**Files:**
- Modify: `apps/backend/src/modules/superAdmin/superAdmin.repo.ts` (line 5 import; every `db.` → `dbAdmin.`; every `tx ?? db` → `tx ?? dbAdmin`)
- Test: `apps/backend/src/modules/superAdmin/superAdmin.repo.dbAdmin.test.ts` (new)

**Interfaces:**
- Consumes: `dbAdmin` from `../../db/index.js` (exported in Phase 0, commit 6508489).
- Produces: unchanged `superAdminRepo` public API — callers (`superAdmin.service.ts`) need no changes.

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/modules/superAdmin/superAdmin.repo.dbAdmin.test.ts`:

```typescript
// Behavioral test: superAdminRepo routes ALL reads through dbAdmin (BYPASSRLS),
// never the tenant-scoped `db`. This is what keeps cross-tenant super-admin
// views working once hub tables get RLS. Mocks both connections; asserts the
// dbAdmin query chain is used and the `db` chain is NOT.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/index.js', () => {
  const dbFindFirst = vi.fn();
  const dbAdminFindFirst = vi.fn();
  return {
    db: { query: { stores: { findFirst: dbFindFirst } } },
    dbAdmin: { query: { stores: { findFirst: dbAdminFindFirst } } },
  };
});

import { db, dbAdmin } from '../../db/index.js';
import { superAdminRepo } from './superAdmin.repo.js';

const dbFindFirst = db.query.stores.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbAdminFindFirst = dbAdmin.query.stores.findFirst as unknown as ReturnType<typeof vi.fn>;

describe('superAdminRepo dbAdmin routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbAdminFindFirst.mockResolvedValue(undefined);
  });

  it('routes cross-tenant reads through dbAdmin (BYPASSRLS), not the tenant-scoped db', async () => {
    await superAdminRepo.findStoreById('store-1');

    expect(dbAdminFindFirst).toHaveBeenCalled();
    expect(dbFindFirst).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec vitest run src/modules/superAdmin/superAdmin.repo.dbAdmin.test.ts`
Expected: FAIL — `dbAdminFindFirst` not called (because the repo still uses `db`), so `expect(dbAdminFindFirst).toHaveBeenCalled()` fails.

- [ ] **Step 3: Swap superAdmin.repo to dbAdmin**

In `apps/backend/src/modules/superAdmin/superAdmin.repo.ts`:

Change the import (line 5):
```typescript
import { dbAdmin } from '../../db/index.js';
```
(was `import { db } from '../../db/index.js';` — `db` is no longer referenced after the swap, so drop it to avoid an unused-import lint error.)

Then replace **every** occurrence of `db.` (direct calls) with `dbAdmin.` and **every** `tx ?? db` with `tx ?? dbAdmin`. Concretely, the methods and their lines (1-indexed, current file):
- `findStores` (30-40): `db.query.stores.findMany` → `dbAdmin.query.stores.findMany`; `db.select(...)` → `dbAdmin.select(...)`
- `findStoreById` (49): `db.query.stores.findFirst` → `dbAdmin.query.stores.findFirst`
- `findStoreByIdWithCounts` (55-66): `db.query.stores.findFirst`, `db.select(...)` (×4) → `dbAdmin.*`
- `updateStore` (78): `const executor = tx ?? db;` → `const executor = tx ?? dbAdmin;`
- `findPlans` (90): `db.query.merchantPlans.findMany` → `dbAdmin.*`
- `findPlanById` (96): `db.query.merchantPlans.findFirst` → `dbAdmin.*`
- `insertPlan` (102): `tx ?? db` → `tx ?? dbAdmin`
- `updatePlan` (108): `tx ?? db` → `tx ?? dbAdmin`
- `deletePlan` (118): `tx ?? db` → `tx ?? dbAdmin`
- `countStores` (125): `db.select(...)` → `dbAdmin.select(...)`
- `countStoresByStatus` (130): `db.select(...)` → `dbAdmin.select(...)`
- `countActiveStores` (138): `db.select(...)` → `dbAdmin.select(...)`
- `countPendingStores` (143): `db.select(...)` → `dbAdmin.select(...)`
- `countSuspendedStores` (148): `db.select(...)` → `dbAdmin.select(...)`
- `findRecentStores` (153): `db.query.stores.findMany` → `dbAdmin.*`
- `countPlans` (160): `db.select(...)` → `dbAdmin.select(...)`
- `getRevenueSummary` (172-177): `db.select(...)` (×2) → `dbAdmin.select(...)`
- `getRevenueByStore` (190): `db.select(...)` → `dbAdmin.select(...)`
- `getRecentRevenue` (210): `db.select(...)` → `dbAdmin.select(...)`
- `findActivityLogs` (234-243): `db.query.activityLogs.findMany`, `db.select(...)` → `dbAdmin.*`
- `findTickets` (258-266): `db.query.supportTickets.findMany`, `db.select(...)` → `dbAdmin.*`
- `findTicketById` (273): `db.query.supportTickets.findFirst` → `dbAdmin.*`
- `insertTicket` (284): `tx ?? db` → `tx ?? dbAdmin`
- `updateTicket` (290): `tx ?? db` → `tx ?? dbAdmin`
- `insertTicketReply` (299): `tx ?? db` → `tx ?? dbAdmin`
- `findSettings` (307): `db.select(...)` → `dbAdmin.select(...)`
- `findSettingByKey` (311): `db.query.platformSettings.findFirst` → `dbAdmin.*`
- `upsertSetting` (317-329): `db.query...`, `db.update...`, `db.insert...` → `dbAdmin.*`
- `findInvoices` (342-351): `db.query.invoices.findMany`, `db.select(...)` → `dbAdmin.*`
- `findInvoiceById` (357): `db.query.invoices.findFirst` → `dbAdmin.*`
- `insertInvoice` (364): `tx ?? db` → `tx ?? dbAdmin`
- `updateInvoice` (370): `tx ?? db` → `tx ?? dbAdmin`
- `findNotifications` (386-394): `db.query.adminNotifications.findMany`, `db.select(...)` (×2) → `dbAdmin.*`
- `findNotificationById` (401): `db.query.adminNotifications.findFirst` → `dbAdmin.*`
- `insertNotification` (407): `tx ?? db` → `tx ?? dbAdmin`
- `markNotificationRead` (413): `tx ?? db` → `tx ?? dbAdmin`
- `markAllNotificationsRead` (422): `tx ?? db` → `tx ?? dbAdmin`
- `countUnreadNotifications` (429): `db.select(...)` → `dbAdmin.select(...)`
- `findStoresWithCustomDomains` (443-451): `db.query.stores.findMany`, `db.select(...)` → `dbAdmin.*`
- `verifyCustomDomain` (458): `db.update(...)` → `dbAdmin.update(...)`
- `rejectCustomDomain` (466): `db.update(...)` → `dbAdmin.update(...)`
- `findAllStaff` (482-490): `db.query.users.findMany`, `db.select(...)` → `dbAdmin.*`
- `findAllInvitations` (503-511): `db.query.staffInvitations.findMany`, `db.select(...)` → `dbAdmin.*`
- `deleteStaff` (518): `db.delete(...)` → `dbAdmin.delete(...)`
- `revokeInvitation` (522): `db.update(...)` → `dbAdmin.update(...)`
- `findUserById` (530): `db.query.users.findFirst` → `dbAdmin.*`
- `findInvitationById` (536): `db.query.staffInvitations.findFirst` → `dbAdmin.*`

Tip: in the editor, after changing the import, do a careful find/replace of `db.` → `dbAdmin.` and `tx ?? db` → `tx ?? dbAdmin` scoped to this file, then eyeball each hit against the list above. Do **not** blindly replace inside the import path string or the `DbOrTx` type import.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec vitest run src/modules/superAdmin/superAdmin.repo.dbAdmin.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full super-admin + typecheck suite to confirm no regression**

Run:
```
pnpm --filter backend exec vitest run src/modules/superAdmin
pnpm --filter backend typecheck
```
Expected: existing super-admin tests PASS (dbAdmin falls back to owner in dev/test → identical behavior) and typecheck PASS with zero errors. No new `console.log`, no new `any`.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/superAdmin/superAdmin.repo.ts apps/backend/src/modules/superAdmin/superAdmin.repo.dbAdmin.test.ts
git commit -m "feat(rls): route superAdmin.repo wholesale to dbAdmin (BYPASSRLS)

Every superAdminRepo method is cross-tenant (platform-wide stats + CRUD)
and superAdmin.service never passes a tx, so the executor always resolves
to dbAdmin. Once hub tables get RLS, these reads on the app_tenant
connection with no tenant context would return zero rows and break the
admin dashboard; dbAdmin (app_admin BYPASSRLS) keeps them working. Also
satisfies spec §4.3: platformSettings/adminNotifications get no grant to
app_tenant, so they MUST be read via dbAdmin.

No behavior change in dev/test (dbAdmin falls back to owner = BYPASSRLS,
same rows as today). Behavioral unit test asserts dbAdmin routing.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: order.repo admin reads → dbAdmin

**Why:** `findAll` (cross-tenant order list) and `findByIdAdmin` (id-only order detail) are called **only** by `order.route.superAdmin.ts` (lines 35 and 52) — super-admin paths. `findOrderItems` (id-only) has no production caller today but is admin-shaped, so route it for correctness if revived. These must run on `dbAdmin` so that when `orders` gets RLS (next plan), super-admin order views still see all orders. The tenant-scoped reads (`findByStoreId`, `findById(orderId, storeId)`, `findOrderItemsByOrderId(orderId, storeId)`, etc.) stay on `db` and will move to `withTenant` in the orders Phase 1 plan.

**Files:**
- Modify: `apps/backend/src/modules/order/order.repo.ts` (line 3 import; methods `findAll` 112-153, `findByIdAdmin` 155-182, `findOrderItems` 240-244)
- Test: `apps/backend/src/modules/order/order.repo.dbAdmin.test.ts` (new)

**Interfaces:**
- Consumes: `dbAdmin` from `../../db/index.js`.
- Produces: unchanged `orderRepo` public API.

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/modules/order/order.repo.dbAdmin.test.ts`:

```typescript
// Behavioral test: the unscoped admin reads in orderRepo (findAll,
// findByIdAdmin, findOrderItems) route through dbAdmin (BYPASSRLS), not the
// tenant-scoped db. These are super-admin paths (called only from
// order.route.superAdmin.ts); once orders gets RLS they must bypass it.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/index.js', () => {
  const dbOrdersFindFirst = vi.fn();
  const dbAdminOrdersFindFirst = vi.fn();
  const dbAdminOrdersFindMany = vi.fn();
  const dbAdminOrderItemsFindMany = vi.fn();
  return {
    db: { query: { orders: { findFirst: dbOrdersFindFirst } } },
    dbAdmin: {
      query: {
        orders: { findFirst: dbAdminOrdersFindFirst, findMany: dbAdminOrdersFindMany },
        orderItems: { findMany: dbAdminOrderItemsFindMany },
      },
    },
  };
});

import { db, dbAdmin } from '../../db/index.js';
import { orderRepo } from './order.repo.js';

const dbOrdersFindFirst = db.query.orders.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbAdminOrdersFindFirst = dbAdmin.query.orders.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbAdminOrdersFindMany = dbAdmin.query.orders.findMany as unknown as ReturnType<typeof vi.fn>;
const dbAdminOrderItemsFindMany = dbAdmin.query.orderItems.findMany as unknown as ReturnType<typeof vi.fn>;

describe('orderRepo admin reads dbAdmin routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbAdminOrdersFindFirst.mockResolvedValue(undefined);
    dbAdminOrdersFindMany.mockResolvedValue([]);
    dbAdminOrderItemsFindMany.mockResolvedValue([]);
  });

  it('findByIdAdmin routes through dbAdmin, not db', async () => {
    await orderRepo.findByIdAdmin('order-1');

    expect(dbAdminOrdersFindFirst).toHaveBeenCalled();
    expect(dbOrdersFindFirst).not.toHaveBeenCalled();
  });

  it('findOrderItems routes through dbAdmin', async () => {
    await orderRepo.findOrderItems('order-1');

    expect(dbAdminOrderItemsFindMany).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec vitest run src/modules/order/order.repo.dbAdmin.test.ts`
Expected: FAIL — `dbAdminOrdersFindFirst` not called (repo still uses `db`).

- [ ] **Step 3: Swap the three admin methods to dbAdmin**

In `apps/backend/src/modules/order/order.repo.ts`:

Change the import (line 3):
```typescript
import { db, dbAdmin } from '../../db/index.js';
```
(was `import { db } from '../../db/index.js';`)

In `findAll` (the `Promise.all` block, lines 136-150), replace `db.` with `dbAdmin.`:
```typescript
    const [rows, totalResult] = await Promise.all([
      dbAdmin.query.orders.findMany({
        where,
        orderBy: desc(orders.createdAt),
        limit: opts.limit,
        offset: (opts.page - 1) * opts.limit,
        with: {
          customer: {
            columns: { id: true, email: true, firstName: true, lastName: true, phone: true, storeId: true },
          },
          items: true,
        },
      }),
      dbAdmin.select({ count: count() }).from(orders).where(where),
    ]);
```

In `findByIdAdmin` (lines 156 and 171), replace `db.` with `dbAdmin.`:
```typescript
  async findByIdAdmin(orderId: string): Promise<OrderWithDetails | undefined> {
    const order = await dbAdmin.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        customer: {
          columns: { id: true, email: true, firstName: true, lastName: true, phone: true, storeId: true },
        },
        items: true,
        coupon: true,
      },
    });
    if (!order) return undefined;

    // Batch-load products to eliminate N+1
    const productIds = (order.items?.map((i) => i.productId).filter((id): id is string => !!id) ?? []);
    if (productIds.length > 0) {
      const productRows = await dbAdmin.query.products.findMany({
        where: and(inArray(products.id, productIds)),
        columns: { id: true, titleEn: true, titleAr: true, images: true },
      });
      const productMap = new Map(productRows.map((p) => [p.id, p]));
      for (const item of order.items) {
        (item as OrderItemWithProduct).product = item.productId ? productMap.get(item.productId) ?? null : null;
      }
    }

    return order as OrderWithDetails;
  },
```
(Leave the existing `as any`/`as OrderItemWithProduct` casts exactly as-is — do not add or remove `any`.)

In `findOrderItems` (lines 240-244):
```typescript
  async findOrderItems(orderId: string): Promise<typeof orderItems.$inferSelect[]> {
    return dbAdmin.query.orderItems.findMany({
      where: eq(orderItems.orderId, orderId),
    });
  }
```

Do **not** change `findByStoreId`, `findById`, `findByIdSimple`, `findByOrderNumber`, `findOrderItemsByOrderId`, `findCouponById`, or any write method — those stay on `db` (tenant-scoped).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec vitest run src/modules/order/order.repo.dbAdmin.test.ts`
Expected: PASS.

- [ ] **Step 5: Run order + super-admin integration tests + typecheck**

Run:
```
pnpm --filter backend exec vitest run src/modules/order src/modules/superAdmin
pnpm --filter backend typecheck
```
Expected: PASS, zero TS errors. (The `order.service.test.ts` mocks the repo, so it is unaffected by the repo-level swap; `order.route.superAdmin.test.ts` hits the real DB via dbAdmin=owner fallback → same rows.)

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/order/order.repo.ts apps/backend/src/modules/order/order.repo.dbAdmin.test.ts
git commit -m "feat(rls): route order.repo admin reads (findAll/findByIdAdmin/findOrderItems) to dbAdmin

These three are the only unscoped order reads and are super-admin paths
(order.route.superAdmin.ts is the sole non-test caller of findAll and
findByIdAdmin). Routing them to dbAdmin (BYPASSRLS) ensures the admin
order views keep seeing all orders once the orders table gets RLS in the
next plan. findCouponById is left on db (unused, tx-compatible for
checkout). No behavior change in dev/test (dbAdmin=owner fallback).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: apiKey.repo pre-tenant lookup → dbAdmin

**Why:** `findByKeyHash` and `touchLastUsed` are called during API-key auth — *before* the storeId is known (the key hash resolves to a storeId). They are the only pre-tenant apiKey paths and are called only by `apiKey.service.ts` (lines 133, 140) with no `tx`. Once `apiKeys` gets RLS, these on `app_tenant` with no tenant context would return nothing and break all API-key auth. The merchant-scoped methods (`findByStoreId`, `findById`, `create`, `update`, `delete`) stay on `db` and move to `withTenant` in the apiKey Phase 1 plan.

**Files:**
- Modify: `apps/backend/src/modules/apiKey/apiKey.repo.ts` (line 2 import; `findByKeyHash` 38-43, `touchLastUsed` 70-76)
- Test: `apps/backend/src/modules/apiKey/apiKey.repo.dbAdmin.test.ts` (new)

**Interfaces:**
- Consumes: `dbAdmin` from `../../db/index.js`.
- Produces: unchanged `apiKeyRepo` public API.

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/modules/apiKey/apiKey.repo.dbAdmin.test.ts`:

```typescript
// Behavioral test: the pre-tenant API-key auth lookup (findByKeyHash) routes
// through dbAdmin (BYPASSRLS), not the tenant-scoped db. This lookup happens
// BEFORE the storeId is known (the hash resolves to a storeId), so it cannot
// run inside withTenant and must bypass RLS once apiKeys gets RLS.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/index.js', () => {
  const dbFindFirst = vi.fn();
  const dbAdminFindFirst = vi.fn();
  const dbAdminUpdate = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) }));
  return {
    db: { query: { apiKeys: { findFirst: dbFindFirst } } },
    dbAdmin: { query: { apiKeys: { findFirst: dbAdminFindFirst } }, update: dbAdminUpdate },
  };
});

import { db, dbAdmin } from '../../db/index.js';
import { apiKeyRepo } from './apiKey.repo.js';

const dbFindFirst = db.query.apiKeys.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbAdminFindFirst = dbAdmin.query.apiKeys.findFirst as unknown as ReturnType<typeof vi.fn>;

describe('apiKeyRepo pre-tenant lookup dbAdmin routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbAdminFindFirst.mockResolvedValue(undefined);
  });

  it('findByKeyHash routes through dbAdmin, not db', async () => {
    await apiKeyRepo.findByKeyHash('hash-1');

    expect(dbAdminFindFirst).toHaveBeenCalled();
    expect(dbFindFirst).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec vitest run src/modules/apiKey/apiKey.repo.dbAdmin.test.ts`
Expected: FAIL — `dbAdminFindFirst` not called.

- [ ] **Step 3: Swap the two pre-tenant methods to dbAdmin**

In `apps/backend/src/modules/apiKey/apiKey.repo.ts`:

Change the import (line 2):
```typescript
import { db, dbAdmin } from '../../db/index.js';
```

In `findByKeyHash` (line 39), change the default executor:
```typescript
  async findByKeyHash(keyHash: string, tx?: DbExecutor) {
    const executor = tx ?? dbAdmin;
    return executor.query.apiKeys.findFirst({
      where: and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)),
    });
  },
```

In `touchLastUsed` (line 71), change the default executor:
```typescript
  async touchLastUsed(id: string, tx?: DbExecutor) {
    const executor = tx ?? dbAdmin;
    await executor
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, id));
  },
```

Leave `findByStoreId`, `findById`, `create`, `update`, `delete` using `tx ?? db` (unchanged) — those are merchant-scoped and will move to `withTenant` later.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec vitest run src/modules/apiKey/apiKey.repo.dbAdmin.test.ts`
Expected: PASS.

- [ ] **Step 5: Run apiKey suite + typecheck**

Run:
```
pnpm --filter backend exec vitest run src/modules/apiKey
pnpm --filter backend typecheck
```
Expected: PASS, zero TS errors. (`apiKey.service.test.ts` mocks the repo, so it is unaffected.)

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/apiKey/apiKey.repo.ts apps/backend/src/modules/apiKey/apiKey.repo.dbAdmin.test.ts
git commit -m "feat(rls): route apiKey findByKeyHash + touchLastUsed to dbAdmin

These two are the pre-tenant API-key auth paths (the key hash resolves to
a storeId, so they run before any tenant context). Routing to dbAdmin
(BYPASSRLS) keeps API-key auth working once apiKeys gets RLS. The
merchant-scoped CRUD stays on db and moves to withTenant in the apiKey
Phase 1 plan. No behavior change in dev/test (dbAdmin=owner fallback).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: auth.repo verification_tokens → dbAdmin

**Why:** The four `verification_tokens` methods are used by signup / email-verify / password-reset / MFA flows that run *before* a tenant session exists — the lookup is by token/email across stores, so it cannot be scoped by storeId. Per RLS spec §4.3, `verification_tokens` is RLS-exempt **and gets no grant to `app_tenant` at all** — it can only be read/written via `dbAdmin`. They are called only by `auth.service.ts` (lines 315-324, etc.) with no `tx`. The rest of `auth.repo` (user/customer/store/superAdmin lookups) stays on `db` for now and moves to `dbAdmin`/`withTenant` when those tables get RLS in their own Phase 1 module plans.

**Files:**
- Modify: `apps/backend/src/modules/auth/auth.repo.ts` (line 3 import; methods `deleteVerificationTokensByEmailTypeUserType` 197-211, `createVerificationToken` 213-217, `findVerificationToken` 219-229, `markTokenUsed` 231-237)
- Test: `apps/backend/src/modules/auth/auth.repo.dbAdmin.test.ts` (new)

**Interfaces:**
- Consumes: `dbAdmin` from `../../db/index.js`.
- Produces: unchanged `authRepo` public API.

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/modules/auth/auth.repo.dbAdmin.test.ts`:

```typescript
// Behavioral test: verification_tokens flows route through dbAdmin (BYPASSRLS),
// not the tenant-scoped db. Per RLS spec §4.3 verification_tokens gets no grant
// to app_tenant, so it MUST be accessed via dbAdmin. These methods serve
// signup/verify/reset/MFA — all pre-tenant (lookup by token/email across stores).
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/index.js', () => {
  const dbFindFirst = vi.fn();
  const dbAdminFindFirst = vi.fn();
  return {
    db: { query: { verificationTokens: { findFirst: dbFindFirst } } },
    dbAdmin: { query: { verificationTokens: { findFirst: dbAdminFindFirst } } },
  };
});

import { db, dbAdmin } from '../../db/index.js';
import { authRepo } from './auth.repo.js';

const dbFindFirst = db.query.verificationTokens.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbAdminFindFirst = dbAdmin.query.verificationTokens.findFirst as unknown as ReturnType<typeof vi.fn>;

describe('authRepo verification_tokens dbAdmin routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbAdminFindFirst.mockResolvedValue(undefined);
  });

  it('findVerificationToken routes through dbAdmin, not db', async () => {
    await authRepo.findVerificationToken('tok-1', 'email_verify');

    expect(dbAdminFindFirst).toHaveBeenCalled();
    expect(dbFindFirst).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec vitest run src/modules/auth/auth.repo.dbAdmin.test.ts`
Expected: FAIL — `dbAdminFindFirst` not called.

- [ ] **Step 3: Swap the four verification_tokens methods to dbAdmin**

In `apps/backend/src/modules/auth/auth.repo.ts`:

Change the import (line 3):
```typescript
import { db, dbAdmin } from '../../db/index.js';
```

In `deleteVerificationTokensByEmailTypeUserType` (line 203), change the default executor:
```typescript
    const executor = tx ?? dbAdmin;
```

In `createVerificationToken` (line 214):
```typescript
    const executor = tx ?? dbAdmin;
```

In `findVerificationToken` (line 220):
```typescript
    const executor = tx ?? dbAdmin;
```

In `markTokenUsed` (line 232):
```typescript
    const executor = tx ?? dbAdmin;
```

Leave all other `authRepo` methods using `tx ?? db` (unchanged) — the user/customer/store/superAdmin lookups move to `dbAdmin`/`withTenant` when those tables get RLS in their own Phase 1 module plans. Leave `revokeAllUserTokens` untouched (Redis-only, no DB).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec vitest run src/modules/auth/auth.repo.dbAdmin.test.ts`
Expected: PASS.

- [ ] **Step 5: Run auth suite + typecheck**

Run:
```
pnpm --filter backend exec vitest run src/modules/auth
pnpm --filter backend typecheck
```
Expected: PASS, zero TS errors. (`auth.service.test.ts` mocks the repo, so the 4 verification-token service tests are unaffected by the repo-level swap.)

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/auth/auth.repo.ts apps/backend/src/modules/auth/auth.repo.dbAdmin.test.ts
git commit -m "feat(rls): route auth verification_tokens methods to dbAdmin

The four verification_tokens methods serve signup/verify/reset/MFA flows
that run before a tenant session exists (lookup by token/email across
stores). Per spec §4.3 verification_tokens gets no grant to app_tenant, so
it MUST be accessed via dbAdmin (BYPASSRLS). The rest of auth.repo stays
on db and moves to dbAdmin/withTenant when users/stores/customers get RLS
in their own Phase 1 module plans. No behavior change in dev/test.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Full-suite verification + PROGRESS + commit

**Why:** Confirm the whole backend is still green (the dbAdmin swaps are no-ops in dev/test, but prove it), run the harness guards, and record the work.

**Files:**
- Modify: `docs/PROGRESS.md` (append)

- [ ] **Step 1: Run the full backend test suite**

Run: `pnpm --filter backend exec vitest run`
Expected: all tests PASS — the 864 from Phase 0 plus the 4 new dbAdmin-routing tests (one assertion each in Tasks 1-4, plus the multi-assertion order test) = green. No existing test should change behavior because dbAdmin falls back to the owner URL in dev/test.

- [ ] **Step 2: Typecheck + lint + harness guards**

Run:
```
pnpm --filter backend typecheck
pnpm --filter backend lint
pnpm --filter backend exec tsc --noEmit
```
Then verify no new `console.log` and no new `any` in the touched files:
```
Select-String -Path "apps/backend/src/modules/superAdmin/superAdmin.repo.ts","apps/backend/src/modules/order/order.repo.ts","apps/backend/src/modules/apiKey/apiKey.repo.ts","apps/backend/src/modules/auth/auth.repo.ts" -Pattern "console\.log"
```
Expected: typecheck 0 errors, lint clean, no `console.log` matches. (The pre-existing `/* eslint-disable @typescript-eslint/no-explicit-any */` + `as any` in `order.repo.ts` are unchanged — do not add new ones; the swap only changes `db.` → `dbAdmin.` and `tx ?? db` → `tx ?? dbAdmin`, which introduces no `any`.)

- [ ] **Step 3: Append PROGRESS.md**

Append a new section to `docs/PROGRESS.md`:

```markdown
## 2026-06-27 — RLS Phase 2a: dbAdmin wiring

Routed all cross-tenant / pre-tenant DB reads to `dbAdmin` (BYPASSRLS) so
the next plan (RLS on the `orders` hub) won't zero out super-admin views,
API-key auth, or signup/verify/MFA flows.

- superAdmin.repo → dbAdmin wholesale (every method; no service passes a tx).
  Also satisfies spec §4.3: platformSettings/adminNotifications get no grant
  to app_tenant, so they MUST be read via dbAdmin.
- order.repo admin reads (findAll, findByIdAdmin, findOrderItems) → dbAdmin.
  findCouponById left on db (unused, tx-compatible for checkout).
- apiKey.repo findByKeyHash + touchLastUsed → dbAdmin (pre-tenant key lookup).
- auth.repo four verification_tokens methods → dbAdmin (spec §4.3: no grant
  to app_tenant; RLS-exempt).

All changes are no-ops in dev/test: dbAdmin falls back to the owner URL
(DATABASE_URL_ADMIN unset) = BYPASSRLS = same rows as today. In prod,
dbAdmin = app_admin (BYPASSRLS). Behavioral unit tests per repo assert
dbAdmin routing (mock both db + dbAdmin, assert the method uses dbAdmin
and not db). The end-to-end proof lands in the next plan (orders RLS
negative test: super-admin reads still see all orders with RLS enabled).

Out of scope (handled in their own Phase 1 module plans): pre-tenant auth
lookups (findUserByEmail / findStoreByOwnerEmail / findCustomerByEmailAnd-
StoreId) move to dbAdmin when users/stores/customers get RLS; merchant/customer-
scoped apiKey + auth CRUD moves to withTenant.

Verified: full backend suite green (864 + new dbAdmin-routing tests),
typecheck 0, lint clean, no new console.log/any.
```

- [ ] **Step 4: Commit**

```bash
git add docs/PROGRESS.md
git commit -m "docs(rls): PROGRESS.md Phase 2a dbAdmin wiring record

Co-Authored-By: Claude <noreply@anthropic.com>"
```

- [ ] **Step 5: Report and pause**

Report to the user: Phase 2a complete, N commits on `fix/domain-feature-p0` (not pushed). Next plan is RLS Phase 1 per-module rollout starting with the `orders` hub (now unblocked — its super-admin cross-tenant reads are on dbAdmin). Do not push without an explicit ask.

---

## Self-Review

**1. Spec coverage (vs RLS design §5 Phase 2 + user's chosen scope):**
- ✅ superAdmin.repo → dbAdmin wholesale (spec §5 "superAdmin.repo→dbAdmin").
- ✅ order.repo unscoped reads → dbAdmin: `findAll`, `findByIdAdmin`, `findOrderItems` routed; `findCouponById` deliberately left (unused + tx-compatible) — documented in scope.
- ✅ apiKey.findByKeyHash + touchLastUsed → dbAdmin (spec §5 "apiKey.findByKeyHash+touchLastUsed→dbAdmin").
- ✅ verification_tokens → dbAdmin (spec §5 "verification_tokens→dbAdmin"; §4.3 no grant to app_tenant).
- ✅ Out-of-scope items explicitly listed with the plan that WILL handle them (pre-tenant auth lookups → Phase 1 users/stores/customers plans; merchant apiKey/auth CRUD → withTenant in those module plans). No gap.

**2. Placeholder scan:** No "TBD"/"TODO"/"implement later". Every step has exact code or an exact command. The per-method line lists in Task 1 are exhaustive (cross-checked against the read of the full 540-line file).

**3. Type consistency:**
- `dbAdmin` imported identically in all four repos (`import { db, dbAdmin } from '../../db/index.js'` — `db` dropped in superAdmin.repo since unused after the wholesale swap).
- `DbOrTx` / `DbExecutor` types unchanged; the only signature change is the default executor (`tx ?? db` → `tx ?? dbAdmin`), which preserves the optional `tx?: DbOrTx` param and the public API — callers need no changes. Verified against the caller greps: `apiKey.service.ts:133,140` and `auth.service.ts:315-324` call these methods with no `tx`.
- Test mock shape is consistent: `db` + `dbAdmin` both exported from the mocked `../../db/index.js`, with the specific query chain each method touches.

**4. Behavior change check:** dbAdmin falls back to `env.DATABASE_URL` (owner) when `DATABASE_URL_ADMIN` is unset (Phase 0 db/index.ts, commit 6508489). In dev/test `DATABASE_URL_ADMIN` is intentionally NOT set (test-setup.ts, Phase 0), so dbAdmin === owner === BYPASSRLS → identical rows to the pre-change `db` (which also falls back to owner). Therefore every existing integration test that hits the real DB is behaviorally unchanged. Mock-based service tests are unaffected because they never touch the real repo. The only new tests are the four behavioral dbAdmin-routing tests.

**5. No-new-violations check:** The edits only swap an identifier (`db` → `dbAdmin`) and a default (`tx ?? db` → `tx ?? dbAdmin`). No new `console.log`, no new `any`, no new inline preHandler, no route body changes, no storeId-from-body. The pre-existing `as any` in `order.repo.ts` (lines 126, 177) is untouched.
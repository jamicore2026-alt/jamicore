# RLS Phase 1 — shipping + tax + review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable PostgreSQL RLS on `shipping_zones`, `shipping_rates`, `tax_rates`, `reviews` and thread `withTenant(storeId, fn)` through every application read/write, so the DB enforces tenant isolation independently of the app layer.

**Architecture:** Approach A — service owns the tx. Each service entry is wrapped in `withTenant(storeId, async (tx) => …)`; tx forwarded into every repo call. Repos gain `tx?: DbOrTx` last param + `executor = tx ?? db`. Seed → `dbOwner`. All 4 tables §4.1 direct (own `store_id` notNull), NULLIF-hardened `tenant_iso` policy (USING + WITH CHECK).

**Tech Stack:** Fastify v5, Drizzle ORM, PostgreSQL 17, Vitest, pnpm, TypeScript strict ESM. `DbOrTx` from `apps/backend/src/modules/_shared/db-types.ts`.

## Global Constraints
- pnpm ONLY. Zero TS errors (`pnpm --filter backend typecheck`).
- `storeId` from JWT/request.user/Host header ONLY — never body/query/params.
- `ErrorCodes.*` (no bare strings), no `console.log`, no `any` in source (tests may use `as any` + eslint-disable header), no `require()` (ESM, `.js` extensions).
- Approach A: service owns tx; repos accept `tx?: DbOrTx` LAST.
- NULLIF-hardened `tenant_iso`, both USING + WITH CHECK, on all 4 tables. No GRANT changes.
- Migration `.sql` gitignored → `git add -f`. Hand-written (no meta snapshot), journal idx 31.
- Commit only on user request; per-task commits are part of the approved TDD execution. Never push without explicit request.

## Key file paths
- `apps/backend/src/modules/shipping/shipping.repo.ts` (12 fns, bare `db`)
- `apps/backend/src/modules/shipping/shipping.service.ts` (11 entries, delegates to repo + cache)
- `apps/backend/src/modules/shipping/shipping.service.test.ts` (PRE-EXISTING, exact-arg assertions)
- `apps/backend/src/modules/tax/tax.repo.ts` (6 fns, bare `db`)
- `apps/backend/src/modules/tax/tax.service.ts` (6 entries)
- `apps/backend/src/modules/tax/tax.service.test.ts` (PRE-EXISTING, exact-arg assertions)
- `apps/backend/src/modules/review/review.repo.ts` (`reviewRepo` object, 9 methods, bare `db`)
- `apps/backend/src/modules/review/review.service.ts` (6 entries)
- `apps/backend/src/db/seed.ts:826` (reviews insert on bare `db`)
- `apps/backend/drizzle/0030_shipping_tax_review_rls.sql` (new, gitignored → `git add -f`)
- `apps/backend/drizzle/meta/_journal.json` (append idx 31)
- `apps/backend/src/modules/shipping_tax_review/shipping_tax_review.rls.test.ts` OR colocate as `apps/backend/src/modules/shipping/shipping_tax_review.rls.test.ts` (real-DB RLS test)

## File Structure
- Tasks 1-3 each: rewrite one repo + one service + update/add service tests (sentinel-tx).
- Task 4: 1-line seed edit.
- Task 5: migration + journal + real-DB RLS test (mirrors `taxonomy.rls.test.ts`).

---

### Task 1: shipping module RLS refactor

**Files:**
- Modify: `apps/backend/src/modules/shipping/shipping.repo.ts` (12 fns → tx-threaded)
- Modify: `apps/backend/src/modules/shipping/shipping.service.ts` (11 entries → withTenant)
- Modify: `apps/backend/src/modules/shipping/shipping.service.test.ts` (add withTenant mock + mockTx to assertions)
- Create: `apps/backend/src/modules/shipping/shipping.service.withTenant.test.ts` (sentinel-tx)

**Interfaces:**
- Produces: `shipping.repo` fns each accept `tx?: DbOrTx` as the LAST arg; `shippingService` entries wrap in `withTenant`.

- [ ] **Step 1: Rewrite `shipping.repo.ts`** — add `import type { DbOrTx } from '../_shared/db-types.js';`, replace every `db.` with `executor = tx ?? db`, add `tx?: DbOrTx` as last param to all 12 fns.

```ts
// Shipping repository — DB-only operations, no business logic
import { db } from '../../db/index.js';
import { shippingZones, shippingRates } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

export type ShippingRateSelect = typeof shippingRates.$inferSelect;

// ─── Zone queries ───

export async function insertZone(
  storeId: string,
  data: {
    name: string;
    countries?: string[];
    states?: string[];
    postalCodePatterns?: string[];
    isActive?: boolean;
  },
  tx?: DbOrTx,
): Promise<typeof shippingZones.$inferSelect> {
  const executor = tx ?? db;
  const [zone] = await executor
    .insert(shippingZones)
    .values({
      storeId,
      name: data.name,
      countries: data.countries || [],
      states: data.states || [],
      postalCodePatterns: data.postalCodePatterns || [],
      isActive: data.isActive ?? true,
    })
    .returning();
  return zone;
}

export async function findZonesByStoreId(storeId: string, tx?: DbOrTx) {
  const executor = tx ?? db;
  return executor.query.shippingZones.findMany({
    where: eq(shippingZones.storeId, storeId),
    with: { rates: true },
  });
}

export async function findZoneById(zoneId: string, storeId: string, tx?: DbOrTx) {
  const executor = tx ?? db;
  return executor.query.shippingZones.findFirst({
    where: and(eq(shippingZones.id, zoneId), eq(shippingZones.storeId, storeId)),
    with: { rates: true },
  });
}

export async function updateZone(
  zoneId: string,
  storeId: string,
  data: Partial<{
    name: string;
    countries: string[];
    states: string[];
    postalCodePatterns: string[];
    isActive: boolean;
  }>,
  tx?: DbOrTx,
): Promise<typeof shippingZones.$inferSelect | undefined> {
  const executor = tx ?? db;
  const [updated] = await executor
    .update(shippingZones)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(shippingZones.id, zoneId), eq(shippingZones.storeId, storeId)))
    .returning();
  return updated;
}

export async function deleteZoneById(zoneId: string, storeId: string, tx?: DbOrTx): Promise<typeof shippingZones.$inferSelect[]> {
  const executor = tx ?? db;
  return executor
    .delete(shippingZones)
    .where(and(eq(shippingZones.id, zoneId), eq(shippingZones.storeId, storeId)))
    .returning();
}

// ─── Zone lookup (no relation) ───

export async function findZoneByIdFlat(zoneId: string, storeId: string, tx?: DbOrTx): Promise<typeof shippingZones.$inferSelect | undefined> {
  const executor = tx ?? db;
  return executor.query.shippingZones.findFirst({
    where: and(eq(shippingZones.id, zoneId), eq(shippingZones.storeId, storeId)),
  });
}

// ─── Rate queries ───

export async function insertRate(
  storeId: string,
  data: {
    zoneId: string;
    name: string;
    method: string;
    carrier?: string;
    price: string;
    freeAbove?: string;
    weightBased?: boolean;
    pricePerKg?: string;
    estimatedDays?: number;
    isActive?: boolean;
  },
  tx?: DbOrTx,
): Promise<typeof shippingRates.$inferSelect> {
  const executor = tx ?? db;
  const [rate] = await executor
    .insert(shippingRates)
    .values({
      storeId,
      zoneId: data.zoneId,
      name: data.name,
      method: data.method,
      carrier: data.carrier,
      price: data.price,
      freeAbove: data.freeAbove,
      weightBased: data.weightBased ?? false,
      pricePerKg: data.pricePerKg,
      estimatedDays: data.estimatedDays,
      isActive: data.isActive ?? true,
    })
    .returning();
  return rate;
}

export async function findRatesByZoneId(zoneId: string, storeId: string, tx?: DbOrTx): Promise<ShippingRateSelect[]> {
  const executor = tx ?? db;
  return executor.query.shippingRates.findMany({
    where: and(eq(shippingRates.zoneId, zoneId), eq(shippingRates.storeId, storeId)),
  });
}

export async function findRateById(rateId: string, storeId: string, tx?: DbOrTx): Promise<ShippingRateSelect | undefined> {
  const executor = tx ?? db;
  return executor.query.shippingRates.findFirst({
    where: and(eq(shippingRates.id, rateId), eq(shippingRates.storeId, storeId)),
  });
}

export async function updateRate(
  rateId: string,
  storeId: string,
  data: Partial<{
    name: string;
    method: string;
    carrier: string;
    price: string;
    freeAbove: string;
    weightBased: boolean;
    pricePerKg: string;
    estimatedDays: number;
    isActive: boolean;
  }>,
  tx?: DbOrTx,
): Promise<typeof shippingRates.$inferSelect | undefined> {
  const executor = tx ?? db;
  const [updated] = await executor
    .update(shippingRates)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(shippingRates.id, rateId), eq(shippingRates.storeId, storeId)))
    .returning();
  return updated;
}

export async function deleteRateById(rateId: string, storeId: string, tx?: DbOrTx): Promise<typeof shippingRates.$inferSelect[]> {
  const executor = tx ?? db;
  return executor
    .delete(shippingRates)
    .where(and(eq(shippingRates.id, rateId), eq(shippingRates.storeId, storeId)))
    .returning();
}

// ─── Calculate Shipping queries ───

export async function findActiveZonesWithRates(storeId: string, tx?: DbOrTx) {
  const executor = tx ?? db;
  return executor.query.shippingZones.findMany({
    where: and(eq(shippingZones.storeId, storeId), eq(shippingZones.isActive, true)),
    with: { rates: { where: eq(shippingRates.isActive, true) } },
  });
}
```

- [ ] **Step 2: Rewrite `shipping.service.ts`** — add `import { withTenant } from '../../lib/withTenant.js';`, wrap all 11 entries. Cache wrap stays OUTSIDE; `withTenant` INSIDE the cache loader for `calculateShipping`. Cache `.delete()` calls stay outside withTenant (Redis, not DB).

```ts
// Shipping Service - Zone and rate CRUD, shipping calculation
import { ErrorCodes } from '../../errors/codes.js';
import { toCents, fromCents } from '../../lib/decimal.js';
import { getCacheService } from '../../services/cache.service.js';
import { withTenant } from '../../lib/withTenant.js';
import * as repo from './shipping.repo.js';

export const shippingService = {
  // ─── Zone CRUD ───

  async createZone(
    storeId: string,
    data: {
      name: string;
      countries?: string[];
      states?: string[];
      postalCodePatterns?: string[];
      isActive?: boolean;
    },
  ) {
    const zone = await withTenant(storeId, (tx) => repo.insertZone(storeId, data, tx));
    await getCacheService().delete(`shipping_zones:${storeId}`);
    return zone;
  },

  async listZones(storeId: string) {
    return withTenant(storeId, (tx) => repo.findZonesByStoreId(storeId, tx));
  },

  async getZone(zoneId: string, storeId: string) {
    return withTenant(storeId, (tx) => repo.findZoneById(zoneId, storeId, tx));
  },

  async updateZone(
    zoneId: string,
    storeId: string,
    data: Partial<{
      name: string;
      countries: string[];
      states: string[];
      postalCodePatterns: string[];
      isActive: boolean;
    }>,
  ) {
    const updated = await withTenant(storeId, (tx) => repo.updateZone(zoneId, storeId, data, tx));
    if (!updated)
      throw Object.assign(new Error('Zone not found'), {
        code: ErrorCodes.ZONE_NOT_FOUND,
      });
    await getCacheService().delete(`shipping_zones:${storeId}`);
    return updated;
  },

  async deleteZone(zoneId: string, storeId: string) {
    const result = await withTenant(storeId, (tx) => repo.deleteZoneById(zoneId, storeId, tx));
    if (result.length === 0)
      throw Object.assign(new Error('Zone not found'), {
        code: ErrorCodes.ZONE_NOT_FOUND,
      });
    await getCacheService().delete(`shipping_zones:${storeId}`);
    return { deleted: true };
  },

  // ─── Rate CRUD ───

  async createRate(
    storeId: string,
    data: {
      zoneId: string;
      name: string;
      method: string;
      carrier?: string;
      price: string;
      freeAbove?: string;
      weightBased?: boolean;
      pricePerKg?: string;
      estimatedDays?: number;
      isActive?: boolean;
    },
  ) {
    // Verify zone belongs to store (inside tenant tx)
    const rate = await withTenant(storeId, async (tx) => {
      const zone = await repo.findZoneByIdFlat(data.zoneId, storeId, tx);
      if (!zone)
        throw Object.assign(new Error('Zone not found'), {
          code: ErrorCodes.ZONE_NOT_FOUND,
        });
      return repo.insertRate(storeId, data, tx);
    });
    await getCacheService().delete(`shipping_zones:${storeId}`);
    return rate;
  },

  async listRates(zoneId: string, storeId: string) {
    return withTenant(storeId, async (tx) => {
      const zone = await repo.findZoneByIdFlat(zoneId, storeId, tx);
      if (!zone)
        throw Object.assign(new Error('Zone not found'), {
          code: ErrorCodes.ZONE_NOT_FOUND,
        });
      return repo.findRatesByZoneId(zoneId, storeId, tx);
    });
  },

  async getRate(rateId: string, storeId: string) {
    return withTenant(storeId, (tx) => repo.findRateById(rateId, storeId, tx));
  },

  async updateRate(
    rateId: string,
    storeId: string,
    data: Partial<{
      name: string;
      method: string;
      carrier: string;
      price: string;
      freeAbove: string;
      weightBased: boolean;
      pricePerKg: string;
      estimatedDays: number;
      isActive: boolean;
    }>,
  ) {
    const updated = await withTenant(storeId, (tx) => repo.updateRate(rateId, storeId, data, tx));
    if (!updated)
      throw Object.assign(new Error('Rate not found'), {
        code: ErrorCodes.RATE_NOT_FOUND,
      });
    await getCacheService().delete(`shipping_zones:${storeId}`);
    return updated;
  },

  async deleteRate(rateId: string, storeId: string) {
    const result = await withTenant(storeId, (tx) => repo.deleteRateById(rateId, storeId, tx));
    if (result.length === 0)
      throw Object.assign(new Error('Rate not found'), {
        code: ErrorCodes.RATE_NOT_FOUND,
      });
    await getCacheService().delete(`shipping_zones:${storeId}`);
    return { deleted: true };
  },

  // ─── Calculate Shipping ───

  async calculateShipping(
    storeId: string,
    address: { country: string; state?: string; postalCode?: string },
    subtotal: string,
    weightKg?: number,
  ) {
    // Find matching zones for this address (cached for 5 minutes).
    // withTenant runs INSIDE the cache loader so cache hits skip the DB read
    // and cache key stays storeId-based.
    const cacheKey = `shipping_zones:${storeId}`;
    const zones = await getCacheService().wrap(
      cacheKey,
      () => withTenant(storeId, (tx) => repo.findActiveZonesWithRates(storeId, tx)),
      300,
    );

    const matchingZones = zones.filter((zone) => {
      const countries = zone.countries || [];
      const states = zone.states || [];
      const patterns = zone.postalCodePatterns || [];

      if (countries.length === 0 && states.length === 0 && patterns.length === 0)
        return true;

      if (countries.length > 0 && !countries.includes(address.country)) return false;
      if (states.length > 0 && address.state && !states.includes(address.state))
        return false;
      if (patterns.length > 0 && address.postalCode) {
        const matchesPattern = patterns.some((p) => {
          const regex = new RegExp('^' + p.replace(/\*/g, '.*') + '$');
          return regex.test(address.postalCode!);
        });
        if (!matchesPattern) return false;
      }

      return true;
    });

    if (matchingZones.length === 0) {
      return { options: [], message: 'No shipping available for this address' };
    }

    const options: Array<{
      id: string;
      name: string;
      method: string;
      carrier: string | null;
      price: string;
      estimatedDays: number | null;
      free: boolean;
    }> = [];

    for (const zone of matchingZones) {
      for (const rate of zone.rates) {
        let price = rate.price;
        let isFree = false;

        if (rate.freeAbove && Number(subtotal) >= Number(rate.freeAbove)) {
          price = '0';
          isFree = true;
        }

        if (rate.weightBased && rate.pricePerKg && weightKg && weightKg > 0) {
          const basePriceCents = toCents(rate.price);
          const weightPriceCents = Math.round(toCents(rate.pricePerKg) * weightKg);
          const totalCents = basePriceCents + weightPriceCents;
          price = fromCents(totalCents);
          if (isFree) price = '0';
        }

        options.push({
          id: rate.id,
          name: rate.name,
          method: rate.method,
          carrier: rate.carrier,
          price,
          estimatedDays: rate.estimatedDays,
          free: isFree,
        });
      }
    }

    return { options };
  },
};
```

- [ ] **Step 3: Update `shipping.service.test.ts`** — add the withTenant mock block (after the cache mock) and append `mockTx` to every `toHaveBeenCalledWith` assertion. Add near the top (after the cache mock, before `import * as _shippingRepo`):

```ts
// ─── Mock withTenant (RLS Phase 1) ───
// shippingService now wraps every shipping DB op in withTenant(storeId, fn).
// Mock it to run fn with mockTx so existing repo-call assertions (which expect
// mockTx as the tx arg) keep holding.
const mockTx = { __sentinel: 'tx' } as any;
vi.mock('../../lib/withTenant.js', () => ({
  withTenant: vi.fn((_storeId: string, fn: (tx: unknown) => unknown) => fn(mockTx)) as any,
}));
```

Then update assertions (append `mockTx` as the final arg):
- `mockRepo.insertZone` → `toHaveBeenCalledWith('s1', expect.objectContaining({ name: 'US Zone', countries: ['US'] }), mockTx)`
- `mockRepo.findZonesByStoreId` → `toHaveBeenCalledWith('s1', mockTx)`
- `mockRepo.updateZone` → `toHaveBeenCalledWith('z1', 's1', { name: 'Updated Zone' }, mockTx)`
- `mockRepo.deleteZoneById` → `toHaveBeenCalledWith('z1', 's1', mockTx)`
- `mockRepo.findZoneByIdFlat` → `toHaveBeenCalledWith('z1', 's1', mockTx)`
- `mockRepo.insertRate` → `toHaveBeenCalledWith('s1', rateData, mockTx)`
- `mockRepo.updateRate` → `toHaveBeenCalledWith('r1', 's1', { name: 'Express' }, mockTx)`

- [ ] **Step 4: Create `shipping.service.withTenant.test.ts`** (sentinel-tx, 11 cases):

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
// Verifies shippingService wraps every entry in withTenant(storeId, fn) and
// threads the tx into shippingRepo (RLS Phase 1, Approach A).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn({ __sentinel: 'tx' });
  },
}));

vi.mock('../../services/cache.service.js', () => ({
  getCacheService: () => ({
    wrap: (_key: string, fn: () => unknown) => fn(),
    delete: () => {},
  }),
}));

const shippingRepo = {
  insertZone: vi.fn().mockResolvedValue({ id: 'z1', storeId: 's1' }),
  findZonesByStoreId: vi.fn().mockResolvedValue([]),
  findZoneById: vi.fn().mockResolvedValue(undefined),
  updateZone: vi.fn().mockResolvedValue(undefined),
  deleteZoneById: vi.fn().mockResolvedValue([{ id: 'z1' }]),
  findZoneByIdFlat: vi.fn().mockResolvedValue({ id: 'z1', storeId: 's1' }),
  insertRate: vi.fn().mockResolvedValue({ id: 'r1', storeId: 's1' }),
  findRatesByZoneId: vi.fn().mockResolvedValue([]),
  findRateById: vi.fn().mockResolvedValue(undefined),
  updateRate: vi.fn().mockResolvedValue(undefined),
  deleteRateById: vi.fn().mockResolvedValue([{ id: 'r1' }]),
  findActiveZonesWithRates: vi.fn().mockResolvedValue([]),
};
vi.mock('./shipping.repo.js', () => shippingRepo);

import { shippingService } from './shipping.service.js';

const tx = expect.objectContaining({ __sentinel: 'tx' });

describe('shippingService wraps shipping work in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createZone runs inside withTenant(storeId) and threads tx into insertZone', async () => {
    await shippingService.createZone('s1', { name: 'US', countries: ['US'] });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.insertZone).toHaveBeenCalledWith('s1', expect.objectContaining({ name: 'US' }), tx);
  });

  it('listZones runs inside withTenant(storeId) and threads tx into findZonesByStoreId', async () => {
    await shippingService.listZones('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.findZonesByStoreId).toHaveBeenCalledWith('s1', tx);
  });

  it('getZone runs inside withTenant(storeId) and threads tx into findZoneById', async () => {
    shippingRepo.findZoneById.mockResolvedValueOnce({ id: 'z1', storeId: 's1' });
    await shippingService.getZone('z1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.findZoneById).toHaveBeenCalledWith('z1', 's1', tx);
  });

  it('updateZone runs inside withTenant(storeId) and threads tx into repo.updateZone', async () => {
    shippingRepo.updateZone.mockResolvedValueOnce({ id: 'z1', storeId: 's1' });
    await shippingService.updateZone('z1', 's1', { name: 'X' });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.updateZone).toHaveBeenCalledWith('z1', 's1', { name: 'X' }, tx);
  });

  it('deleteZone runs inside withTenant(storeId) and threads tx into deleteZoneById', async () => {
    await shippingService.deleteZone('z1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.deleteZoneById).toHaveBeenCalledWith('z1', 's1', tx);
  });

  it('createRate runs inside withTenant(storeId) and threads tx into findZoneByIdFlat + insertRate', async () => {
    await shippingService.createRate('s1', { zoneId: 'z1', name: 'Std', method: 'ground', price: '5.00' });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.findZoneByIdFlat).toHaveBeenCalledWith('z1', 's1', tx);
    expect(shippingRepo.insertRate).toHaveBeenCalledWith('s1', expect.objectContaining({ zoneId: 'z1' }), tx);
  });

  it('listRates runs inside withTenant(storeId) and threads tx into findZoneByIdFlat + findRatesByZoneId', async () => {
    await shippingService.listRates('z1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.findRatesByZoneId).toHaveBeenCalledWith('z1', 's1', tx);
  });

  it('getRate runs inside withTenant(storeId) and threads tx into findRateById', async () => {
    shippingRepo.findRateById.mockResolvedValueOnce({ id: 'r1', storeId: 's1' });
    await shippingService.getRate('r1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.findRateById).toHaveBeenCalledWith('r1', 's1', tx);
  });

  it('updateRate runs inside withTenant(storeId) and threads tx into repo.updateRate', async () => {
    shippingRepo.updateRate.mockResolvedValueOnce({ id: 'r1', storeId: 's1' });
    await shippingService.updateRate('r1', 's1', { name: 'Express' });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.updateRate).toHaveBeenCalledWith('r1', 's1', { name: 'Express' }, tx);
  });

  it('deleteRate runs inside withTenant(storeId) and threads tx into deleteRateById', async () => {
    await shippingService.deleteRate('r1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.deleteRateById).toHaveBeenCalledWith('r1', 's1', tx);
  });

  it('calculateShipping runs inside withTenant(storeId) and threads tx into findActiveZonesWithRates', async () => {
    shippingRepo.findActiveZonesWithRates.mockResolvedValueOnce([
      { id: 'z1', countries: [], states: [], postalCodePatterns: [], rates: [] },
    ]);
    await shippingService.calculateShipping('s1', { country: 'US' }, '100.00');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.findActiveZonesWithRates).toHaveBeenCalledWith('s1', tx);
  });
});
```

- [ ] **Step 5: Run tests + typecheck**

Run: `pnpm --filter backend test src/modules/shipping` then `pnpm --filter backend typecheck`
Expected: all shipping tests pass (existing + 11 new sentinel), 0 TS errors.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/shipping/shipping.repo.ts apps/backend/src/modules/shipping/shipping.service.ts apps/backend/src/modules/shipping/shipping.service.test.ts apps/backend/src/modules/shipping/shipping.service.withTenant.test.ts
git commit -m "refactor(rls): thread tx into shipping.repo + wrap shipping.service in withTenant (Phase 1 shipping/tax/review)"
```

---

### Task 2: tax module RLS refactor

**Files:**
- Modify: `apps/backend/src/modules/tax/tax.repo.ts` (6 fns → tx-threaded)
- Modify: `apps/backend/src/modules/tax/tax.service.ts` (6 entries → withTenant)
- Modify: `apps/backend/src/modules/tax/tax.service.test.ts` (add withTenant mock + mockTx to assertions)
- Create: `apps/backend/src/modules/tax/tax.service.withTenant.test.ts` (sentinel-tx, 6 cases)

- [ ] **Step 1: Rewrite `tax.repo.ts`** — add `import type { DbOrTx } from '../_shared/db-types.js';`, `executor = tx ?? db`, `tx?: DbOrTx` last param on all 6 fns.

```ts
// Tax repository — DB-only operations, no business logic
import { db } from '../../db/index.js';
import { taxRates } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

// ─── CRUD queries ───

export async function insertRate(
  storeId: string,
  data: {
    name: string;
    rate: string;
    country?: string;
    state?: string;
    postalCode?: string;
    isCompound?: boolean;
    priority?: number;
    isActive?: boolean;
  },
  tx?: DbOrTx,
): Promise<typeof taxRates.$inferSelect> {
  const executor = tx ?? db;
  const [rate] = await executor
    .insert(taxRates)
    .values({
      storeId,
      name: data.name,
      rate: data.rate,
      country: data.country,
      state: data.state,
      postalCode: data.postalCode,
      isCompound: data.isCompound ?? false,
      priority: data.priority ?? 1,
      isActive: data.isActive ?? true,
    })
    .returning();
  return rate;
}

export async function findRatesByStoreId(storeId: string, tx?: DbOrTx): Promise<typeof taxRates.$inferSelect[]> {
  const executor = tx ?? db;
  return executor.query.taxRates.findMany({
    where: eq(taxRates.storeId, storeId),
    orderBy: (rates, { asc }) => [asc(rates.priority)],
  });
}

export async function findRateById(rateId: string, storeId: string, tx?: DbOrTx): Promise<typeof taxRates.$inferSelect | undefined> {
  const executor = tx ?? db;
  return executor.query.taxRates.findFirst({
    where: and(eq(taxRates.id, rateId), eq(taxRates.storeId, storeId)),
  });
}

export async function updateRate(
  rateId: string,
  storeId: string,
  data: Partial<{
    name: string;
    rate: string;
    country: string;
    state: string;
    postalCode: string;
    isCompound: boolean;
    priority: number;
    isActive: boolean;
  }>,
  tx?: DbOrTx,
): Promise<typeof taxRates.$inferSelect | undefined> {
  const executor = tx ?? db;
  const [updated] = await executor
    .update(taxRates)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(taxRates.id, rateId), eq(taxRates.storeId, storeId)))
    .returning();
  return updated;
}

export async function deleteRateById(rateId: string, storeId: string, tx?: DbOrTx): Promise<typeof taxRates.$inferSelect[]> {
  const executor = tx ?? db;
  return executor
    .delete(taxRates)
    .where(and(eq(taxRates.id, rateId), eq(taxRates.storeId, storeId)))
    .returning();
}

// ─── Calculate Tax queries ───

export async function findActiveRatesByStoreId(storeId: string, tx?: DbOrTx): Promise<typeof taxRates.$inferSelect[]> {
  const executor = tx ?? db;
  return executor.query.taxRates.findMany({
    where: and(eq(taxRates.storeId, storeId), eq(taxRates.isActive, true)),
    orderBy: (rates, { asc }) => [asc(rates.priority)],
  });
}
```

- [ ] **Step 2: Rewrite `tax.service.ts`** — add `import { withTenant } from '../../lib/withTenant.js';`, wrap all 6 entries. `calculateTax` cache wrap outside, withTenant inside loader.

```ts
// Tax Service - Tax rate CRUD and calculation
import { ErrorCodes } from '../../errors/codes.js';
import { toCents, fromCents } from '../../lib/decimal.js';
import { getCacheService } from '../../services/cache.service.js';
import { withTenant } from '../../lib/withTenant.js';
import * as repo from './tax.repo.js';

export const taxService = {
  // ─── CRUD ───

  async createRate(
    storeId: string,
    data: {
      name: string;
      rate: string;
      country?: string;
      state?: string;
      postalCode?: string;
      isCompound?: boolean;
      priority?: number;
      isActive?: boolean;
    },
  ) {
    const rate = await withTenant(storeId, (tx) => repo.insertRate(storeId, data, tx));
    await getCacheService().delete(`tax_rates:${storeId}`);
    return rate;
  },

  async listRates(storeId: string) {
    return withTenant(storeId, (tx) => repo.findRatesByStoreId(storeId, tx));
  },

  async getRate(rateId: string, storeId: string) {
    return withTenant(storeId, (tx) => repo.findRateById(rateId, storeId, tx));
  },

  async updateRate(
    rateId: string,
    storeId: string,
    data: Partial<{
      name: string;
      rate: string;
      country: string;
      state: string;
      postalCode: string;
      isCompound: boolean;
      priority: number;
      isActive: boolean;
    }>,
  ) {
    const updated = await withTenant(storeId, (tx) => repo.updateRate(rateId, storeId, data, tx));
    if (!updated)
      throw Object.assign(new Error('Tax rate not found'), {
        code: ErrorCodes.TAX_RATE_NOT_FOUND,
      });
    await getCacheService().delete(`tax_rates:${storeId}`);
    return updated;
  },

  async deleteRate(rateId: string, storeId: string) {
    const result = await withTenant(storeId, (tx) => repo.deleteRateById(rateId, storeId, tx));
    if (result.length === 0)
      throw Object.assign(new Error('Tax rate not found'), {
        code: ErrorCodes.TAX_RATE_NOT_FOUND,
      });
    await getCacheService().delete(`tax_rates:${storeId}`);
    return { deleted: true };
  },

  // ─── Calculate Tax ───

  async calculateTax(
    storeId: string,
    address: { country: string; state?: string; postalCode?: string },
    subtotal: string,
    shipping: string,
  ) {
    const cacheKey = `tax_rates:${storeId}`;
    const allRates = await getCacheService().wrap(
      cacheKey,
      () => withTenant(storeId, (tx) => repo.findActiveRatesByStoreId(storeId, tx)),
      300,
    );

    const matchingRates = allRates.filter((rate) => {
      if (!rate.country) return true;
      if (rate.country !== address.country) return false;
      if (rate.state && rate.state !== address.state) return false;
      if (rate.postalCode && rate.postalCode !== address.postalCode) return false;
      return true;
    });

    let taxableAmountCents = toCents(subtotal) + toCents(shipping);
    let totalTaxCents = 0;
    const breakdown: Array<{ name: string; rate: string; amount: string }> = [];
    let lastPriority = 0;

    for (const rate of matchingRates) {
      if (rate.isCompound && rate.priority !== lastPriority) {
        taxableAmountCents += totalTaxCents;
        lastPriority = rate.priority ?? 1;
      } else if (!rate.isCompound) {
        lastPriority = rate.priority ?? 1;
      }

      const rateValue = Math.round(parseFloat(rate.rate) * 10000);
      const taxAmountCents = Math.round((taxableAmountCents * rateValue) / 10000);
      totalTaxCents += taxAmountCents;
      breakdown.push({
        name: rate.name,
        rate: rate.rate,
        amount: fromCents(taxAmountCents),
      });
    }

    return {
      totalTax: fromCents(totalTaxCents),
      breakdown,
    };
  },
};
```

- [ ] **Step 3: Update `tax.service.test.ts`** — add the withTenant mock block (after cache mock, before `import * as _taxRepo`):

```ts
// ─── Mock withTenant (RLS Phase 1) ───
const mockTx = { __sentinel: 'tx' } as any;
vi.mock('../../lib/withTenant.js', () => ({
  withTenant: vi.fn((_storeId: string, fn: (tx: unknown) => unknown) => fn(mockTx)) as any,
}));
```

Update assertions (append `mockTx`):
- `mockRepo.insertRate` → `toHaveBeenCalledWith('s1', expect.objectContaining({ name: 'CA Sales Tax', rate: '0.0825', country: 'US', state: 'CA' }), mockTx)`
- `mockRepo.findRatesByStoreId` → `toHaveBeenCalledWith('s1', mockTx)`
- `mockRepo.findRateById` → `toHaveBeenCalledWith('t1', 's1', mockTx)`
- `mockRepo.updateRate` → `toHaveBeenCalledWith('t1', 's1', { name: 'Updated Tax', rate: '0.10' }, mockTx)`
- `mockRepo.deleteRateById` → `toHaveBeenCalledWith('t1', 's1', mockTx)`

- [ ] **Step 4: Create `tax.service.withTenant.test.ts`** (sentinel-tx, 6 cases):

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
// Verifies taxService wraps every entry in withTenant(storeId, fn) and
// threads the tx into taxRepo (RLS Phase 1, Approach A).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn({ __sentinel: 'tx' });
  },
}));

vi.mock('../../services/cache.service.js', () => ({
  getCacheService: () => ({
    wrap: (_key: string, fn: () => unknown) => fn(),
    delete: () => {},
  }),
}));

const taxRepo = {
  insertRate: vi.fn().mockResolvedValue({ id: 't1', storeId: 's1' }),
  findRatesByStoreId: vi.fn().mockResolvedValue([]),
  findRateById: vi.fn().mockResolvedValue(undefined),
  updateRate: vi.fn().mockResolvedValue(undefined),
  deleteRateById: vi.fn().mockResolvedValue([{ id: 't1' }]),
  findActiveRatesByStoreId: vi.fn().mockResolvedValue([]),
};
vi.mock('./tax.repo.js', () => taxRepo);

import { taxService } from './tax.service.js';

const tx = expect.objectContaining({ __sentinel: 'tx' });

describe('taxService wraps tax work in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createRate runs inside withTenant(storeId) and threads tx into insertRate', async () => {
    await taxService.createRate('s1', { name: 'VAT', rate: '0.20' });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(taxRepo.insertRate).toHaveBeenCalledWith('s1', expect.objectContaining({ name: 'VAT', rate: '0.20' }), tx);
  });

  it('listRates runs inside withTenant(storeId) and threads tx into findRatesByStoreId', async () => {
    await taxService.listRates('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(taxRepo.findRatesByStoreId).toHaveBeenCalledWith('s1', tx);
  });

  it('getRate runs inside withTenant(storeId) and threads tx into findRateById', async () => {
    taxRepo.findRateById.mockResolvedValueOnce({ id: 't1', storeId: 's1' });
    await taxService.getRate('t1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(taxRepo.findRateById).toHaveBeenCalledWith('t1', 's1', tx);
  });

  it('updateRate runs inside withTenant(storeId) and threads tx into repo.updateRate', async () => {
    taxRepo.updateRate.mockResolvedValueOnce({ id: 't1', storeId: 's1' });
    await taxService.updateRate('t1', 's1', { name: 'X' });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(taxRepo.updateRate).toHaveBeenCalledWith('t1', 's1', { name: 'X' }, tx);
  });

  it('deleteRate runs inside withTenant(storeId) and threads tx into deleteRateById', async () => {
    await taxService.deleteRate('t1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(taxRepo.deleteRateById).toHaveBeenCalledWith('t1', 's1', tx);
  });

  it('calculateTax runs inside withTenant(storeId) and threads tx into findActiveRatesByStoreId', async () => {
    taxRepo.findActiveRatesByStoreId.mockResolvedValueOnce([
      { name: 'G', rate: '0.05', country: null, state: null, postalCode: null, isCompound: false, priority: 1 },
    ]);
    await taxService.calculateTax('s1', { country: 'US' }, '100.00', '0.00');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(taxRepo.findActiveRatesByStoreId).toHaveBeenCalledWith('s1', tx);
  });
});
```

- [ ] **Step 5: Run tests + typecheck**

Run: `pnpm --filter backend test src/modules/tax` then `pnpm --filter backend typecheck`
Expected: all tax tests pass (existing + 6 new sentinel), 0 TS errors.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/tax/tax.repo.ts apps/backend/src/modules/tax/tax.service.ts apps/backend/src/modules/tax/tax.service.test.ts apps/backend/src/modules/tax/tax.service.withTenant.test.ts
git commit -m "refactor(rls): thread tx into tax.repo + wrap tax.service in withTenant (Phase 1 shipping/tax/review)"
```

---

### Task 3: review module RLS refactor

**Files:**
- Modify: `apps/backend/src/modules/review/review.repo.ts` (`reviewRepo` object, 9 methods → tx-threaded)
- Modify: `apps/backend/src/modules/review/review.service.ts` (6 entries → withTenant)
- Create: `apps/backend/src/modules/review/review.service.withTenant.test.ts` (sentinel-tx, 6 cases; no pre-existing test to update)

- [ ] **Step 1: Rewrite `review.repo.ts`** — add `import type { DbOrTx } from '../_shared/db-types.js';`, `executor = tx ?? db`, `tx?: DbOrTx` last param on all 9 methods. Note `findManyByProductId(productId, storeId, options?, tx?)` — tx AFTER the optional `options`.

```ts
// Review repository — Drizzle queries only, no business logic
import { db } from '../../db/index.js';
import { reviews } from '../../db/schema.js';
import { eq, and, desc, count } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

export type ReviewSelect = typeof reviews.$inferSelect;
export type ReviewInsert = typeof reviews.$inferInsert;

// Safe customer columns — excludes password and reset tokens
const safeCustomerColumns = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  storeId: true,
} as const;

export const reviewRepo = {
  findManyByProductId(productId: string, storeId: string, options?: { limit?: number; offset?: number }, tx?: DbOrTx) {
    const executor = tx ?? db;
    const where = and(
      eq(reviews.productId, productId),
      eq(reviews.storeId, storeId),
    );

    return executor.query.reviews.findMany({
      where,
      orderBy: desc(reviews.createdAt),
      limit: options?.limit ?? 50,
      offset: options?.offset,
      with: {
        customer: {
          columns: safeCustomerColumns,
        },
      },
    });
  },

  countByProductId(productId: string, storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    const where = and(
      eq(reviews.productId, productId),
      eq(reviews.storeId, storeId),
    );

    return executor
      .select({ count: count() })
      .from(reviews)
      .where(where);
  },

  findManyByStoreId(storeId: string, options?: { limit?: number; offset?: number }, tx?: DbOrTx) {
    const executor = tx ?? db;
    const where = eq(reviews.storeId, storeId);

    return executor.query.reviews.findMany({
      where,
      orderBy: desc(reviews.createdAt),
      limit: options?.limit ?? 50,
      offset: options?.offset,
      with: {
        customer: {
          columns: safeCustomerColumns,
        },
        product: true,
      },
    });
  },

  countByStoreId(storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    const where = eq(reviews.storeId, storeId);

    return executor
      .select({ count: count() })
      .from(reviews)
      .where(where);
  },

  findById(reviewId: string, storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor.query.reviews.findFirst({
      where: and(eq(reviews.id, reviewId), eq(reviews.storeId, storeId)),
      with: {
        customer: {
          columns: safeCustomerColumns,
        },
        product: true,
      },
    });
  },

  async findByIdBasic(reviewId: string, storeId: string, tx?: DbOrTx): Promise<ReviewSelect | undefined> {
    const executor = tx ?? db;
    return executor.query.reviews.findFirst({
      where: and(eq(reviews.id, reviewId), eq(reviews.storeId, storeId)),
    });
  },

  create(data: ReviewInsert, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor.insert(reviews).values(data).returning();
  },

  update(reviewId: string, storeId: string, data: Partial<ReviewInsert>, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor
      .update(reviews)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(reviews.id, reviewId), eq(reviews.storeId, storeId)))
      .returning();
  },

  deleteById(reviewId: string, storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor
      .delete(reviews)
      .where(and(eq(reviews.id, reviewId), eq(reviews.storeId, storeId)));
  },
};
```

- [ ] **Step 2: Rewrite `review.service.ts`** — add `import { withTenant } from '../../lib/withTenant.js';`, wrap all 6 entries. `findByProductId`/`findByStoreId` use Promise.all inside one withTenant. `update`/`delete` do findByIdBasic + write inside one withTenant. `create` uses `data.storeId`.

```ts
// Review service — business logic, calls repo, throws domain errors
import { reviewRepo } from './review.repo.js';
import { ErrorCodes } from '../../errors/codes.js';
import { withTenant } from '../../lib/withTenant.js';

export const reviewService = {
  async findByProductId(productId: string, storeId: string, opts?: { page?: number; limit?: number }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const offset = (page - 1) * limit;

    const [rows, totalResult] = await withTenant(storeId, (tx) =>
      Promise.all([
        reviewRepo.findManyByProductId(productId, storeId, { limit, offset }, tx),
        reviewRepo.countByProductId(productId, storeId, tx),
      ]),
    );

    const total = totalResult[0]?.count ?? 0;

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findByStoreId(storeId: string, opts?: { page?: number; limit?: number }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const offset = (page - 1) * limit;

    const [rows, totalResult] = await withTenant(storeId, (tx) =>
      Promise.all([
        reviewRepo.findManyByStoreId(storeId, { limit, offset }, tx),
        reviewRepo.countByStoreId(storeId, tx),
      ]),
    );

    const total = totalResult[0]?.count ?? 0;

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(reviewId: string, storeId: string) {
    const review = await withTenant(storeId, (tx) => reviewRepo.findById(reviewId, storeId, tx));

    if (!review) {
      throw Object.assign(new Error('Review not found'), {
        code: ErrorCodes.REVIEW_NOT_FOUND,
      });
    }

    return review;
  },

  async create(data: {
    storeId: string;
    productId: string;
    customerId?: string;
    orderId?: string;
    rating: number;
    title?: string;
    content: string;
    images?: string[];
    isVerified?: boolean;
  }) {
    const [review] = await withTenant(data.storeId, (tx) =>
      reviewRepo.create(
        {
          storeId: data.storeId,
          productId: data.productId,
          customerId: data.customerId,
          orderId: data.orderId,
          rating: data.rating,
          title: data.title,
          content: data.content,
          images: data.images,
          isVerified: data.isVerified ?? false,
        },
        tx,
      ),
    );

    return review;
  },

  async update(reviewId: string, storeId: string, data: Partial<{
    rating: number;
    title: string;
    content: string;
    images: string[];
    isApproved: boolean;
    response: string;
  }>) {
    return withTenant(storeId, async (tx) => {
      const review = await reviewRepo.findByIdBasic(reviewId, storeId, tx);

      if (!review) {
        throw Object.assign(new Error('Review not found'), {
          code: ErrorCodes.REVIEW_NOT_FOUND,
        });
      }

      const updateData: Partial<Parameters<typeof reviewRepo.update>[2]> = {
        ...data,
      };

      if (data.response) {
        updateData.respondedAt = new Date();
      }

      const [updated] = await reviewRepo.update(reviewId, storeId, updateData, tx);

      return updated;
    });
  },

  async delete(reviewId: string, storeId: string) {
    return withTenant(storeId, async (tx) => {
      const review = await reviewRepo.findByIdBasic(reviewId, storeId, tx);

      if (!review) {
        throw Object.assign(new Error('Review not found'), {
          code: ErrorCodes.REVIEW_NOT_FOUND,
        });
      }

      await reviewRepo.deleteById(reviewId, storeId, tx);

      return { id: reviewId, deleted: true };
    });
  },
};
```

- [ ] **Step 3: Create `review.service.withTenant.test.ts`** (sentinel-tx, 6 cases):

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
// Verifies reviewService wraps every entry in withTenant(storeId, fn) and
// threads the tx into reviewRepo (RLS Phase 1, Approach A).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn({ __sentinel: 'tx' });
  },
}));

const reviewRepo = {
  findManyByProductId: vi.fn().mockResolvedValue([]),
  countByProductId: vi.fn().mockResolvedValue([{ count: 0 }]),
  findManyByStoreId: vi.fn().mockResolvedValue([]),
  countByStoreId: vi.fn().mockResolvedValue([{ count: 0 }]),
  findById: vi.fn().mockResolvedValue(undefined),
  findByIdBasic: vi.fn().mockResolvedValue(undefined),
  create: vi.fn().mockResolvedValue([{ id: 'r1', storeId: 's1' }]),
  update: vi.fn().mockResolvedValue([{ id: 'r1', storeId: 's1' }]),
  deleteById: vi.fn().mockResolvedValue(undefined),
};
vi.mock('./review.repo.js', () => ({ reviewRepo }));

import { reviewService } from './review.service.js';

const tx = expect.objectContaining({ __sentinel: 'tx' });

describe('reviewService wraps review work in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findByProductId runs inside withTenant(storeId) and threads tx into both repo reads', async () => {
    await reviewService.findByProductId('p1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(reviewRepo.findManyByProductId).toHaveBeenCalledWith('p1', 's1', { limit: 20, offset: 0 }, tx);
    expect(reviewRepo.countByProductId).toHaveBeenCalledWith('p1', 's1', tx);
  });

  it('findByStoreId runs inside withTenant(storeId) and threads tx into both repo reads', async () => {
    await reviewService.findByStoreId('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(reviewRepo.findManyByStoreId).toHaveBeenCalledWith('s1', { limit: 20, offset: 0 }, tx);
    expect(reviewRepo.countByStoreId).toHaveBeenCalledWith('s1', tx);
  });

  it('findById runs inside withTenant(storeId) and threads tx', async () => {
    reviewRepo.findById.mockResolvedValueOnce({ id: 'r1', storeId: 's1', customerId: 'c1' });
    await reviewService.findById('r1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(reviewRepo.findById).toHaveBeenCalledWith('r1', 's1', tx);
  });

  it('create runs inside withTenant(data.storeId) and threads tx into repo.create', async () => {
    await reviewService.create({ storeId: 's1', productId: 'p1', rating: 5, content: 'good' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(reviewRepo.create).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1', productId: 'p1' }), tx);
  });

  it('update runs inside withTenant(storeId) and threads tx into findByIdBasic + update', async () => {
    reviewRepo.findByIdBasic.mockResolvedValueOnce({ id: 'r1', storeId: 's1' });
    await reviewService.update('r1', 's1', { content: 'x' });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(reviewRepo.findByIdBasic).toHaveBeenCalledWith('r1', 's1', tx);
    expect(reviewRepo.update).toHaveBeenCalledWith('r1', 's1', expect.objectContaining({ content: 'x' }), tx);
  });

  it('delete runs inside withTenant(storeId) and threads tx into findByIdBasic + deleteById', async () => {
    reviewRepo.findByIdBasic.mockResolvedValueOnce({ id: 'r1', storeId: 's1' });
    await reviewService.delete('r1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(reviewRepo.findByIdBasic).toHaveBeenCalledWith('r1', 's1', tx);
    expect(reviewRepo.deleteById).toHaveBeenCalledWith('r1', 's1', tx);
  });
});
```

- [ ] **Step 4: Run tests + typecheck**

Run: `pnpm --filter backend test src/modules/review` then `pnpm --filter backend typecheck`
Expected: all review tests pass (6 new sentinel), 0 TS errors.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/review/review.repo.ts apps/backend/src/modules/review/review.service.ts apps/backend/src/modules/review/review.service.withTenant.test.ts
git commit -m "refactor(rls): thread tx into review.repo + wrap review.service in withTenant (Phase 1 shipping/tax/review)"
```

---

### Task 4: seed reviews via dbOwner

**Files:**
- Modify: `apps/backend/src/db/seed.ts:826` — `db.insert(schema.reviews)` → `dbOwner.insert(schema.reviews)`

- [ ] **Step 1: Edit `seed.ts:826`** — change `await db.insert(schema.reviews).values([` to `await dbOwner.insert(schema.reviews).values([`. `dbOwner` is already imported at the top of seed.ts (used by prior phases for catalog/customers/orders/coupons seeding). Verify with: `grep -n "dbOwner" apps/backend/src/db/seed.ts | head -1` shows the import. Verify no remaining bare-`db` reviews refs: `grep -nE "db\.(insert|query|select|update|delete).*review" apps/backend/src/db/seed.ts` should return nothing.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter backend typecheck`
Expected: 0 errors (seed is not test-exercised, but must compile).

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/db/seed.ts
git commit -m "refactor(rls): seed reviews via dbOwner (Phase 1 shipping/tax/review prep)"
```

---

### Task 5: migration 0030 + real-DB RLS test

**Files:**
- Create: `apps/backend/drizzle/0030_shipping_tax_review_rls.sql` (gitignored → `git add -f`)
- Modify: `apps/backend/drizzle/meta/_journal.json` (append idx 31)
- Create: `apps/backend/src/modules/shipping/shipping_tax_review.rls.test.ts` (real-DB RLS test, mirrors `taxonomy.rls.test.ts`)

- [ ] **Step 1: Write `0030_shipping_tax_review_rls.sql`**

```sql
-- 0030_shipping_tax_review_rls.sql
-- RLS Phase 1 (shipping/tax/review): enable + force row-level security on the
-- 4 store-config/rating tables with a NULLIF-hardened §4.1 direct tenant_iso
-- policy (both USING + WITH CHECK). An unset/NULL app.tenant_id yields zero
-- rows instead of ''::uuid throwing — fail-closed for code paths that forget
-- withTenant. No GRANT changes: rls-roles.ts grants DML on ALL tables in public
-- generically.

-- shipping_zones
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zones FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON shipping_zones;
CREATE POLICY tenant_iso ON shipping_zones
  FOR ALL
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- shipping_rates
ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_rates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON shipping_rates;
CREATE POLICY tenant_iso ON shipping_rates
  FOR ALL
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- tax_rates
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON tax_rates;
CREATE POLICY tenant_iso ON tax_rates
  FOR ALL
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_iso ON reviews;
CREATE POLICY tenant_iso ON reviews
  FOR ALL
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```

- [ ] **Step 2: Append journal idx 31** to `apps/backend/drizzle/meta/_journal.json` after the idx 30 entry:

```json
    {
      "idx": 31,
      "version": "7",
      "when": 1780843600000,
      "tag": "0030_shipping_tax_review_rls",
      "breakpoints": true
    }
```
(Increment the idx 30 `when` 1780843500000 by 100000.)

- [ ] **Step 3: Apply migration**

Run: `pnpm --filter backend db:migrate`
Expected: succeeds (NOTICEs are `DROP POLICY IF EXISTS` skipping — policies don't pre-exist).

- [ ] **Step 4: Write `shipping_tax_review.rls.test.ts`** — real-DB, mirrors `taxonomy.rls.test.ts`. Seeds 2 stores, 1 zone+rate per store (store A), 1 tax rate per store (A), 1 product + 1 customer (A, needed for review FKs), 1 review (A). 6 cases × 4 tables. FK-respecting self-cleaning pre-pass + afterAll via `dbOwner`. Domains `rls-str-a.test`/`rls-str-b.test`.

```ts
// apps/backend/src/modules/shipping/shipping_tax_review.rls.test.ts
// Real-DB RLS negative test for shipping_zones, shipping_rates, tax_rates,
// reviews (RLS Phase 1). Connects as app_tenant (RLS-enforced) via a dedicated
// (max: 1) connection so session-level set_config is safe. Proves the DB
// enforces isolation independently of the app layer (the withTenant refactor in
// Tasks 1-3 sets app.tenant_id; this test verifies RLS actually uses it).
// Mirrors taxonomy.rls.test.ts.
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
let zoneAId: string;
let rateAId: string;
let taxAId: string;
let productAId: string;
let customerAId: string;
let reviewAId: string;

const DOMAIN_A = 'rls-str-a.test';
const DOMAIN_B = 'rls-str-b.test';

beforeAll(async () => {
  // ─── Self-cleaning pre-pass (FK-respecting) for re-runnability ───
  for (const domain of [DOMAIN_A, DOMAIN_B]) {
    const stores = await dbOwner
      .select({ id: schema.stores.id })
      .from(schema.stores)
      .where(eq(schema.stores.domain, domain));
    for (const s of stores) {
      await dbOwner.delete(schema.reviews).where(eq(schema.reviews.storeId, s.id));
      await dbOwner.delete(schema.shippingRates).where(eq(schema.shippingRates.storeId, s.id));
      await dbOwner.delete(schema.shippingZones).where(eq(schema.shippingZones.storeId, s.id));
      await dbOwner.delete(schema.taxRates).where(eq(schema.taxRates.storeId, s.id));
      await dbOwner.delete(schema.customers).where(eq(schema.customers.storeId, s.id));
      await dbOwner.delete(schema.products).where(eq(schema.products.storeId, s.id));
    }
    await dbOwner.delete(schema.stores).where(eq(schema.stores.domain, domain));
  }

  // ─── Seed as the OWNER (bypasses RLS) ───
  const [storeA] = await dbOwner.insert(schema.stores).values({
    name: 'rls-str-A', domain: DOMAIN_A, ownerEmail: 'a@rls-str-a.test',
    storeType: 'food', currency: 'USD', language: 'en',
  }).returning();
  const [storeB] = await dbOwner.insert(schema.stores).values({
    name: 'rls-str-B', domain: DOMAIN_B, ownerEmail: 'b@rls-str-b.test',
    storeType: 'food', currency: 'USD', language: 'en',
  }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;

  // A product is needed for reviews (productId). products already has RLS;
  // seeded via dbOwner here (test fixture, not app layer). Required notNull:
  // storeId, categoryId, titleEn, salePrice. categoryId is nullable per schema.
  const [prodA] = await dbOwner.insert(schema.products).values({
    storeId: storeAId, titleEn: 'STR Product A', salePrice: '10.00',
  }).returning();
  productAId = prodA.id;

  // A customer is needed for reviews (customerId). customers already has RLS.
  const [custA] = await dbOwner.insert(schema.customers).values({
    storeId: storeAId, email: 'cust-a@rls-str-a.test', password: 'x', firstName: 'A', lastName: 'A',
  }).returning();
  customerAId = custA.id;

  // shipping_zones: required notNull storeId, name (isActive defaults true).
  const [zoneA] = await dbOwner.insert(schema.shippingZones).values({
    storeId: storeAId, name: 'Zone A',
  }).returning();
  zoneAId = zoneA.id;

  // shipping_rates: required notNull storeId, zoneId, name, method, price.
  const [rateA] = await dbOwner.insert(schema.shippingRates).values({
    storeId: storeAId, zoneId: zoneAId, name: 'Rate A', method: 'ground', price: '5.00',
  }).returning();
  rateAId = rateA.id;

  // tax_rates: required notNull storeId, name, rate.
  const [taxA] = await dbOwner.insert(schema.taxRates).values({
    storeId: storeAId, name: 'Tax A', rate: '0.10',
  }).returning();
  taxAId = taxA.id;

  // reviews: required notNull storeId, productId, rating, content (customerId nullable).
  const [reviewA] = await dbOwner.insert(schema.reviews).values({
    storeId: storeAId, productId: productAId, customerId: customerAId,
    rating: 5, content: 'great',
  }).returning();
  reviewAId = reviewA.id;
});

afterAll(async () => {
  await dbOwner.delete(schema.reviews).where(eq(schema.reviews.id, reviewAId));
  await dbOwner.delete(schema.taxRates).where(eq(schema.taxRates.id, taxAId));
  await dbOwner.delete(schema.shippingRates).where(eq(schema.shippingRates.id, rateAId));
  await dbOwner.delete(schema.shippingZones).where(eq(schema.shippingZones.id, zoneAId));
  await dbOwner.delete(schema.customers).where(eq(schema.customers.id, customerAId));
  await dbOwner.delete(schema.products).where(eq(schema.products.id, productAId));
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

describe('shipping/tax/review RLS (app_tenant role)', () => {
  it('returns zero rows when no tenant context is set (fail-closed)', async () => {
    await setTenant(null);
    expect((await tenantDb.query.shippingZones.findMany()).length).toBe(0);
    expect((await tenantDb.query.shippingRates.findMany()).length).toBe(0);
    expect((await tenantDb.query.taxRates.findMany()).length).toBe(0);
    expect((await tenantDb.query.reviews.findMany()).length).toBe(0);
  });

  it('shows only store A rows when app.tenant_id = storeA (single-tenant)', async () => {
    await setTenant(storeAId);
    const zones = await tenantDb.query.shippingZones.findMany();
    expect(zones.length).toBe(1);
    expect(zones[0].id).toBe(zoneAId);
    const rates = await tenantDb.query.shippingRates.findMany();
    expect(rates.length).toBe(1);
    expect(rates[0].id).toBe(rateAId);
    const taxes = await tenantDb.query.taxRates.findMany();
    expect(taxes.length).toBe(1);
    expect(taxes[0].id).toBe(taxAId);
    const reviews = await tenantDb.query.reviews.findMany();
    expect(reviews.length).toBe(1);
    expect(reviews[0].id).toBe(reviewAId);
  });

  it('does NOT show store B rows when app.tenant_id = storeA (cross-tenant isolation)', async () => {
    await setTenant(storeAId);
    const zones = await tenantDb.query.shippingZones.findMany();
    expect(zones.every((r) => r.storeId === storeAId)).toBe(true);
    const rates = await tenantDb.query.shippingRates.findMany();
    expect(rates.every((r) => r.storeId === storeAId)).toBe(true);
    const taxes = await tenantDb.query.taxRates.findMany();
    expect(taxes.every((r) => r.storeId === storeAId)).toBe(true);
    const reviews = await tenantDb.query.reviews.findMany();
    expect(reviews.every((r) => r.storeId === storeAId)).toBe(true);
  });

  it('shows store B rows when app.tenant_id = storeB', async () => {
    await setTenant(storeBId);
    const zones = await tenantDb.query.shippingZones.findMany();
    expect(zones.length).toBe(0); // store B has no zones seeded
    const taxes = await tenantDb.query.taxRates.findMany();
    expect(taxes.length).toBe(0);
  });

  it('rejects inserts whose storeId does not match app.tenant_id (WITH CHECK reject)', async () => {
    await setTenant(storeAId);
    await expect(
      tenantDb.insert(schema.shippingZones).values({ storeId: storeBId, name: 'Reject' }),
    ).rejects.toThrow();
    await expect(
      tenantDb.insert(schema.shippingRates).values({ storeId: storeBId, zoneId: zoneAId, name: 'Reject', method: 'ground', price: '1.00' }),
    ).rejects.toThrow();
    await expect(
      tenantDb.insert(schema.taxRates).values({ storeId: storeBId, name: 'Reject', rate: '0.01' }),
    ).rejects.toThrow();
    await expect(
      tenantDb.insert(schema.reviews).values({ storeId: storeBId, productId: productAId, rating: 1, content: 'reject' }),
    ).rejects.toThrow();
  });

  it('accepts inserts whose storeId matches app.tenant_id (WITH CHECK accept)', async () => {
    await setTenant(storeAId);
    const [zone] = await tenantDb.insert(schema.shippingZones).values({ storeId: storeAId, name: 'OK Zone' }).returning();
    expect(zone.storeId).toBe(storeAId);
    const [rate] = await tenantDb.insert(schema.shippingRates).values({ storeId: storeAId, zoneId: zone.id, name: 'OK Rate', method: 'ground', price: '2.00' }).returning();
    expect(rate.storeId).toBe(storeAId);
    const [tax] = await tenantDb.insert(schema.taxRates).values({ storeId: storeAId, name: 'OK Tax', rate: '0.05' }).returning();
    expect(tax.storeId).toBe(storeAId);
    const [review] = await tenantDb.insert(schema.reviews).values({ storeId: storeAId, productId: productAId, rating: 4, content: 'ok' }).returning();
    expect(review.storeId).toBe(storeAId);

    // cleanup (as the tenant — allowed since storeId matches)
    await tenantDb.delete(schema.reviews).where(eq(schema.reviews.id, review.id));
    await tenantDb.delete(schema.taxRates).where(eq(schema.taxRates.id, tax.id));
    await tenantDb.delete(schema.shippingRates).where(eq(schema.shippingRates.id, rate.id));
    await tenantDb.delete(schema.shippingZones).where(eq(schema.shippingZones.id, zone.id));
  });
});
```

> **NOTE on required notNull columns:** Before finalizing Step 4, confirm the exact notNull columns for `products`, `customers`, `shipping_rates`, `tax_rates`, `reviews` by reading `apps/backend/src/db/schema.ts` (lines ~177, ~323, ~1029, ~1063, ~490). The seed values above must satisfy every notNull column without defaults. If `products.categoryId` is notNull, seed a category first; if `customers` requires more fields, add them. Adjust the seed block to match schema reality — do NOT leave a placeholder.

- [ ] **Step 5: Run the RLS test**

Run: `pnpm --filter backend test src/modules/shipping/shipping_tax_review.rls.test.ts`
Expected: 6/6 pass. If a seed insert fails on a notNull violation, read schema.ts, add the missing required field, and re-run.

- [ ] **Step 6: Run the FULL suite WITH RLS ON**

Run: `pnpm --filter backend test`
Expected: all green (baseline 1067 + 23 new sentinel tests + 6 RLS tests ≈ 1096). This is the load-bearing proof — the refactor survived RLS ON, no bare-db residue.

- [ ] **Step 7: Verify no console.log / no `any` in touched source**

Run: `grep -rn "console.log" apps/backend/src/modules/shipping/shipping.repo.ts apps/backend/src/modules/shipping/shipping.service.ts apps/backend/src/modules/tax/tax.repo.ts apps/backend/src/modules/tax/tax.service.ts apps/backend/src/modules/review/review.repo.ts apps/backend/src/modules/review/review.service.ts`
Expected: no matches.

- [ ] **Step 8: Commit**

```bash
git add -f apps/backend/drizzle/0030_shipping_tax_review_rls.sql
git add apps/backend/drizzle/meta/_journal.json apps/backend/src/modules/shipping/shipping_tax_review.rls.test.ts
git commit -m "feat(rls): enable RLS on shipping_zones/shipping_rates/tax_rates/reviews (Phase 1 shipping/tax/review, migration 0030)"
```

---

### Final: whole-branch opus review

After Task 5 is green, dispatch a final whole-branch code review on the most capable available model over the full phase diff (`git merge-base main HEAD..HEAD` via `scripts/review-package`). The reviewer checks:
- Spec §3 + §6 compliance (every reader of the 4 tables inside `withTenant` or `dbOwner`).
- The 5 named risks: (1) cache+withTenant ordering in `calculateShipping`/`calculateTax`; (2) `review.repo` object tx-as-last-param including `findManyByProductId(productId, storeId, options?, tx?)` positional safety; (3) `review.service.update`/`delete` single-withTenant atomicity (findByIdBasic + write in one tx); (4) pre-existing test assertion updates completeness (no `toHaveBeenCalledWith` left without `mockTx`); (5) seed.ts edit scope (only reviews, not other seeded tables).
- Already-safe readers to NOT re-flag: `customer.repo.findFullProfileForExport` (tx-aware relation load), `pricing.service` (calls shipping/tax at service boundary, mocked), `seo.route.public`, `bundle.repo`, `product.repo` relations.
On findings: execute ONE fix wave inline (subagent dispatch may 429), re-run covering tests + full suite with RLS ON, then re-verify. Commit only on user request; never push without explicit user request.

## Self-Review

**Spec coverage:** §Architecture (Approach A, NULLIF §4.1) → Tasks 1-3 + 5. §Audit table inventory → all 4 tables covered. §Scope in-scope items → Tasks 1-5. §Testing (3 sentinel + 2 existing updates + 1 RLS test) → Tasks 1-5. §Risks 1-5 → Task 1 (risk 1, 2), Task 3 (risk 2, 3, 5), Task 4 (seed scope). All covered.

**Placeholder scan:** No TBD/TODO. One explicit NOTE in Task 5 Step 4 instructing the implementer to confirm notNull columns against schema.ts before finalizing the RLS test seed — this is a verification directive, not a placeholder; the code block is complete and runnable subject to that confirmation. No other placeholders.

**Type consistency:** `DbOrTx` imported from `../_shared/db-types.js` in all 3 repos (matches `category.repo`/`modifier.repo`/`bundle.repo` prior phases). `tx?: DbOrTx` is always the LAST param. `withTenant(storeId, fn)` signature matches `lib/withTenant.ts`. Sentinel-tx tests use `{ __sentinel: 'tx' }` + `expect.objectContaining({ __sentinel: 'tx' })` consistently. `mockTx = { __sentinel: 'tx' }` in existing-test updates matches the `coupon.service.test.ts` pattern.
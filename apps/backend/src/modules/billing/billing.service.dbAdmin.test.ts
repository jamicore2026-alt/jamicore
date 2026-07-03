/* eslint-disable @typescript-eslint/no-explicit-any */
// Locks in that billingService.upgradePlan runs its plan-upgrade transaction
// on dbAdmin (BYPASSRLS), not db (app_tenant). The tx writes stores (RLS since
// migration 0031) and invoices (no RLS); a bare-db tx would fail-closed on the
// stores update (no app.tenant_id → 0 rows updated) while the invoice still
// inserts — a silent plan-upgrade data-integrity bug. dbAdmin.transaction is
// mocked to invoke fn with a sentinel tx so we also assert the tx is forwarded
// to billingRepo.updateStorePlan + insertInvoice.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => {
  const sentinelTx = { __sentinel: 'tx' };
  const dbAdminTransaction = vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(sentinelTx));
  const dbTransaction = vi.fn();
  const updateStorePlan = vi.fn().mockResolvedValue({ id: 's1', planId: 'new', planExpiresAt: new Date('2026-08-01') });
  const insertInvoice = vi.fn().mockResolvedValue({ id: 'inv-1' });
  const findStoreWithPlan = vi.fn().mockResolvedValue({
    id: 's1', name: 'Shop', planId: 'old', planExpiresAt: null, trialEndsAt: null, usedStorage: 0,
    plan: { maxProducts: 10 },
  });
  const findPlanById = vi.fn().mockResolvedValue({
    id: 'new', name: 'Pro', isActive: true, interval: 'month', price: '10.00',
  });
  return { sentinelTx, dbAdminTransaction, dbTransaction, updateStorePlan, insertInvoice, findStoreWithPlan, findPlanById };
});

vi.mock('../../db/index.js', () => ({
  db: { transaction: hoisted.dbTransaction },
  dbAdmin: { transaction: hoisted.dbAdminTransaction },
  dbOwner: {},
}));

vi.mock('./billing.repo.js', () => ({
  billingRepo: {
    findStoreWithPlan: hoisted.findStoreWithPlan,
    findPlanById: hoisted.findPlanById,
    updateStorePlan: hoisted.updateStorePlan,
    insertInvoice: hoisted.insertInvoice,
  },
}));

vi.mock('../planLimits/planLimits.service.js', () => ({ planLimitsService: {} }));

import { billingService } from './billing.service.js';

describe('billingService.upgradePlan runs its tx on dbAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses dbAdmin.transaction (not db) and forwards the tx to updateStorePlan + insertInvoice', async () => {
    const result = await billingService.upgradePlan('s1', 'new');

    expect(hoisted.dbAdminTransaction).toHaveBeenCalledTimes(1);
    expect(hoisted.dbTransaction).not.toHaveBeenCalled();
    // The sentinel tx from dbAdmin.transaction is forwarded to both repos.
    expect(hoisted.updateStorePlan).toHaveBeenCalledWith('s1', expect.objectContaining({ planId: 'new' }), hoisted.sentinelTx);
    expect(hoisted.insertInvoice).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1', planId: 'new' }), hoisted.sentinelTx);
    expect(result).toEqual(expect.objectContaining({ store: expect.objectContaining({ planId: 'new' }), invoice: { id: 'inv-1' } }));
  });
});
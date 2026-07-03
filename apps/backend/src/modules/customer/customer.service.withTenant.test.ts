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
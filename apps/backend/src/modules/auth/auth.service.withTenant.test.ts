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
    // generateToken (called by requestPasswordReset/resendVerification AFTER the
    // withTenant block) touches these — mock them so the awaited calls resolve.
    deleteVerificationTokensByEmailTypeUserType: vi.fn().mockResolvedValue(undefined),
    createVerificationToken: vi.fn().mockResolvedValue({ token: 'tok' }),
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
/* eslint-disable @typescript-eslint/no-explicit-any */
// Unit tests for authService — business logic with mocked dependencies
// Tests verify that the service layer correctly orchestrates repo calls,
// password hashing, token generation, and error throwing.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock bcrypt ───
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));
import _bcrypt from 'bcrypt';
const bcrypt = _bcrypt as any;

// ─── Mock authRepo ───
// Must define mock functions inline inside vi.mock factory because
// vi.mock is hoisted to the top of the file — top-level const values
// are not yet initialized when the factory runs.
vi.mock('./auth.repo.js', () => ({
  authRepo: {
    findUserByEmail: vi.fn(),
    findUserById: vi.fn(),
    findStoreByOwnerEmail: vi.fn(),
    findStoreByDomain: vi.fn(),
    createStore: vi.fn(),
    createUser: vi.fn(),
    findCustomerByEmailAndStoreId: vi.fn(),
    findCustomerById: vi.fn(),
    findCustomerByEmailAndStoreIdForResetCheck: vi.fn(),
    createCustomer: vi.fn(),
    findSuperAdminByEmail: vi.fn(),
    findSuperAdminById: vi.fn(),
    updateSuperAdminLastLogin: vi.fn(),
    deleteVerificationTokensByEmailTypeUserType: vi.fn(),
    createVerificationToken: vi.fn(),
    findVerificationToken: vi.fn(),
    markTokenUsed: vi.fn(),
    updateCustomerPassword: vi.fn(),
    updateCustomerVerified: vi.fn(),
    updateMerchantPassword: vi.fn(),
    revokeAllUserTokens: vi.fn(),
  },
}));

// ─── Mock db and schema for transaction-based verifyEmail / resetPassword ───
vi.mock('../../db/index.js', () => ({
  db: {
    transaction: vi.fn(),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
  },
}));
vi.mock('../../db/schema.js', () => ({
  verificationTokens: {
    token: 'token',
    type: 'type',
    expiresAt: 'expiresAt',
    usedAt: 'usedAt',
    id: 'id',
    email: 'email',
    userType: 'userType',
    storeId: 'storeId',
  },
  users: { id: 'id', isVerified: 'isVerified' },
  rolePermissions: { storeId: 'storeId', role: 'role', permissions: 'permissions' },
}));

import { db } from '../../db/index.js';
import { authService } from './auth.service.js';
import { ErrorCodes } from '../../errors/codes.js';
import { authRepo as _authRepo } from './auth.repo.js';
const mockAuthRepo = _authRepo as any;

// ─── Test helpers ───
const mockHashedPassword = '$2b$12$hashedpassword12345678901234567890';

function createMockRedis(overrides: Record<string, ReturnType<typeof vi.fn>> = {}) {
  return {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    ...overrides,
  } as any;
}

// Helper to build a mock Drizzle transaction for verifyEmail / resetPassword
function createMockTx(record: any) {
  const mockFor = vi.fn().mockResolvedValue(record ? [record] : []);
  const mockWhere1 = vi.fn().mockReturnValue({ for: mockFor });
  const mockFromFn = vi.fn().mockReturnValue({ where: mockWhere1 });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFromFn });

  const mockWhere2 = vi.fn().mockResolvedValue(undefined);
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere2 });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

  return { select: mockSelect, update: mockUpdate };
}

function setupDbTransaction(record: any) {
  const tx = createMockTx(record);
  vi.mocked(db.transaction).mockImplementation(async (cb: any) => cb(tx as any));
  return tx;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════
// Password hashing
// ═══════════════════════════════════════════
describe('authService.hashPassword', () => {
  it('hashes a password using bcrypt', async () => {
    vi.mocked(bcrypt.hash).mockResolvedValueOnce(mockHashedPassword);
    const result = await authService.hashPassword('Password1');
    expect(bcrypt.hash).toHaveBeenCalledWith('Password1', 12);
    expect(result).toBe(mockHashedPassword);
  });
});

describe('authService.verifyPassword', () => {
  it('returns true for correct password', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true);
    const result = await authService.verifyPassword('Password1', mockHashedPassword);
    expect(bcrypt.compare).toHaveBeenCalledWith('Password1', mockHashedPassword);
    expect(result).toBe(true);
  });

  it('returns false for incorrect password', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false);
    const result = await authService.verifyPassword('WrongPassword1', mockHashedPassword);
    expect(result).toBe(false);
  });
});

// ═══════════════════════════════════════════
// Merchant auth
// ═══════════════════════════════════════════
describe('authService.verifyMerchantCredentials', () => {
  it('returns user for valid credentials', async () => {
    const mockUser = { id: 'u1', email: 'owner@store.com', password: mockHashedPassword, role: 'OWNER', storeId: 's1' };
    mockAuthRepo.findUserByEmail.mockResolvedValueOnce(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true);

    const result = await authService.verifyMerchantCredentials('owner@store.com', 'Password1');
    expect(result).toEqual(mockUser);
    expect(mockAuthRepo.findUserByEmail).toHaveBeenCalledWith('owner@store.com');
  });

  it('throws INVALID_CREDENTIALS when user not found', async () => {
    mockAuthRepo.findUserByEmail.mockResolvedValueOnce(null);

    await expect(authService.verifyMerchantCredentials('nobody@store.com', 'Password1'))
      .rejects.toMatchObject({ code: ErrorCodes.INVALID_CREDENTIALS });
  });

  it('throws INVALID_CREDENTIALS when password is wrong', async () => {
    mockAuthRepo.findUserByEmail.mockResolvedValueOnce({ id: 'u1', password: mockHashedPassword });
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false);

    await expect(authService.verifyMerchantCredentials('owner@store.com', 'WrongPassword1'))
      .rejects.toMatchObject({ code: ErrorCodes.INVALID_CREDENTIALS });
  });
});

describe('authService.registerMerchant', () => {
  const registrationData = {
    storeName: 'My Store',
    domain: 'mystore',
    ownerEmail: 'owner@store.com',
    ownerName: 'Jane Doe',
    ownerPhone: '+1234567890',
    password: 'Password1',
  };

  it('creates store and user on successful registration', async () => {
    mockAuthRepo.findStoreByOwnerEmail.mockResolvedValueOnce(null);
    mockAuthRepo.findStoreByDomain.mockResolvedValueOnce(null);
    vi.mocked(bcrypt.hash).mockResolvedValueOnce(mockHashedPassword);

    const mockStore = { id: 's1', name: 'My Store', domain: 'mystore', ownerEmail: 'owner@store.com' };
    const mockUser = { id: 'u1', email: 'owner@store.com', role: 'OWNER', storeId: 's1' };
    mockAuthRepo.createStore.mockResolvedValueOnce(mockStore);
    mockAuthRepo.createUser.mockResolvedValueOnce(mockUser);

    const result = await authService.registerMerchant(registrationData);
    expect(result).toEqual({ store: mockStore, user: mockUser });
    expect(mockAuthRepo.createStore).toHaveBeenCalledWith(expect.objectContaining({
      name: 'My Store',
      domain: 'mystore',
      ownerEmail: 'owner@store.com',
      status: 'pending',
      isApproved: false,
    }));
    expect(mockAuthRepo.createUser).toHaveBeenCalledWith(expect.objectContaining({
      email: 'owner@store.com',
      role: 'OWNER',
      storeId: 's1',
    }));
  });

  it('throws USER_ALREADY_EXISTS when email taken', async () => {
    mockAuthRepo.findStoreByOwnerEmail.mockResolvedValueOnce({ id: 's1' });

    await expect(authService.registerMerchant(registrationData))
      .rejects.toMatchObject({ code: ErrorCodes.USER_ALREADY_EXISTS });
  });

  it('throws USER_ALREADY_EXISTS when domain taken', async () => {
    mockAuthRepo.findStoreByOwnerEmail.mockResolvedValueOnce(null);
    mockAuthRepo.findStoreByDomain.mockResolvedValueOnce({ id: 's2' });

    await expect(authService.registerMerchant(registrationData))
      .rejects.toMatchObject({ code: ErrorCodes.USER_ALREADY_EXISTS });
  });
});

// ═══════════════════════════════════════════
// Customer auth
// ═══════════════════════════════════════════
describe('authService.verifyCustomerCredentials', () => {
  it('returns customer for valid credentials', async () => {
    const mockCustomer = { id: 'c1', email: 'buyer@store.com', storeId: 's1' };
    mockAuthRepo.findCustomerByEmailAndStoreId.mockResolvedValueOnce(mockCustomer);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true);

    const result = await authService.verifyCustomerCredentials('buyer@store.com', 'Password1', 's1');
    expect(result).toEqual(mockCustomer);
  });

  it('throws INVALID_CREDENTIALS when customer not found', async () => {
    mockAuthRepo.findCustomerByEmailAndStoreId.mockResolvedValueOnce(null);

    await expect(authService.verifyCustomerCredentials('nobody@store.com', 'Password1', 's1'))
      .rejects.toMatchObject({ code: ErrorCodes.INVALID_CREDENTIALS });
  });

  it('throws INVALID_CREDENTIALS when password wrong', async () => {
    mockAuthRepo.findCustomerByEmailAndStoreId.mockResolvedValueOnce({ id: 'c1' });
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false);

    await expect(authService.verifyCustomerCredentials('buyer@store.com', 'Wrong1', 's1'))
      .rejects.toMatchObject({ code: ErrorCodes.INVALID_CREDENTIALS });
  });
});

describe('authService.registerCustomer', () => {
  it('creates customer on successful registration', async () => {
    const data = { email: 'new@store.com', password: 'Password1', firstName: 'John', storeId: 's1' };
    mockAuthRepo.findCustomerByEmailAndStoreId.mockResolvedValueOnce(null);
    vi.mocked(bcrypt.hash).mockResolvedValueOnce(mockHashedPassword);

    const mockCustomer = { id: 'c1', ...data };
    mockAuthRepo.createCustomer.mockResolvedValueOnce(mockCustomer);

    const result = await authService.registerCustomer(data);
    expect(result).toEqual(mockCustomer);
    expect(mockAuthRepo.createCustomer).toHaveBeenCalledWith(expect.objectContaining({
      email: data.email,
      storeId: data.storeId,
    }));
  });

  it('throws CUSTOMER_ALREADY_EXISTS when email exists in store', async () => {
    const data = { email: 'existing@store.com', password: 'Password1', storeId: 's1' };
    mockAuthRepo.findCustomerByEmailAndStoreId.mockResolvedValueOnce({ id: 'c1' });

    await expect(authService.registerCustomer(data))
      .rejects.toMatchObject({ code: ErrorCodes.CUSTOMER_ALREADY_EXISTS });
  });
});

// ═══════════════════════════════════════════
// SuperAdmin auth
// ═══════════════════════════════════════════
describe('authService.verifySuperAdminCredentials', () => {
  it('returns admin for valid credentials', async () => {
    const mockAdmin = { id: 'a1', email: 'admin@platform.com', isActive: true, password: mockHashedPassword };
    mockAuthRepo.findSuperAdminByEmail.mockResolvedValueOnce(mockAdmin);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true);

    const result = await authService.verifySuperAdminCredentials('admin@platform.com', 'AdminPass1');
    expect(result).toEqual(mockAdmin);
  });

  it('throws INVALID_CREDENTIALS when admin not found', async () => {
    mockAuthRepo.findSuperAdminByEmail.mockResolvedValueOnce(null);

    await expect(authService.verifySuperAdminCredentials('nobody@platform.com', 'AdminPass1'))
      .rejects.toMatchObject({ code: ErrorCodes.INVALID_CREDENTIALS });
  });

  it('throws INVALID_CREDENTIALS when admin is inactive', async () => {
    mockAuthRepo.findSuperAdminByEmail.mockResolvedValueOnce({ id: 'a1', isActive: false });

    await expect(authService.verifySuperAdminCredentials('admin@platform.com', 'AdminPass1'))
      .rejects.toMatchObject({ code: ErrorCodes.INVALID_CREDENTIALS });
  });

  it('throws INVALID_CREDENTIALS when password wrong', async () => {
    mockAuthRepo.findSuperAdminByEmail.mockResolvedValueOnce({ id: 'a1', isActive: true, password: mockHashedPassword });
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false);

    await expect(authService.verifySuperAdminCredentials('admin@platform.com', 'Wrong1'))
      .rejects.toMatchObject({ code: ErrorCodes.INVALID_CREDENTIALS });
  });
});

// ═══════════════════════════════════════════
// Profile lookups
// ═══════════════════════════════════════════
describe('authService.getMerchantUser', () => {
  it('returns user when found', async () => {
    const mockUser = { id: 'u1', email: 'owner@store.com' };
    mockAuthRepo.findUserById.mockResolvedValueOnce(mockUser);

    const result = await authService.getMerchantUser('u1');
    expect(result).toEqual(mockUser);
  });

  it('throws USER_NOT_FOUND when not found', async () => {
    mockAuthRepo.findUserById.mockResolvedValueOnce(null);

    await expect(authService.getMerchantUser('nonexistent'))
      .rejects.toMatchObject({ code: ErrorCodes.USER_NOT_FOUND });
  });
});

describe('authService.getCustomerProfile', () => {
  it('returns customer when found', async () => {
    const mockCustomer = { id: 'c1', email: 'buyer@store.com' };
    mockAuthRepo.findCustomerById.mockResolvedValueOnce(mockCustomer);

    const result = await authService.getCustomerProfile('c1');
    expect(result).toEqual(mockCustomer);
  });

  it('throws CUSTOMER_NOT_FOUND when not found', async () => {
    mockAuthRepo.findCustomerById.mockResolvedValueOnce(null);

    await expect(authService.getCustomerProfile('nonexistent'))
      .rejects.toMatchObject({ code: ErrorCodes.CUSTOMER_NOT_FOUND });
  });
});

describe('authService.getSuperAdminProfile', () => {
  it('returns admin when found', async () => {
    const mockAdmin = { id: 'a1', email: 'admin@platform.com' };
    mockAuthRepo.findSuperAdminById.mockResolvedValueOnce(mockAdmin);

    const result = await authService.getSuperAdminProfile('a1');
    expect(result).toEqual(mockAdmin);
  });

  it('throws ADMIN_NOT_FOUND when not found', async () => {
    mockAuthRepo.findSuperAdminById.mockResolvedValueOnce(null);

    await expect(authService.getSuperAdminProfile('nonexistent'))
      .rejects.toMatchObject({ code: ErrorCodes.ADMIN_NOT_FOUND });
  });
});

// ═══════════════════════════════════════════
// Refresh token management (Redis-backed)
// ═══════════════════════════════════════════
describe('authService.buildRefreshKey', () => {
  it('builds correct Redis key format', () => {
    const key = authService.buildRefreshKey('merchant', 'user123', 'jti-abc');
    expect(key).toBe('refresh:merchant:user123:jti-abc');
  });

  it('builds correct key for customer scope', () => {
    const key = authService.buildRefreshKey('customer', 'cust456', 'jti-xyz');
    expect(key).toBe('refresh:customer:cust456:jti-xyz');
  });

  it('builds correct key for admin scope', () => {
    const key = authService.buildRefreshKey('admin', 'admin789', 'jti-def');
    expect(key).toBe('refresh:admin:admin789:jti-def');
  });
});

describe('authService.storeRefreshToken', () => {
  it('stores token in Redis with TTL', async () => {
    const redis = createMockRedis();
    await authService.storeRefreshToken(redis, 'merchant', 'user123', 'jti-abc');

    expect(redis.setex).toHaveBeenCalledWith(
      'refresh:merchant:user123:jti-abc',
      7 * 24 * 60 * 60,
      'valid',
    );
  });
});

describe('authService.verifyRefreshToken', () => {
  it('returns true when token exists in Redis', async () => {
    const redis = createMockRedis({ get: vi.fn().mockResolvedValueOnce('valid') });
    const result = await authService.verifyRefreshToken(redis, 'merchant', 'user123', 'jti-abc');
    expect(result).toBe(true);
  });

  it('returns false when token not found in Redis', async () => {
    const redis = createMockRedis({ get: vi.fn().mockResolvedValueOnce(null) });
    const result = await authService.verifyRefreshToken(redis, 'merchant', 'user123', 'jti-abc');
    expect(result).toBe(false);
  });

  it('returns false when token value is not "valid"', async () => {
    const redis = createMockRedis({ get: vi.fn().mockResolvedValueOnce('revoked') });
    const result = await authService.verifyRefreshToken(redis, 'merchant', 'user123', 'jti-abc');
    expect(result).toBe(false);
  });
});

describe('authService.revokeRefreshToken', () => {
  it('deletes token from Redis', async () => {
    const redis = createMockRedis();
    await authService.revokeRefreshToken(redis, 'merchant', 'user123', 'jti-abc');
    expect(redis.del).toHaveBeenCalledWith('refresh:merchant:user123:jti-abc');
  });
});

describe('authService.refreshMerchantToken', () => {
  it('revokes old token, stores new token, returns payload', async () => {
    const redis = createMockRedis();
    const result = await authService.refreshMerchantToken(redis, 'old-jti', 'user123', 'store456', 'OWNER');

    expect(redis.del).toHaveBeenCalled(); // revoke old
    expect(redis.setex).toHaveBeenCalled(); // store new
    expect(result).toMatchObject({
      userId: 'user123',
      storeId: 'store456',
      role: 'OWNER',
      type: 'refresh',
    });
    expect(result.jti).toBeDefined();
  });
});

describe('authService.refreshCustomerToken', () => {
  it('revokes old token, stores new token, returns payload', async () => {
    const redis = createMockRedis();
    const result = await authService.refreshCustomerToken(redis, 'old-jti', 'cust123', 'store456');

    expect(redis.del).toHaveBeenCalled();
    expect(redis.setex).toHaveBeenCalled();
    expect(result).toMatchObject({
      customerId: 'cust123',
      storeId: 'store456',
      type: 'refresh',
    });
  });
});

describe('authService.refreshAdminToken', () => {
  it('revokes old token, stores new token, returns payload', async () => {
    const redis = createMockRedis();
    const result = await authService.refreshAdminToken(redis, 'old-jti', 'admin123', 'superAdmin');

    expect(redis.del).toHaveBeenCalled();
    expect(redis.setex).toHaveBeenCalled();
    expect(result).toMatchObject({
      superAdminId: 'admin123',
      role: 'superAdmin',
      type: 'refresh',
    });
  });
});

// ═══════════════════════════════════════════
// Auth reset operations
// ═══════════════════════════════════════════
describe('authService.generateToken', () => {
  it('creates verification token after deleting existing ones', async () => {
    const mockRecord = { id: 't1', token: 'generated-uuid', email: 'user@store.com', type: 'email_verification', userType: 'customer' };
    mockAuthRepo.deleteVerificationTokensByEmailTypeUserType.mockResolvedValueOnce(undefined);
    mockAuthRepo.createVerificationToken.mockResolvedValueOnce(mockRecord);

    const result = await authService.generateToken('user@store.com', 'email_verification', 'customer', 's1');

    expect(mockAuthRepo.deleteVerificationTokensByEmailTypeUserType).toHaveBeenCalledWith(
      'user@store.com', 'email_verification', 'customer',
    );
    expect(mockAuthRepo.createVerificationToken).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@store.com',
        type: 'email_verification',
        userType: 'customer',
        storeId: 's1',
      }),
    );
    expect(result).toEqual(mockRecord);
  });

  it('creates token with null storeId for merchant type', async () => {
    const mockRecord = { id: 't2', token: 'uuid-2', email: 'owner@store.com', type: 'password_reset', userType: 'merchant' };
    mockAuthRepo.deleteVerificationTokensByEmailTypeUserType.mockResolvedValueOnce(undefined);
    mockAuthRepo.createVerificationToken.mockResolvedValueOnce(mockRecord);

    await authService.generateToken('owner@store.com', 'password_reset', 'merchant');

    expect(mockAuthRepo.createVerificationToken).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: null,
      }),
    );
  });
});

describe('authService.verifyEmail', () => {
  it('verifies customer email and updates verified status', async () => {
    const mockRecord = { id: 't1', token: 'abc', email: 'c@store.com', type: 'email_verification', userType: 'customer', storeId: 's1' };
    setupDbTransaction(mockRecord);
    mockAuthRepo.updateCustomerVerified.mockResolvedValueOnce([{ id: 'c1' }]);

    const result = await authService.verifyEmail('abc');
    expect(result).toEqual({ verified: true, userType: 'customer', email: 'c@store.com' });
    expect(mockAuthRepo.updateCustomerVerified).toHaveBeenCalledWith('c@store.com', 's1', expect.anything());
  });

  it('verifies merchant email and updates isVerified', async () => {
    const mockRecord = { id: 't2', token: 'xyz', email: 'm@store.com', type: 'email_verification', userType: 'merchant', storeId: null };
    setupDbTransaction(mockRecord);
    mockAuthRepo.findUserByEmail.mockResolvedValueOnce({ id: 'u1', email: 'm@store.com' });

    const result = await authService.verifyEmail('xyz');
    expect(result).toEqual({ verified: true, userType: 'merchant', email: 'm@store.com' });
    expect(mockAuthRepo.updateCustomerVerified).not.toHaveBeenCalled();
  });

  it('throws VERIFICATION_TOKEN_EXPIRED for invalid token', async () => {
    setupDbTransaction(null);

    await expect(authService.verifyEmail('invalid-token'))
      .rejects.toMatchObject({ code: ErrorCodes.VERIFICATION_TOKEN_EXPIRED });
  });
});

describe('authService.requestPasswordReset', () => {
  it('returns tokenNotFound when customer email not found', async () => {
    mockAuthRepo.findCustomerByEmailAndStoreId.mockResolvedValueOnce(null);

    const result = await authService.requestPasswordReset('nobody@store.com', 's1', 'customer');
    expect(result).toEqual({ token: null, emailNotFound: true });
  });

  it('throws EMAIL_NOT_VERIFIED when customer not verified', async () => {
    mockAuthRepo.findCustomerByEmailAndStoreId.mockResolvedValueOnce({ id: 'c1', isVerified: false });

    await expect(authService.requestPasswordReset('unverified@store.com', 's1', 'customer'))
      .rejects.toMatchObject({ code: ErrorCodes.EMAIL_NOT_VERIFIED });
  });

  it('generates reset token for verified customer', async () => {
    mockAuthRepo.findCustomerByEmailAndStoreId.mockResolvedValueOnce({ id: 'c1', isVerified: true });
    mockAuthRepo.deleteVerificationTokensByEmailTypeUserType.mockResolvedValueOnce(undefined);
    mockAuthRepo.createVerificationToken.mockResolvedValueOnce({ id: 't1', token: 'reset-abc' });

    const result = await authService.requestPasswordReset('customer@store.com', 's1', 'customer');
    expect(result.emailNotFound).toBe(false);
    expect(result.token).toBe('reset-abc');
  });

  it('returns tokenNotFound when merchant email not found', async () => {
    mockAuthRepo.findUserByEmail.mockResolvedValueOnce(null);

    const result = await authService.requestPasswordReset('nobody@store.com', undefined, 'merchant');
    expect(result).toEqual({ token: null, emailNotFound: true });
  });

  it('generates reset token for existing merchant', async () => {
    mockAuthRepo.findUserByEmail.mockResolvedValueOnce({ id: 'u1' });
    mockAuthRepo.deleteVerificationTokensByEmailTypeUserType.mockResolvedValueOnce(undefined);
    mockAuthRepo.createVerificationToken.mockResolvedValueOnce({ id: 't2', token: 'reset-xyz' });

    const result = await authService.requestPasswordReset('owner@store.com', undefined, 'merchant');
    expect(result.emailNotFound).toBe(false);
    expect(result.token).toBe('reset-xyz');
  });
});

describe('authService.resetPassword', () => {
  it('resets customer password with valid token', async () => {
    const mockRecord = { id: 't1', token: 'reset-abc', email: 'c@store.com', userType: 'customer', storeId: 's1' };
    setupDbTransaction(mockRecord);
    vi.mocked(bcrypt.hash).mockResolvedValueOnce(mockHashedPassword);
    mockAuthRepo.updateCustomerPassword.mockResolvedValueOnce(undefined);
    mockAuthRepo.findCustomerByEmailAndStoreId.mockResolvedValueOnce({ id: 'c1' });

    const result = await authService.resetPassword('reset-abc', 'NewPassword1');
    expect(result).toEqual({ reset: true, email: 'c@store.com' });
    expect(mockAuthRepo.updateCustomerPassword).toHaveBeenCalledWith('c@store.com', 's1', mockHashedPassword, expect.anything());
  });

  it('resets merchant password with valid token', async () => {
    const mockRecord = { id: 't2', token: 'reset-xyz', email: 'm@store.com', userType: 'merchant', storeId: null };
    setupDbTransaction(mockRecord);
    vi.mocked(bcrypt.hash).mockResolvedValueOnce(mockHashedPassword);
    mockAuthRepo.updateMerchantPassword.mockResolvedValueOnce(undefined);
    mockAuthRepo.findUserByEmail.mockResolvedValueOnce({ id: 'u1' });

    const result = await authService.resetPassword('reset-xyz', 'NewPassword1');
    expect(result).toEqual({ reset: true, email: 'm@store.com' });
    expect(mockAuthRepo.updateMerchantPassword).toHaveBeenCalledWith('m@store.com', mockHashedPassword, expect.anything());
  });

  it('throws PASSWORD_RESET_EXPIRED for invalid token', async () => {
    setupDbTransaction(null);

    await expect(authService.resetPassword('invalid-token', 'NewPassword1'))
      .rejects.toMatchObject({ code: ErrorCodes.PASSWORD_RESET_EXPIRED });
  });
});

describe('authService.resendVerification', () => {
  it('throws EMAIL_ALREADY_VERIFIED when customer already verified', async () => {
    mockAuthRepo.findCustomerByEmailAndStoreIdForResetCheck.mockResolvedValueOnce({ isVerified: true });

    await expect(authService.resendVerification('c@store.com', 's1', 'customer'))
      .rejects.toMatchObject({ code: ErrorCodes.EMAIL_ALREADY_VERIFIED });
  });

  it('generates new verification token for unverified customer', async () => {
    mockAuthRepo.findCustomerByEmailAndStoreIdForResetCheck.mockResolvedValueOnce({ isVerified: false });
    mockAuthRepo.deleteVerificationTokensByEmailTypeUserType.mockResolvedValueOnce(undefined);
    mockAuthRepo.createVerificationToken.mockResolvedValueOnce({ id: 't1', token: 'new-verify-token' });

    const result = await authService.resendVerification('c@store.com', 's1', 'customer');
    expect(result.token).toBe('new-verify-token');
  });
});
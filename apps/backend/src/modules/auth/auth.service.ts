// Auth service — business logic for auth and authReset, calls authRepo, imports db ONLY for db.transaction()
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcrypt';
import { authRepo } from './auth.repo.js';
import { ErrorCodes } from '../../errors/codes.js';
import { db } from '../../db/index.js';
import { verificationTokens, users, rolePermissions } from '../../db/schema.js';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { DEFAULT_ROLE_PERMISSIONS } from '../staff/staff.constants.js';
import { env } from '../../config/env.js';
import type { RedisClientType } from '../../lib/redis.js';
import type { RegisterMerchantData, RegisterCustomerData, TokenType, AuthUserType, RefreshTokenScope } from './auth.types.js';

const SALT_ROUNDS = 12;
const VERIFY_EXPIRY_HOURS = 24;
const RESET_EXPIRY_HOURS = 1;
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// SEC-003: 8-digit MFA codes (10^8 = 100M space) instead of 6-digit.
// SEC-002: store HMAC-SHA256(secret, code) in Redis, not the code itself.
// The server-only secret is derived from MFA_SECRET (preferred) or
// JWT_SECRET as a fallback so dev still works without a separate var.
const MFA_CODE_LENGTH = 8;
const MFA_SECRET = env.MFA_SECRET ?? env.JWT_SECRET;

function hashMfaCode(code: string): string {
  return createHmac('sha256', MFA_SECRET).update(code).digest('hex');
}

export const authService = {
  // ─── Password hashing ───

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  // ─── Merchant auth ───

  async verifyMerchantCredentials(email: string, password: string): Promise<NonNullable<Awaited<ReturnType<typeof authRepo.findUserByEmail>>>> {
    const user = await authRepo.findUserByEmail(email);

    if (!user) {
      throw Object.assign(new Error('Invalid credentials'), {
        code: ErrorCodes.INVALID_CREDENTIALS,
      });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw Object.assign(new Error('Invalid credentials'), {
        code: ErrorCodes.INVALID_CREDENTIALS,
      });
    }

    return user;
  },

  async registerMerchant(data: RegisterMerchantData): Promise<{ store: Awaited<ReturnType<typeof authRepo.createStore>>; user: Awaited<ReturnType<typeof authRepo.createUser>> }> {
    // Check if store with this email already exists
    const existingStore = await authRepo.findStoreByOwnerEmail(data.ownerEmail);

    if (existingStore) {
      throw Object.assign(new Error('Store with this email already exists'), {
        code: ErrorCodes.USER_ALREADY_EXISTS,
      });
    }

    // Check if domain already exists
    const existingDomain = await authRepo.findStoreByDomain(data.domain);

    if (existingDomain) {
      throw Object.assign(new Error('Domain already taken'), {
        code: ErrorCodes.USER_ALREADY_EXISTS,
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Create store
    const store = await authRepo.createStore({
      name: data.storeName,
      domain: data.domain,
      ownerEmail: data.ownerEmail,
      ownerName: data.ownerName,
      ownerPhone: data.ownerPhone,
      status: 'pending',
      isApproved: false,
    });

    // Create user
    const user = await authRepo.createUser({
      email: data.ownerEmail,
      password: hashedPassword,
      role: 'OWNER',
      storeId: store.id,
    });

    // Seed default role permissions for the new store
    await db.insert(rolePermissions).values(
      Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([role, permissions]) => ({
        storeId: store.id,
        role,
        permissions,
      })),
    );

    return { store, user };
  },

  // ─── Customer auth ───

  async verifyCustomerCredentials(email: string, password: string, storeId: string): Promise<NonNullable<Awaited<ReturnType<typeof authRepo.findCustomerByEmailAndStoreId>>>> {
    const customer = await authRepo.findCustomerByEmailAndStoreId(email, storeId);

    if (!customer) {
      throw Object.assign(new Error('Invalid credentials'), {
        code: ErrorCodes.INVALID_CREDENTIALS,
      });
    }

    const isValid = await bcrypt.compare(password, customer.password);
    if (!isValid) {
      throw Object.assign(new Error('Invalid credentials'), {
        code: ErrorCodes.INVALID_CREDENTIALS,
      });
    }

    return customer;
  },

  async registerCustomer(data: RegisterCustomerData): Promise<Awaited<ReturnType<typeof authRepo.createCustomer>>> {
    // Check if customer already exists in this store
    const existing = await authRepo.findCustomerByEmailAndStoreId(data.email, data.storeId);

    if (existing) {
      throw Object.assign(new Error('Customer already exists'), {
        code: ErrorCodes.CUSTOMER_ALREADY_EXISTS,
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    const customer = await authRepo.createCustomer({
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      phone: data.phone,
      storeId: data.storeId,
    });

    return customer;
  },

  // ─── SuperAdmin auth ───

  async verifySuperAdminCredentials(email: string, password: string): Promise<NonNullable<Awaited<ReturnType<typeof authRepo.findSuperAdminByEmail>>>> {
    const admin = await authRepo.findSuperAdminByEmail(email);

    if (!admin || !admin.isActive) {
      throw Object.assign(new Error('Invalid credentials'), {
        code: ErrorCodes.INVALID_CREDENTIALS,
      });
    }

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      throw Object.assign(new Error('Invalid credentials'), {
        code: ErrorCodes.INVALID_CREDENTIALS,
      });
    }

    return admin;
  },

  // ─── Profile lookups (used by route handlers) ───

  async getMerchantUser(userId: string): Promise<NonNullable<Awaited<ReturnType<typeof authRepo.findUserById>>>> {
    const user = await authRepo.findUserById(userId);
    if (!user) {
      throw Object.assign(new Error('User not found'), {
        code: ErrorCodes.USER_NOT_FOUND,
      });
    }
    return user;
  },

  async getCustomerProfile(customerId: string): Promise<NonNullable<Awaited<ReturnType<typeof authRepo.findCustomerById>>>> {
    const customer = await authRepo.findCustomerById(customerId);
    if (!customer) {
      throw Object.assign(new Error('Customer not found'), {
        code: ErrorCodes.CUSTOMER_NOT_FOUND,
      });
    }
    return customer;
  },

  async getSuperAdminProfile(adminId: string): Promise<NonNullable<Awaited<ReturnType<typeof authRepo.findSuperAdminById>>>> {
    const admin = await authRepo.findSuperAdminById(adminId);
    if (!admin) {
      throw Object.assign(new Error('Admin not found'), {
        code: ErrorCodes.ADMIN_NOT_FOUND,
      });
    }
    return admin;
  },

  async updateSuperAdminLastLogin(adminId: string): Promise<void> {
    await authRepo.updateSuperAdminLastLogin(adminId);
  },

  // CONS-009: write lastLoginAt on customer login
  async updateCustomerLastLogin(customerId: string, storeId: string): Promise<void> {
    await authRepo.updateCustomerLastLogin(customerId, storeId);
  },

  /**
   * CONS-001: Build the canonical /me response shared by all 3 auth scopes.
   * Each scope delegates here so the wire shape stays identical:
   *   { scope, user: { id, email, name?, role?, isActive?, lastLoginAt? }, store? }
   *
   * Field presence rules:
   *   - id, email, role, scope: always present
   *   - name: superAdmin uses .name; customer derives from firstName+' '+lastName;
   *           merchant (users table) has no name column yet, returns null
   *   - isActive: superAdmin only
   *   - lastLoginAt: superAdmin + customer (column exists but is not yet
   *                 written on customer login — CONS-009); merchant omits
   *                 because the column doesn't exist
   *   - store: present for merchant + customer (both have storeId); omitted
   *           for superAdmin (platform-level)
   */
  buildMeResponse(input:
    | { scope: 'merchant'; user: { id: string; email: string; role: string }; store: { id: string; name: string | null; status: string } | null }
    | { scope: 'customer'; customer: { id: string; email: string; firstName: string; lastName: string; lastLoginAt?: Date | null }; store: { id: string; name: string | null; status: string } | null }
    | { scope: 'superAdmin'; admin: { id: string; email: string; name: string | null; isActive: boolean | null; lastLoginAt: Date | null }; role: string },
  ) {
    if (input.scope === 'merchant') {
      return {
        scope: 'merchant' as const,
        user: {
          id: input.user.id,
          email: input.user.email,
          name: null,
          role: input.user.role,
        },
        store: input.store
          ? { id: input.store.id, name: input.store.name, status: input.store.status }
          : null,
      };
    }
    if (input.scope === 'customer') {
      const fullName = [input.customer.firstName, input.customer.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || null;
      return {
        scope: 'customer' as const,
        user: {
          id: input.customer.id,
          email: input.customer.email,
          name: fullName,
          // Customer has no role concept (all customers are equal)
          role: 'customer',
          lastLoginAt: input.customer.lastLoginAt
            ? new Date(input.customer.lastLoginAt).toISOString()
            : null,
        },
        store: input.store
          ? { id: input.store.id, name: input.store.name, status: input.store.status }
          : null,
      };
    }
    // superAdmin
    return {
      scope: 'superAdmin' as const,
      user: {
        id: input.admin.id,
        email: input.admin.email,
        name: input.admin.name,
        role: input.role,
        isActive: input.admin.isActive ?? true,
        lastLoginAt: input.admin.lastLoginAt
          ? new Date(input.admin.lastLoginAt).toISOString()
          : null,
      },
    };
  },

  async changeSuperAdminPassword(adminId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
    const admin = await authRepo.findSuperAdminById(adminId);
    if (!admin) {
      throw Object.assign(new Error('Admin not found'), { code: ErrorCodes.ADMIN_NOT_FOUND });
    }
    const valid = await bcrypt.compare(currentPassword, admin.password);
    if (!valid) {
      throw Object.assign(new Error('Invalid current password'), { code: ErrorCodes.INVALID_CREDENTIALS });
    }
    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await authRepo.updateSuperAdminPassword(adminId, hashed);
    return { success: true };
  },

  // ─── Auth Reset operations ───

  async generateToken(
    email: string,
    type: TokenType,
    userType: AuthUserType,
    storeId?: string,
  ): Promise<Awaited<ReturnType<typeof authRepo.createVerificationToken>>> {
    const token = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + (type === 'email_verification' ? VERIFY_EXPIRY_HOURS : RESET_EXPIRY_HOURS) * 60 * 60 * 1000,
    );

    // Invalidate any existing tokens of the same type for this email
    await authRepo.deleteVerificationTokensByEmailTypeUserType(email, type, userType);

    const record = await authRepo.createVerificationToken({
      email,
      token,
      type,
      userType,
      storeId: storeId || null,
      expiresAt,
    });

    return record;
  },

  async verifyEmail(token: string): Promise<{ verified: boolean; userType: 'customer' | 'merchant'; email: string }> {
    return db.transaction(async (tx) => {
      const record = await tx.select().from(verificationTokens)
        .where(
          and(
            eq(verificationTokens.token, token),
            eq(verificationTokens.type, 'email_verification'),
            gt(verificationTokens.expiresAt, new Date()),
            isNull(verificationTokens.usedAt),
          ),
        )
        .for('update');

      if (!record.length) {
        throw Object.assign(new Error('Invalid or expired verification token'), {
          code: ErrorCodes.VERIFICATION_TOKEN_EXPIRED,
        });
      }

      // Mark token as used immediately
      await tx.update(verificationTokens)
        .set({ usedAt: new Date() })
        .where(eq(verificationTokens.id, record[0].id));

      // Mark email as verified
      if (record[0].userType === 'customer' && record[0].storeId) {
        const result = await authRepo.updateCustomerVerified(record[0].email, record[0].storeId, tx);

        if (result.length === 0) {
          throw Object.assign(new Error('Customer not found'), {
            code: ErrorCodes.CUSTOMER_NOT_FOUND,
          });
        }

        return { verified: true, userType: 'customer' as const, email: record[0].email };
      }

      if (record[0].userType === 'merchant') {
        const user = await authRepo.findUserByEmail(record[0].email, tx);
        if (!user) {
          throw Object.assign(new Error('User not found'), {
            code: ErrorCodes.USER_NOT_FOUND,
          });
        }
        await tx.update(users)
          .set({ isVerified: true, updatedAt: new Date() })
          .where(eq(users.id, user.id));
        return { verified: true, userType: 'merchant' as const, email: record[0].email };
      }

      throw Object.assign(new Error('Invalid token'), { code: ErrorCodes.TOKEN_INVALID });
    });
  },

  async requestPasswordReset(
    email: string,
    storeId: string | undefined,
    userType: AuthUserType,
  ): Promise<{ token: string | null; emailNotFound: boolean }> {
    // Check user exists
    if (userType === 'customer' && storeId) {
      const customer = await authRepo.findCustomerByEmailAndStoreId(email, storeId);
      if (!customer) {
        // Don't reveal if email exists - return success anyway
        return { token: null, emailNotFound: true };
      }

      if (customer.isVerified === false) {
        throw Object.assign(new Error('Email not verified'), {
          code: ErrorCodes.EMAIL_NOT_VERIFIED,
        });
      }
    } else if (userType === 'merchant') {
      const user = await authRepo.findUserByEmail(email);
      if (!user) {
        return { token: null, emailNotFound: true };
      }
    }

    const record = await authService.generateToken(email, 'password_reset', userType, storeId);
    return { token: record.token, emailNotFound: false };
  },

  async resetPassword(token: string, newPassword: string): Promise<{ reset: boolean; email: string }> {
    return db.transaction(async (tx) => {
      const record = await tx.select().from(verificationTokens)
        .where(
          and(
            eq(verificationTokens.token, token),
            eq(verificationTokens.type, 'password_reset'),
            gt(verificationTokens.expiresAt, new Date()),
            isNull(verificationTokens.usedAt),
          ),
        )
        .for('update');

      if (!record.length) {
        throw Object.assign(new Error('Invalid or expired reset token'), {
          code: ErrorCodes.PASSWORD_RESET_EXPIRED,
        });
      }

      // Mark used immediately
      await tx.update(verificationTokens)
        .set({ usedAt: new Date() })
        .where(eq(verificationTokens.id, record[0].id));

      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update password based on user type
      if (record[0].userType === 'customer' && record[0].storeId) {
        await authRepo.updateCustomerPassword(record[0].email, record[0].storeId, hashedPassword, tx);
        const customer = await authRepo.findCustomerByEmailAndStoreId(record[0].email, record[0].storeId, tx);
        if (customer) await authRepo.revokeAllUserTokens(customer.id);
      } else if (record[0].userType === 'merchant') {
        await authRepo.updateMerchantPassword(record[0].email, hashedPassword, tx);
        const user = await authRepo.findUserByEmail(record[0].email, tx);
        if (user) await authRepo.revokeAllUserTokens(user.id);
      }

      return { reset: true, email: record[0].email };
    });
  },

  async resendVerification(
    email: string,
    storeId: string | undefined,
    userType: AuthUserType,
  ): Promise<{ token: string }> {
    // Check if already verified
    if (userType === 'customer' && storeId) {
      const customer = await authRepo.findCustomerByEmailAndStoreIdForResetCheck(email, storeId);
      if (customer?.isVerified) {
        throw Object.assign(new Error('Email already verified'), {
          code: ErrorCodes.EMAIL_ALREADY_VERIFIED,
        });
      }
    }
    if (userType === 'merchant') {
      const user = await authRepo.findUserByEmail(email);
      if (user?.isVerified) {
        throw Object.assign(new Error('Email already verified'), {
          code: ErrorCodes.EMAIL_ALREADY_VERIFIED,
        });
      }
    }

    const record = await authService.generateToken(email, 'email_verification', userType, storeId);
    return { token: record.token };
  },

  // ─── Customer verification check (used in route) ───

  async findCustomerForVerification(customerId: string): Promise<Awaited<ReturnType<typeof authRepo.findCustomerById>>> {
    return authRepo.findCustomerById(customerId);
  },

  // ─── Refresh token management (Redis-backed) ───

  buildRefreshKey(scope: RefreshTokenScope, userId: string, jti: string): string {
    return `refresh:${scope}:${userId}:${jti}`;
  },

  async storeRefreshToken(
    redis: RedisClientType,
    scope: RefreshTokenScope,
    userId: string,
    jti: string,
  ): Promise<void> {
    const key = authService.buildRefreshKey(scope, userId, jti);
    await redis.setex(key, REFRESH_TTL_SECONDS, 'valid');
  },

  async verifyRefreshToken(
    redis: RedisClientType,
    scope: RefreshTokenScope,
    userId: string,
    jti: string,
  ): Promise<boolean> {
    const key = authService.buildRefreshKey(scope, userId, jti);
    const value = await redis.get(key);
    return value === 'valid';
  },

  async revokeRefreshToken(
    redis: RedisClientType,
    scope: RefreshTokenScope,
    userId: string,
    jti: string,
  ): Promise<void> {
    const key = authService.buildRefreshKey(scope, userId, jti);
    await redis.del(key);
  },

  /** Rotate merchant refresh token: revoke old, issue new, store in Redis */
  async refreshMerchantToken(
    redis: RedisClientType,
    oldJti: string,
    userId: string,
    storeId: string,
    role: string,
  ): Promise<{ userId: string; storeId: string; role: string; jti: string; type: 'refresh' }> {
    await authService.revokeRefreshToken(redis, 'merchant', userId, oldJti);
    const jti = crypto.randomUUID();
    await authService.storeRefreshToken(redis, 'merchant', userId, jti);
    return { userId, storeId, role, jti, type: 'refresh' as const };
  },

  /** Rotate customer refresh token: revoke old, issue new, store in Redis */
  async refreshCustomerToken(
    redis: RedisClientType,
    oldJti: string,
    customerId: string,
    storeId: string,
  ): Promise<{ customerId: string; storeId: string; jti: string; type: 'refresh' }> {
    await authService.revokeRefreshToken(redis, 'customer', customerId, oldJti);
    const jti = crypto.randomUUID();
    await authService.storeRefreshToken(redis, 'customer', customerId, jti);
    return { customerId, storeId, jti, type: 'refresh' as const };
  },

  /** Rotate admin refresh token: revoke old, issue new, store in Redis */
  async refreshAdminToken(
    redis: RedisClientType,
    oldJti: string,
    adminId: string,
    role: string,
  ): Promise<{ superAdminId: string; role: string; jti: string; type: 'refresh' }> {
    await authService.revokeRefreshToken(redis, 'admin', adminId, oldJti);
    const jti = crypto.randomUUID();
    await authService.storeRefreshToken(redis, 'admin', adminId, jti);
    return { superAdminId: adminId, role, jti, type: 'refresh' as const };
  },

  // ─── MFA (email-based) ───

  buildMfaKey(scope: string, userId: string): string {
    return `mfa:${scope}:${userId}`;
  },

  async generateMfaCode(
    redis: RedisClientType,
    scope: string,
    userId: string,
  ): Promise<string> {
    // randomInt is cryptographically secure (uses node:crypto under the hood)
    // and uniformly distributed across the 8-digit code space (10^8 codes).
    const min = 10 ** (MFA_CODE_LENGTH - 1);
    const max = 10 ** MFA_CODE_LENGTH;
    const code = randomInt(min, max).toString();
    const key = authService.buildMfaKey(scope, userId);
    // SEC-002: store the HMAC-SHA256 of the code, not the code itself, so a
    // Redis dump/compromise does not directly leak valid MFA codes.
    await redis.setex(key, 300, hashMfaCode(code)); // 5 minutes TTL
    return code;
  },

  async verifyMfaCode(
    redis: RedisClientType,
    scope: string,
    userId: string,
    code: string,
  ): Promise<boolean> {
    const key = authService.buildMfaKey(scope, userId);
    const stored = await redis.get(key);
    if (!stored) {
      return false;
    }
    // SEC-002: compare HMACs. The stored value is the HMAC of the original
    // code; we recompute the HMAC of the submitted code and use
    // timingSafeEqual so we don't leak match/mismatch via timing.
    const storedBuf = Buffer.from(stored, 'utf8');
    const submittedBuf = Buffer.from(hashMfaCode(code), 'utf8');
    if (storedBuf.length !== submittedBuf.length) {
      return false;
    }
    const match = timingSafeEqual(storedBuf, submittedBuf);
    if (!match) {
      return false;
    }
    // Code valid — delete it (single-use)
    await redis.del(key);
    return true;
  },

  async enableMerchantMfa(userId: string): Promise<void> {
    await authRepo.updateUserMfaStatus(userId, true);
  },

  async disableMerchantMfa(userId: string): Promise<void> {
    await authRepo.updateUserMfaStatus(userId, false);
  },

  async enableCustomerMfa(customerId: string): Promise<void> {
    await authRepo.updateCustomerMfaStatus(customerId, true);
  },

  async disableCustomerMfa(customerId: string): Promise<void> {
    await authRepo.updateCustomerMfaStatus(customerId, false);
  },

  async enableSuperAdminMfa(adminId: string): Promise<void> {
    await authRepo.updateSuperAdminMfaStatus(adminId, true);
  },

  async disableSuperAdminMfa(adminId: string): Promise<void> {
    await authRepo.updateSuperAdminMfaStatus(adminId, false);
  },
};
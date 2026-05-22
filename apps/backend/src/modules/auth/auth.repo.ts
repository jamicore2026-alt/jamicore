// Auth repository — all Drizzle queries for auth, authReset, and profile lookups
// NO business logic, NO ErrorCodes, NO domain error throwing
import { db } from '../../db/index.js';
import {
  users,
  customers,
  superAdmins,
  stores,
  verificationTokens,
} from '../../db/schema.js';
import { eq, and, gt, isNull } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';
import { createRedisClient } from '../../lib/redis.js';
import { env } from '../../config/env.js';

type DbExecutor = DbOrTx;

export const authRepo = {
  // ─── Merchant (user) queries ───

  async findUserByEmail(email: string, tx?: DbExecutor): Promise<typeof users.$inferSelect | undefined> {
    const executor = tx ?? db;
    return executor.query.users.findFirst({
      where: eq(users.email, email),
    });
  },

  async findUserById(userId: string, tx?: DbExecutor): Promise<typeof users.$inferSelect | undefined> {
    const executor = tx ?? db;
    return executor.query.users.findFirst({
      where: eq(users.id, userId),
    });
  },

  async createUser(data: typeof users.$inferInsert, tx?: DbExecutor): Promise<typeof users.$inferSelect> {
    const executor = tx ?? db;
    const [user] = await executor.insert(users).values(data).returning();
    return user;
  },

  // ─── Store queries (for registration) ───

  async findStoreByOwnerEmail(ownerEmail: string, tx?: DbExecutor): Promise<typeof stores.$inferSelect | undefined> {
    const executor = tx ?? db;
    return executor.query.stores.findFirst({
      where: eq(stores.ownerEmail, ownerEmail),
    });
  },

  async findStoreByDomain(domain: string, tx?: DbExecutor): Promise<typeof stores.$inferSelect | undefined> {
    const executor = tx ?? db;
    return executor.query.stores.findFirst({
      where: eq(stores.domain, domain),
    });
  },

  async createStore(data: typeof stores.$inferInsert, tx?: DbExecutor): Promise<typeof stores.$inferSelect> {
    const executor = tx ?? db;
    const [store] = await executor.insert(stores).values(data).returning();
    return store;
  },

  // ─── Customer queries ───

  async findCustomerByEmailAndStoreId(email: string, storeId: string, tx?: DbExecutor): Promise<typeof customers.$inferSelect | undefined> {
    const executor = tx ?? db;
    return executor.query.customers.findFirst({
      where: (c, { eq, and }) => and(
        eq(c.email, email),
        eq(c.storeId, storeId),
      ),
    });
  },

  async findCustomerById(customerId: string, tx?: DbExecutor): Promise<Pick<typeof customers.$inferSelect, 'id' | 'email' | 'firstName' | 'lastName' | 'phone' | 'storeId' | 'isVerified' | 'marketingEmails' | 'createdAt' | 'updatedAt'> | undefined> {
    const executor = tx ?? db;
    return executor.query.customers.findFirst({
      where: eq(customers.id, customerId),
      columns: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        storeId: true,
        isVerified: true,
        marketingEmails: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async findCustomerByEmailAndStoreIdForResetCheck(email: string, storeId: string, tx?: DbExecutor): Promise<Pick<typeof customers.$inferSelect, 'isVerified'> | undefined> {
    const executor = tx ?? db;
    return executor.query.customers.findFirst({
      where: (c, { eq, and }) => and(
        eq(c.email, email),
        eq(c.storeId, storeId),
      ),
      columns: { isVerified: true },
    });
  },

  async createCustomer(data: typeof customers.$inferInsert, tx?: DbExecutor): Promise<typeof customers.$inferSelect> {
    const executor = tx ?? db;
    const [customer] = await executor.insert(customers).values(data).returning();
    return customer;
  },

  async updateCustomerPassword(email: string, storeId: string, password: string, tx?: DbExecutor): Promise<void> {
    const executor = tx ?? db;
    await executor.update(customers)
      .set({ password, updatedAt: new Date() })
      .where(and(eq(customers.email, email), eq(customers.storeId, storeId)));
  },

  async updateCustomerVerified(email: string, storeId: string, tx?: DbExecutor): Promise<typeof customers.$inferSelect[]> {
    const executor = tx ?? db;
    return executor.update(customers)
      .set({ isVerified: true })
      .where(and(eq(customers.email, email), eq(customers.storeId, storeId)))
      .returning();
  },

  async updateMerchantPassword(email: string, password: string, tx?: DbExecutor): Promise<void> {
    const executor = tx ?? db;
    await executor.update(users)
      .set({ password, updatedAt: new Date() })
      .where(eq(users.email, email));
  },

  // ─── SuperAdmin queries ───

  async findSuperAdminByEmail(email: string, tx?: DbExecutor): Promise<typeof superAdmins.$inferSelect | undefined> {
    const executor = tx ?? db;
    return executor.query.superAdmins.findFirst({
      where: eq(superAdmins.email, email),
    });
  },

  async findSuperAdminById(adminId: string, tx?: DbExecutor): Promise<typeof superAdmins.$inferSelect | undefined> {
    const executor = tx ?? db;
    return executor.query.superAdmins.findFirst({
      where: eq(superAdmins.id, adminId),
    });
  },

  async updateSuperAdminLastLogin(adminId: string, tx?: DbExecutor): Promise<void> {
    const executor = tx ?? db;
    await executor.update(superAdmins)
      .set({ lastLoginAt: new Date() })
      .where(eq(superAdmins.id, adminId));
  },

  async updateSuperAdminPassword(adminId: string, password: string, tx?: DbExecutor): Promise<void> {
    const executor = tx ?? db;
    await executor.update(superAdmins)
      .set({ password, updatedAt: new Date() })
      .where(eq(superAdmins.id, adminId));
  },

  async updateUserMfaStatus(userId: string, enabled: boolean, tx?: DbExecutor): Promise<void> {
    const executor = tx ?? db;
    await executor.update(users)
      .set({ mfaEnabled: enabled, updatedAt: new Date() })
      .where(eq(users.id, userId));
  },

  async updateCustomerMfaStatus(customerId: string, enabled: boolean, tx?: DbExecutor): Promise<void> {
    const executor = tx ?? db;
    await executor.update(customers)
      .set({ mfaEnabled: enabled, updatedAt: new Date() })
      .where(eq(customers.id, customerId));
  },

  async updateSuperAdminMfaStatus(adminId: string, enabled: boolean, tx?: DbExecutor): Promise<void> {
    const executor = tx ?? db;
    await executor.update(superAdmins)
      .set({ mfaEnabled: enabled, updatedAt: new Date() })
      .where(eq(superAdmins.id, adminId));
  },

  // ─── Verification token queries ───

  async deleteVerificationTokensByEmailTypeUserType(
    email: string,
    type: string,
    userType: string,
    tx?: DbExecutor,
  ): Promise<void> {
    const executor = tx ?? db;
    await executor.delete(verificationTokens).where(
      and(
        eq(verificationTokens.email, email),
        eq(verificationTokens.type, type),
        eq(verificationTokens.userType, userType),
      ),
    );
  },

  async createVerificationToken(data: typeof verificationTokens.$inferInsert, tx?: DbExecutor): Promise<typeof verificationTokens.$inferSelect> {
    const executor = tx ?? db;
    const [record] = await executor.insert(verificationTokens).values(data).returning();
    return record;
  },

  async findVerificationToken(token: string, type: string, tx?: DbExecutor): Promise<typeof verificationTokens.$inferSelect | undefined> {
    const executor = tx ?? db;
    return executor.query.verificationTokens.findFirst({
      where: and(
        eq(verificationTokens.token, token),
        eq(verificationTokens.type, type),
        gt(verificationTokens.expiresAt, new Date()),
        isNull(verificationTokens.usedAt),
      ),
    });
  },

  async markTokenUsed(tokenId: string, tx?: DbExecutor): Promise<typeof verificationTokens.$inferSelect[]> {
    const executor = tx ?? db;
    return executor.update(verificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(verificationTokens.id, tokenId))
      .returning();
  },

  async revokeAllUserTokens(userId: string): Promise<void> {
    const redis = createRedisClient(env.REDIS_URL);
    try {
      const pattern = `refresh:*:${userId}:*`;
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== '0');
    } finally {
      await redis.quit();
    }
  },
};
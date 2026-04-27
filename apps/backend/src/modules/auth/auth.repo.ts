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

type DbExecutor = typeof db;

export const authRepo = {
  // ─── Merchant (user) queries ───

  async findUserByEmail(email: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.users.findFirst({
      where: eq(users.email, email),
    });
  },

  async findUserById(userId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.users.findFirst({
      where: eq(users.id, userId),
    });
  },

  async createUser(data: typeof users.$inferInsert, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [user] = await executor.insert(users).values(data).returning();
    return user;
  },

  // ─── Store queries (for registration) ───

  async findStoreByOwnerEmail(ownerEmail: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.stores.findFirst({
      where: eq(stores.ownerEmail, ownerEmail),
    });
  },

  async findStoreByDomain(domain: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.stores.findFirst({
      where: eq(stores.domain, domain),
    });
  },

  async createStore(data: typeof stores.$inferInsert, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [store] = await executor.insert(stores).values(data).returning();
    return store;
  },

  // ─── Customer queries ───

  async findCustomerByEmailAndStoreId(email: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.customers.findFirst({
      where: (c, { eq, and }) => and(
        eq(c.email, email),
        eq(c.storeId, storeId),
      ),
    });
  },

  async findCustomerById(customerId: string, tx?: DbExecutor) {
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

  async findCustomerByEmailAndStoreIdForResetCheck(email: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.customers.findFirst({
      where: (c, { eq, and }) => and(
        eq(c.email, email),
        eq(c.storeId, storeId),
      ),
      columns: { isVerified: true },
    });
  },

  async createCustomer(data: typeof customers.$inferInsert, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [customer] = await executor.insert(customers).values(data).returning();
    return customer;
  },

  async updateCustomerPassword(email: string, storeId: string, password: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.update(customers)
      .set({ password, updatedAt: new Date() })
      .where(and(eq(customers.email, email), eq(customers.storeId, storeId)));
  },

  async updateCustomerVerified(email: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.update(customers)
      .set({ isVerified: true })
      .where(and(eq(customers.email, email), eq(customers.storeId, storeId)))
      .returning();
  },

  async updateMerchantPassword(email: string, password: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.update(users)
      .set({ password, updatedAt: new Date() })
      .where(eq(users.email, email));
  },

  // ─── SuperAdmin queries ───

  async findSuperAdminByEmail(email: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.superAdmins.findFirst({
      where: eq(superAdmins.email, email),
    });
  },

  async findSuperAdminById(adminId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.superAdmins.findFirst({
      where: eq(superAdmins.id, adminId),
    });
  },

  async updateSuperAdminLastLogin(adminId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.update(superAdmins)
      .set({ lastLoginAt: new Date() })
      .where(eq(superAdmins.id, adminId));
  },

  async updateSuperAdminPassword(adminId: string, password: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.update(superAdmins)
      .set({ password, updatedAt: new Date() })
      .where(eq(superAdmins.id, adminId));
  },

  // ─── Verification token queries ───

  async deleteVerificationTokensByEmailTypeUserType(
    email: string,
    type: string,
    userType: string,
    tx?: DbExecutor,
  ) {
    const executor = tx ?? db;
    return executor.delete(verificationTokens).where(
      and(
        eq(verificationTokens.email, email),
        eq(verificationTokens.type, type),
        eq(verificationTokens.userType, userType),
      ),
    );
  },

  async createVerificationToken(data: typeof verificationTokens.$inferInsert, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [record] = await executor.insert(verificationTokens).values(data).returning();
    return record;
  },

  async findVerificationToken(token: string, type: string, tx?: DbExecutor) {
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

  async markTokenUsed(tokenId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.update(verificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(verificationTokens.id, tokenId));
  },
};
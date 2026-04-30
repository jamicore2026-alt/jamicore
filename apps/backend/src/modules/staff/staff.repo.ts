// Staff repository — Drizzle queries only, no business logic
import { db } from '../../db/index.js';
import { users, staffInvitations, rolePermissions } from '../../db/schema.js';
import { eq, and, gt, ne } from 'drizzle-orm';

type DbExecutor = typeof db;

export const staffRepo = {
  async findUserByEmail(email: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.users.findFirst({
      where: and(eq(users.email, email), eq(users.storeId, storeId)),
    });
  },

  async findPendingInvitation(email: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.staffInvitations.findFirst({
      where: and(
        eq(staffInvitations.email, email),
        eq(staffInvitations.storeId, storeId),
        eq(staffInvitations.status, 'pending'),
        gt(staffInvitations.expiresAt, new Date()),
      ),
    });
  },

  async insertInvitation(data: typeof staffInvitations.$inferInsert, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [invitation] = await executor.insert(staffInvitations).values(data).returning();
    return invitation;
  },

  async findInvitationByToken(token: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.staffInvitations.findFirst({
      where: and(
        eq(staffInvitations.token, token),
        eq(staffInvitations.status, 'pending'),
        gt(staffInvitations.expiresAt, new Date()),
      ),
    });
  },

  async findInvitationByTokenPending(token: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.staffInvitations.findFirst({
      where: and(
        eq(staffInvitations.token, token),
        eq(staffInvitations.status, 'pending'),
      ),
    });
  },

  async insertUser(data: typeof users.$inferInsert, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [user] = await executor.insert(users).values(data).returning();
    return user;
  },

  async updateInvitationStatus(
    invitationId: string,
    status: string,
    data: Partial<typeof staffInvitations.$inferInsert>,
    tx?: DbExecutor,
  ) {
    const executor = tx ?? db;
    await executor.update(staffInvitations)
      .set({ status, ...data })
      .where(eq(staffInvitations.id, invitationId));
  },

  async listStaff(storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.users.findMany({
      where: and(eq(users.storeId, storeId), ne(users.role, 'OWNER')),
      columns: { id: true, email: true, role: true, storeId: true, createdAt: true },
    });
  },

  async listInvitations(storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.staffInvitations.findMany({
      where: and(
        eq(staffInvitations.storeId, storeId),
        eq(staffInvitations.status, 'pending'),
        gt(staffInvitations.expiresAt, new Date()),
      ),
    });
  },

  async findUserById(userId: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.storeId, storeId)),
    });
  },

  async updateUserRole(userId: string, storeId: string, role: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [updated] = await executor.update(users)
      .set({ role, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.storeId, storeId)))
      .returning();
    return updated;
  },

  async deleteUser(userId: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    await executor.delete(users).where(and(eq(users.id, userId), eq(users.storeId, storeId)));
  },

  async findRoleOverride(storeId: string, role: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.rolePermissions.findFirst({
      where: and(eq(rolePermissions.storeId, storeId), eq(rolePermissions.role, role)),
    });
  },
};
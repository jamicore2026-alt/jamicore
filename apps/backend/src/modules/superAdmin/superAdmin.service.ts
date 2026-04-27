// SuperAdmin service â€” business logic and domain errors.
// Calls superAdminRepo for all DB operations.
import { ErrorCodes } from '../../errors/codes.js';
import { superAdminRepo } from './superAdmin.repo.js';
import { authService } from '../auth/auth.service.js';
import { currencyService } from '../currency/currency.service.js';
import type { RegisterMerchantData } from '../auth/auth.types.js';

export const superAdminService = {
  // â”€â”€â”€ Store management â”€â”€â”€

  async listStores(opts?: { page?: number; limit?: number; status?: string; search?: string }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const { data, total } = await superAdminRepo.findStores({ page, limit, status: opts?.status, search: opts?.search });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getStore(storeId: string) {
    const store = await superAdminRepo.findStoreById(storeId);

    if (!store) {
      throw Object.assign(new Error('Store not found'), {
        code: ErrorCodes.STORE_NOT_FOUND,
      });
    }

    return store;
  },

  async approveStore(storeId: string, adminId: string) {
    const store = await superAdminRepo.findStoreById(storeId);

    if (!store) {
      throw Object.assign(new Error('Store not found'), {
        code: ErrorCodes.STORE_NOT_FOUND,
      });
    }

    if (store.status === 'active') {
      throw Object.assign(new Error('Store is already active'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    const trialStartedAt = new Date();
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await currencyService.seedDefaultRates();

    return superAdminRepo.updateStore(storeId, {
      status: 'active',
      isApproved: true,
      approvedAt: new Date(),
      approvedBy: adminId,
      trialStartedAt,
      trialEndsAt,
      planExpiresAt: trialEndsAt,
    });
  },

  async suspendStore(storeId: string) {
    const store = await superAdminRepo.findStoreById(storeId);

    if (!store) {
      throw Object.assign(new Error('Store not found'), {
        code: ErrorCodes.STORE_NOT_FOUND,
      });
    }

    return superAdminRepo.updateStore(storeId, {
      status: 'suspended',
    });
  },

  async reactivateStore(storeId: string) {
    const store = await superAdminRepo.findStoreById(storeId);

    if (!store) {
      throw Object.assign(new Error('Store not found'), {
        code: ErrorCodes.STORE_NOT_FOUND,
      });
    }

    return superAdminRepo.updateStore(storeId, {
      status: 'active',
    });
  },

  async createMerchant(data: RegisterMerchantData) {
    const { store, user } = await authService.registerMerchant(data);

    // Auto-approve store created by super admin
    await superAdminRepo.updateStore(store.id, {
      status: 'active',
      isApproved: true,
      approvedAt: new Date(),
    });

    return { store, user };
  },

  // â”€â”€â”€ Plan management â”€â”€â”€

  async listPlans() {
    return superAdminRepo.findPlans();
  },

  async getPlan(planId: string) {
    const plan = await superAdminRepo.findPlanById(planId);

    if (!plan) {
      throw Object.assign(new Error('Plan not found'), {
        code: ErrorCodes.PLAN_NOT_FOUND,
      });
    }

    return plan;
  },

  async createPlan(data: typeof import('../../db/schema.js').merchantPlans.$inferInsert) {
    return superAdminRepo.insertPlan(data);
  },

  async updatePlan(planId: string, data: Partial<typeof import('../../db/schema.js').merchantPlans.$inferInsert>) {
    const plan = await superAdminRepo.findPlanById(planId);

    if (!plan) {
      throw Object.assign(new Error('Plan not found'), {
        code: ErrorCodes.PLAN_NOT_FOUND,
      });
    }

    return superAdminRepo.updatePlan(planId, data);
  },

  async deletePlan(planId: string) {
    const plan = await superAdminRepo.findPlanById(planId);

    if (!plan) {
      throw Object.assign(new Error('Plan not found'), {
        code: ErrorCodes.PLAN_NOT_FOUND,
      });
    }

    await superAdminRepo.deletePlan(planId);
    return { id: planId, deleted: true };
  },

  // â”€â”€â”€ Dashboard stats â”€â”€â”€

  async getPlatformStats() {
    const [totalStores, activeStores, pendingStores, suspendedStores, totalPlans, recentStores, storesByStatus] = await Promise.all([
      superAdminRepo.countStores(),
      superAdminRepo.countActiveStores(),
      superAdminRepo.countPendingStores(),
      superAdminRepo.countSuspendedStores(),
      superAdminRepo.countPlans(),
      superAdminRepo.findRecentStores(5),
      superAdminRepo.countStoresByStatus(),
    ]);

    return {
      totalStores,
      activeStores,
      pendingStores,
      suspendedStores,
      totalPlans,
      recentStores,
      storesByStatus: storesByStatus.reduce((acc, { status, count }) => {
        acc[status] = count;
        return acc;
      }, {} as Record<string, number>),
    };
  },

  async getRevenueStats() {
    const [summary, byStore, recent] = await Promise.all([
      superAdminRepo.getRevenueSummary(),
      superAdminRepo.getRevenueByStore(),
      superAdminRepo.getRecentRevenue(30),
    ]);

    return {
      summary,
      byStore: byStore.map((s: any) => ({
        storeId: s.storeId,
        storeName: s.storeName,
        revenue: Number(s.revenue),
        orderCount: Number(s.orderCount),
      })),
      daily: recent.map((r: any) => ({
        date: r.date,
        revenue: Number(r.revenue),
        orders: Number(r.orders),
      })),
    };
  },

  async listActivityLogs(opts: { page: number; limit: number; entityType?: string; action?: string }) {
    return superAdminRepo.findActivityLogs(opts);
  },

  // â”€â”€â”€ Support Ticket Services â”€â”€â”€

  async listTickets(opts: { page: number; limit: number; status?: string; priority?: string }) {
    return superAdminRepo.findTickets(opts);
  },

  async getTicket(ticketId: string) {
    const ticket = await superAdminRepo.findTicketById(ticketId);
    if (!ticket) {
      throw Object.assign(new Error('Ticket not found'), { code: ErrorCodes.NOT_FOUND });
    }
    return ticket;
  },

  async createTicket(data: { storeId: string; subject: string; description: string; priority: string }) {
    return superAdminRepo.insertTicket({
      storeId: data.storeId,
      subject: data.subject,
      description: data.description,
      priority: data.priority,
      status: 'open',
    });
  },

  async updateTicket(ticketId: string, data: { status?: string; priority?: string; assignedTo?: string | null }) {
    const ticket = await superAdminRepo.findTicketById(ticketId);
    if (!ticket) {
      throw Object.assign(new Error('Ticket not found'), { code: ErrorCodes.NOT_FOUND });
    }
    return superAdminRepo.updateTicket(ticketId, data);
  },

  async replyToTicket(ticketId: string, authorId: string, authorType: string, message: string) {
    const ticket = await superAdminRepo.findTicketById(ticketId);
    if (!ticket) {
      throw Object.assign(new Error('Ticket not found'), { code: ErrorCodes.NOT_FOUND });
    }
    const reply = await superAdminRepo.insertTicketReply({
      ticketId,
      authorId,
      authorType,
      message,
    });
    // Update ticket status to in_progress if open
    if (ticket.status === 'open') {
      await superAdminRepo.updateTicket(ticketId, { status: 'in_progress' });
    }
    return reply;
  },

  // â”€â”€â”€ Platform Settings Services â”€â”€â”€

  async listSettings() {
    return superAdminRepo.findSettings();
  },

  async getSetting(key: string) {
    return superAdminRepo.findSettingByKey(key);
  },

  async upsertSetting(key: string, value: string, type: string, updatedBy: string) {
    return superAdminRepo.upsertSetting(key, value, type, updatedBy);
  },

  // â”€â”€â”€ Invoice Services â”€â”€â”€

  async listInvoices(opts: { page: number; limit: number; status?: string; storeId?: string }) {
    return superAdminRepo.findInvoices(opts);
  },

  async getInvoice(id: string) {
    const invoice = await superAdminRepo.findInvoiceById(id);
    if (!invoice) {
      throw Object.assign(new Error('Invoice not found'), { code: ErrorCodes.NOT_FOUND });
    }
    return invoice;
  },

  async createInvoice(data: { storeId: string; planId?: string; amount: string; periodStart?: Date; periodEnd?: Date; notes?: string }) {
    return superAdminRepo.insertInvoice({
      storeId: data.storeId,
      planId: data.planId,
      amount: data.amount,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      notes: data.notes,
      status: 'pending',
    });
  },

  async updateInvoice(id: string, data: { status?: string; notes?: string | null }) {
    const invoice = await superAdminRepo.findInvoiceById(id);
    if (!invoice) {
      throw Object.assign(new Error('Invoice not found'), { code: ErrorCodes.NOT_FOUND });
    }
    return superAdminRepo.updateInvoice(id, data);
  },

  // â”€â”€â”€ Notification Services â”€â”€â”€

  async listNotifications(opts: { page: number; limit: number; unreadOnly?: boolean }) {
    return superAdminRepo.findNotifications(opts);
  },

  async createNotification(data: { type: string; title: string; body: string; targetScope?: string; targetStoreId?: string }) {
    return superAdminRepo.insertNotification({
      type: data.type,
      title: data.title,
      body: data.body,
      targetScope: data.targetScope || 'all',
      targetStoreId: data.targetStoreId,
    });
  },

  async markNotificationRead(id: string) {
    const notification = await superAdminRepo.findNotificationById(id);
    if (!notification) {
      throw Object.assign(new Error('Notification not found'), { code: ErrorCodes.NOT_FOUND });
    }
    return superAdminRepo.markNotificationRead(id);
  },

  async markAllNotificationsRead() {
    return superAdminRepo.markAllNotificationsRead();
  },

  async getUnreadNotificationCount() {
    return superAdminRepo.countUnreadNotifications();
  },

  // â”€â”€â”€ Custom Domain Services â”€â”€â”€

  async listCustomDomains(opts: { page: number; limit: number; verified?: boolean }) {
    return superAdminRepo.findStoresWithCustomDomains(opts);
  },

  async verifyCustomDomain(storeId: string) {
    const store = await superAdminRepo.findStoreById(storeId);
    if (!store) {
      throw Object.assign(new Error('Store not found'), { code: ErrorCodes.STORE_NOT_FOUND });
    }
    if (!store.customDomain) {
      throw Object.assign(new Error('Store has no custom domain'), { code: ErrorCodes.VALIDATION_ERROR });
    }
    return superAdminRepo.verifyCustomDomain(storeId);
  },

  async rejectCustomDomain(storeId: string) {
    const store = await superAdminRepo.findStoreById(storeId);
    if (!store) {
      throw Object.assign(new Error('Store not found'), { code: ErrorCodes.STORE_NOT_FOUND });
    }
    return superAdminRepo.rejectCustomDomain(storeId);
  },

  // â”€â”€â”€ Staff Management Services â”€â”€â”€

  async listAllStaff(opts: { page: number; limit: number; storeId?: string; role?: string }) {
    return superAdminRepo.findAllStaff(opts);
  },

  async listAllInvitations(opts: { page: number; limit: number; storeId?: string; status?: string }) {
    return superAdminRepo.findAllInvitations(opts);
  },

  async removeStaff(userId: string) {
    const user = await superAdminRepo.findUserById(userId);
    if (!user) {
      throw Object.assign(new Error('User not found'), { code: ErrorCodes.NOT_FOUND });
    }
    if (user.role === 'OWNER') {
      throw Object.assign(new Error('Cannot remove store owner'), { code: ErrorCodes.CANNOT_REMOVE_OWNER });
    }
    return superAdminRepo.deleteStaff(userId);
  },

  async revokeInvitation(invitationId: string) {
    const invitation = await superAdminRepo.findInvitationById(invitationId);
    if (!invitation) {
      throw Object.assign(new Error('Invitation not found'), { code: ErrorCodes.NOT_FOUND });
    }
    return superAdminRepo.revokeInvitation(invitationId);
  },
};



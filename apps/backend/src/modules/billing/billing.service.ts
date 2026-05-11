// Merchant Billing service — business logic for plan upgrades and billing summary
import { ErrorCodes } from '../../errors/codes.js';
import { billingRepo } from './billing.repo.js';
import { planLimitsService } from '../plan-limits/plan-limits.service.js';
import { db } from '../../db/index.js';

export const billingService = {
  async getBillingSummary(storeId: string) {
    const store = await billingRepo.findStoreWithPlan(storeId);
    if (!store) {
      throw Object.assign(new Error('Store not found'), { code: ErrorCodes.STORE_NOT_FOUND });
    }

    const usage = await planLimitsService.getPlanLimits(storeId);
    const { data: invoices } = await billingRepo.findInvoicesByStore(storeId, 1, 5);
    const plans = await billingRepo.findActivePlans();

    return {
      store: {
        id: store.id,
        name: store.name,
        planId: store.planId,
        planExpiresAt: store.planExpiresAt,
        trialEndsAt: store.trialEndsAt,
        usedStorage: store.usedStorage,
      },
      plan: store.plan,
      usage,
      invoices,
      plans,
    };
  },

  async listInvoices(storeId: string, page: number, limit: number) {
    const { data, total } = await billingRepo.findInvoicesByStore(storeId, page, limit);
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

  async upgradePlan(storeId: string, newPlanId: string) {
    const store = await billingRepo.findStoreWithPlan(storeId);
    if (!store) {
      throw Object.assign(new Error('Store not found'), { code: ErrorCodes.STORE_NOT_FOUND });
    }

    if (store.planId === newPlanId) {
      throw Object.assign(new Error('Already subscribed to this plan'), { code: ErrorCodes.ALREADY_ON_PLAN });
    }

    const newPlan = await billingRepo.findPlanById(newPlanId);
    if (!newPlan) {
      throw Object.assign(new Error('Plan not found'), { code: ErrorCodes.PLAN_NOT_FOUND });
    }
    if (!newPlan.isActive) {
      throw Object.assign(new Error('Plan is not active'), { code: ErrorCodes.UPGRADE_NOT_ALLOWED });
    }

    // Calculate new expiry based on plan interval
    const now = new Date();
    const planExpiresAt = new Date(now);
    if (newPlan.interval === 'year') {
      planExpiresAt.setFullYear(planExpiresAt.getFullYear() + 1);
    } else {
      planExpiresAt.setMonth(planExpiresAt.getMonth() + 1);
    }

    try {
      return await db.transaction(async (tx) => {
        // Update store plan
        const updatedStore = await billingRepo.updateStorePlan(
          storeId,
          { planId: newPlanId, planExpiresAt },
          tx,
        );

        // Create invoice for the new plan
        const invoice = await billingRepo.insertInvoice(
          {
            storeId,
            planId: newPlanId,
            amount: String(newPlan.price ?? '0'),
            status: 'pending',
            periodStart: now,
            periodEnd: planExpiresAt,
            notes: `Plan upgrade to ${newPlan.name ?? 'Unknown'}`,
          },
          tx,
        );

        return { store: updatedStore, invoice };
      });
    } catch (err) {
      // Re-throw service-layer errors (they have .code)
      if (err instanceof Error && 'code' in err) throw err;
      // Wrap unknown DB errors so the error handler can serialize them
      throw Object.assign(
        new Error(err instanceof Error ? err.message : String(err)),
        { code: ErrorCodes.UPGRADE_NOT_ALLOWED },
      );
    }
  },
};

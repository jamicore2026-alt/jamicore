// SuperAdmin Zod schemas — Phase 1
import { z } from 'zod';
import { idParamSchema } from '../_shared/schema.js';

export { idParamSchema };

export const merchantListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'active', 'suspended']).optional(),
  search: z.string().max(100).optional(),
});

export const createPlanSchema = z.strictObject({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
  currency: z.string().max(3).default('USD'),
  interval: z.enum(['month', 'year']).default('month'),
  features: z.array(z.string()).optional(),
  maxProducts: z.number().int().min(1).default(100),
  maxStorage: z.number().int().min(1).default(1024),
  isActive: z.boolean().default(true),
});

export const updatePlanSchema = z.strictObject({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currency: z.string().max(3).optional(),
  interval: z.enum(['month', 'year']).optional(),
  features: z.array(z.string()).nullable().optional(),
  maxProducts: z.number().int().min(1).optional(),
  maxStorage: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

// ─── Support Ticket Schemas ───

export const ticketListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

export const createTicketSchema = z.strictObject({
  storeId: z.string().uuid(),
  subject: z.string().min(1).max(255),
  description: z.string().min(1).max(5000),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

export const updateTicketSchema = z.strictObject({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
});

export const createTicketReplySchema = z.strictObject({
  message: z.string().min(1).max(5000),
});

// ─── Platform Settings Schemas ───

export const platformSettingSchema = z.strictObject({
  key: z.string().min(1).max(100),
  value: z.string().min(0).max(5000),
  type: z.enum(['string', 'number', 'boolean', 'json']).default('string'),
});

// ─── Invoice Schemas ───

export const invoiceListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
  storeId: z.string().uuid().optional(),
});

export const createInvoiceSchema = z.strictObject({
  storeId: z.string().uuid(),
  planId: z.string().uuid().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

export const updateInvoiceSchema = z.strictObject({
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
  notes: z.string().max(1000).nullable().optional(),
});

// ─── Notification Schemas ───

export const notificationListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().default(false),
});

export const createNotificationSchema = z.strictObject({
  type: z.string().min(1).max(50),
  title: z.string().min(1).max(255),
  body: z.string().min(1).max(2000),
  targetScope: z.enum(['all', 'store']).optional().default('all'),
  targetStoreId: z.string().uuid().optional(),
});

// ─── Custom Domain Schemas ───

export const customDomainListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  verified: z.coerce.boolean().optional(),
});

// ─── Staff Management Schemas ───

export const staffListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  storeId: z.string().uuid().optional(),
  role: z.enum(['MANAGER', 'CASHIER']).optional(),
});

export const invitationListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  storeId: z.string().uuid().optional(),
  status: z.enum(['pending', 'accepted', 'rejected', 'expired', 'revoked']).optional(),
});

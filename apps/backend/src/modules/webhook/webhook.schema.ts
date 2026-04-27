// Webhook Zod schemas
import { z } from 'zod';

export const webhookEventEnum = z.enum([
  'order.created',
  'order.paid',
  'order.cancelled',
  'customer.created',
  'product.created',
  'product.updated',
  'product.deleted',
]);

export const createWebhookSchema = z.strictObject({
  url: z.string().url(),
  events: z.array(webhookEventEnum).min(1),
  secret: z.string().min(16).optional(),
});

export const updateWebhookSchema = z.strictObject({
  url: z.string().url().optional(),
  events: z.array(webhookEventEnum).optional(),
  secret: z.string().min(16).optional(),
  isActive: z.boolean().optional(),
});

export const idParamSchema = z.strictObject({
  id: z.string().uuid(),
});
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

// P1-S2: restrict to http(s); deeper SSRF/host-resolution checks happen in
// webhookService via assertSafeWebhookUrl.
const webhookUrl = z.string().url().regex(/^https?:\/\//i, 'Webhook URL must use http or https');

export const createWebhookSchema = z.strictObject({
  url: webhookUrl,
  events: z.array(webhookEventEnum).min(1),
  secret: z.string().min(16).optional(),
});

export const updateWebhookSchema = z.strictObject({
  url: webhookUrl.optional(),
  events: z.array(webhookEventEnum).optional(),
  secret: z.string().min(16).optional(),
  isActive: z.boolean().optional(),
});

export const idParamSchema = z.strictObject({
  id: z.string().uuid(),
});
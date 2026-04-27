// Webhook Service — business logic and delivery
import crypto from 'node:crypto';
import { webhookRepo } from './webhook.repo.js';
import { ErrorCodes } from '../../errors/codes.js';

export const webhookService = {
  async getWebhooks(storeId: string) {
    return webhookRepo.findByStoreId(storeId);
  },

  async getWebhook(id: string) {
    const webhook = await webhookRepo.findById(id);
    if (!webhook) {
      throw Object.assign(new Error('Webhook not found'), { code: ErrorCodes.NOT_FOUND });
    }
    return webhook;
  },

  async createWebhook(storeId: string, data: { url: string; events: string[]; secret?: string }) {
    const secret = data.secret || crypto.randomBytes(32).toString('hex');
    return webhookRepo.create({
      storeId,
      url: data.url,
      events: data.events,
      secret,
      isActive: true,
    });
  },

  async updateWebhook(id: string, data: Partial<{ url: string; events: string[]; secret: string; isActive: boolean }>) {
    return webhookRepo.update(id, data);
  },

  async deleteWebhook(id: string) {
    return webhookRepo.delete(id);
  },

  async findActiveForEvent(storeId: string, event: string) {
    const all = await webhookRepo.findActiveByEvent(storeId, event);
    return all.filter((w) => w.events.includes(event));
  },

  async dispatchWebhook(event: string, payload: Record<string, unknown>, storeId: string) {
    const webhooks = await this.findActiveForEvent(storeId, event);
    if (webhooks.length === 0) return;

    for (const hook of webhooks) {
      try {
        await this.deliverWebhook(hook, event, payload);
      } catch {
        // Failures are tracked in deliverWebhook; fire-and-forget here
      }
    }
  },

  async deliverWebhook(
    hook: { id: string; url: string; secret: string; storeId: string; failureCount: number | null },
    event: string,
    payload: Record<string, unknown>,
  ) {
    const body = JSON.stringify({
      event,
      timestamp: Date.now(),
      data: payload,
    });

    const signature = crypto
      .createHmac('sha256', hook.secret)
      .update(body)
      .digest('hex');

    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let status: 'delivered' | 'failed' = 'failed';

    try {
      const response = await fetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'User-Agent': 'SaaS-Ecom-Webhook/1.0',
        },
        body,
        signal: AbortSignal.timeout(30000),
      });

      responseStatus = response.status;
      responseBody = await response.text();

      if (response.ok) {
        status = 'delivered';
      }
    } catch (err) {
      responseBody = err instanceof Error ? err.message : 'Network error';
    }

    // Persist delivery record
    await webhookRepo.createDelivery({
      webhookId: hook.id,
      event,
      payload: body,
      status,
      responseStatus: responseStatus ?? undefined,
      responseBody: responseBody ?? undefined,
    });

    // Update webhook status
    const newFailureCount = status === 'delivered' ? 0 : (hook.failureCount ?? 0) + 1;
    await webhookRepo.update(hook.id, {
      lastDeliveredAt: status === 'delivered' ? new Date() : undefined,
      lastFailureAt: status === 'failed' ? new Date() : undefined,
      failureCount: newFailureCount,
      isActive: newFailureCount < 5,
    });
  },

  async getDeliveries(webhookId: string) {
    return webhookRepo.findDeliveries(webhookId);
  },
};
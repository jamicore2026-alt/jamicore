import { describe, it, expect, vi, beforeEach } from 'vitest';
import { webhookService } from './webhook.service.js';
import { ErrorCodes } from '../../errors/codes.js';

// ─── Mock webhookRepo ───
vi.mock('./webhook.repo.js', () => ({
  webhookRepo: {
    findByStoreId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findActiveByEvent: vi.fn(),
    createDelivery: vi.fn(),
    updateDelivery: vi.fn(),
    findDeliveries: vi.fn(),
  },
}));
import { webhookRepo as _webhookRepo } from './webhook.repo.js';
const mockRepo = _webhookRepo as any;

// ─── Mock crypto for deterministic signatures ───
vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  return {
    ...actual,
    randomBytes: vi.fn().mockReturnValue({ toString: () => 'deadbeef' }),
  };
});

describe('webhookService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWebhook', () => {
    it('returns webhook when found', async () => {
      const hook = { id: 'hook-1', url: 'https://example.com/hook', storeId: 'store-1' };
      mockRepo.findById.mockResolvedValue(hook);
      const result = await webhookService.getWebhook('hook-1', 'store-1');
      expect(result).toEqual(hook);
    });

    it('throws NOT_FOUND when webhook does not exist', async () => {
      mockRepo.findById.mockResolvedValue(undefined);
      await expect(webhookService.getWebhook('missing', 'store-1')).rejects.toMatchObject({
        code: ErrorCodes.NOT_FOUND,
      });
    });
  });

  describe('createWebhook', () => {
    it('creates webhook with auto-generated secret', async () => {
      mockRepo.create.mockResolvedValue({ id: 'hook-1' });
      const result = await webhookService.createWebhook('store-1', {
        url: 'https://example.com/hook',
        events: ['order.created'],
      });
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          storeId: 'store-1',
          url: 'https://example.com/hook',
          events: ['order.created'],
          secret: expect.any(String),
          isActive: true,
        }),
      );
      expect(result).toEqual({ id: 'hook-1' });
    });
  });

  describe('findActiveForEvent', () => {
    it('filters webhooks by matching event', async () => {
      mockRepo.findActiveByEvent.mockResolvedValue([
        { id: 'hook-1', events: ['order.created', 'order.updated'] },
        { id: 'hook-2', events: ['product.created'] },
      ]);
      const result = await webhookService.findActiveForEvent('store-1', 'order.created');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('hook-1');
    });
  });

  describe('deliverWebhook', () => {
    it('records delivery as delivered on HTTP 200', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('OK'),
      });

      const hook = {
        id: 'hook-1',
        url: 'https://example.com/hook',
        secret: 'super-secret',
        storeId: 'store-1',
        failureCount: 0,
      };

      await webhookService.deliverWebhook(hook, 'order.created', { orderId: 'ord-1' });

      expect(mockRepo.createDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          webhookId: 'hook-1',
          event: 'order.created',
          status: 'delivered',
          responseStatus: 200,
        }),
      );
      expect(mockRepo.update).toHaveBeenCalledWith(
        'hook-1',
        'store-1',
        expect.objectContaining({
          failureCount: 0,
          isActive: true,
        }),
      );
    });

    it('records delivery as failed on HTTP 500 and increments failureCount', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Internal Server Error'),
      });

      const hook = {
        id: 'hook-1',
        url: 'https://example.com/hook',
        secret: 'super-secret',
        storeId: 'store-1',
        failureCount: 2,
      };

      await webhookService.deliverWebhook(hook, 'order.created', { orderId: 'ord-1' });

      expect(mockRepo.createDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          responseStatus: 500,
        }),
      );
      expect(mockRepo.update).toHaveBeenCalledWith(
        'hook-1',
        'store-1',
        expect.objectContaining({
          failureCount: 3,
          isActive: true,
        }),
      );
    });

    it('disables webhook after 5 consecutive failures', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const hook = {
        id: 'hook-1',
        url: 'https://example.com/hook',
        secret: 'super-secret',
        storeId: 'store-1',
        failureCount: 4,
      };

      await webhookService.deliverWebhook(hook, 'order.created', { orderId: 'ord-1' });

      expect(mockRepo.update).toHaveBeenCalledWith(
        'hook-1',
        'store-1',
        expect.objectContaining({
          failureCount: 5,
          isActive: false,
        }),
      );
    });
  });

  describe('dispatchWebhook', () => {
    it('returns early when no webhooks match the event', async () => {
      mockRepo.findActiveByEvent.mockResolvedValue([]);
      await webhookService.dispatchWebhook('order.created', {}, 'store-1');
      expect(mockRepo.findActiveByEvent).toHaveBeenCalledWith('store-1', 'order.created');
    });
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
// Unit tests for Webhook repository — all Drizzle queries, mocked db
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock db ───
vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      webhooks: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { db } from '../../db/index.js';
import { webhookRepo } from './webhook.repo.js';

beforeEach(() => {
  vi.clearAllMocks();
});

const findFirst = () => vi.mocked(db.query.webhooks.findFirst);

// Chain builder for db.update().set().where().returning()
function setupUpdateChain(returnValue: any) {
  const mockReturning = vi.fn().mockResolvedValue(returnValue);
  const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
  vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);
  return { mockReturning, mockWhere, mockSet };
}

// Chain builder for db.delete().where()
function setupDeleteChain(returnValue: any) {
  const mockReturning = vi.fn().mockResolvedValue(returnValue);
  const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
  vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as any);
  return { mockReturning, mockWhere };
}

// ═══════════════════════════════════════════
// findById
// ═══════════════════════════════════════════
describe('webhookRepo.findById', () => {
  it('returns null when given a wrong storeId', async () => {
    findFirst().mockResolvedValueOnce(undefined);

    const result = await webhookRepo.findById('webhook-id', 'wrong-store-id');
    expect(result).toBeUndefined();
    expect(findFirst()).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.anything(),
    }));
  });

  it('returns webhook when found for the correct store', async () => {
    const mockWebhook = { id: 'w1', storeId: 's1', url: 'https://example.com', events: ['order.created'] };
    findFirst().mockResolvedValueOnce(mockWebhook as any);

    const result = await webhookRepo.findById('w1', 's1');
    expect(result).toEqual(mockWebhook);
  });
});

// ═══════════════════════════════════════════
// update
// ═══════════════════════════════════════════
describe('webhookRepo.update', () => {
  it('updates a webhook and returns it', async () => {
    const updateData = { url: 'https://updated.example.com' };
    const mockWebhook = { id: 'w1', storeId: 's1', url: 'https://updated.example.com' };
    setupUpdateChain([mockWebhook]);

    const result = await webhookRepo.update('w1', 's1', updateData);
    expect(result).toEqual(mockWebhook);
  });
});

// ═══════════════════════════════════════════
// delete
// ═══════════════════════════════════════════
describe('webhookRepo.delete', () => {
  it('deletes a webhook', async () => {
    setupDeleteChain([]);

    await webhookRepo.delete('w1', 's1');
    expect(vi.mocked(db.delete)).toHaveBeenCalled();
  });
});

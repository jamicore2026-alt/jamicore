/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiKeyService } from './apiKey.service.js';
import { ErrorCodes } from '../../errors/codes.js';

// ─── Mock apiKeyRepo ───
vi.mock('./apiKey.repo.js', () => ({
  apiKeyRepo: {
    findByStoreId: vi.fn(),
    findById: vi.fn(),
    findByKeyHash: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    touchLastUsed: vi.fn(),
  },
}));
import { apiKeyRepo as _apiKeyRepo } from './apiKey.repo.js';
const mockRepo = _apiKeyRepo as any;

describe('apiKeyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listKeys', () => {
    it('returns paginated keys without keyHash', async () => {
      mockRepo.findByStoreId.mockResolvedValue({
        items: [{ id: 'k1', name: 'Test', keyHash: 'secret', keyPrefix: 'ak_1234', scopes: ['merchant'], isActive: true }],
        total: 1,
      });
      const result = await apiKeyService.listKeys('store-1');
      expect(result.items[0]).not.toHaveProperty('keyHash');
      expect(result.items[0].keyPrefix).toBe('ak_1234');
      expect(result.total).toBe(1);
    });
  });

  describe('getKey', () => {
    it('returns key when found', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'k1', name: 'Test', keyHash: 'secret', keyPrefix: 'ak_1234', scopes: ['merchant'], isActive: true });
      const result = await apiKeyService.getKey('k1', 'store-1');
      expect(result.id).toBe('k1');
      expect(result).not.toHaveProperty('keyHash');
    });

    it('throws NOT_FOUND when missing', async () => {
      mockRepo.findById.mockResolvedValue(undefined);
      await expect(apiKeyService.getKey('missing', 'store-1')).rejects.toMatchObject({
        code: ErrorCodes.NOT_FOUND,
      });
    });
  });

  describe('createKey', () => {
    it('creates key and returns rawKey only once', async () => {
      mockRepo.create.mockImplementation((data: any) => Promise.resolve({ id: 'k1', ...data }));
      const result = await apiKeyService.createKey('store-1', { name: 'Test', scopes: ['merchant'] });
      expect(result.rawKey).toBeDefined();
      expect(result.rawKey).toMatch(/^ak_store-1_/);
      expect(result.keyPrefix).toBe(result.rawKey.slice(0, 12));
    });

    it('sets expiresAt when expiresInDays provided', async () => {
      mockRepo.create.mockImplementation((data: any) => Promise.resolve({ id: 'k1', ...data }));
      const result = await apiKeyService.createKey('store-1', { name: 'Test', scopes: ['merchant'], expiresInDays: 30 });
      expect(result.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('updateKey', () => {
    it('updates key name', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'k1', name: 'Old' });
      mockRepo.update.mockResolvedValue({ id: 'k1', name: 'New' });
      const result = await apiKeyService.updateKey('k1', 'store-1', { name: 'New' });
      expect(result.name).toBe('New');
    });

    it('throws NOT_FOUND when key missing', async () => {
      mockRepo.findById.mockResolvedValue(undefined);
      await expect(apiKeyService.updateKey('missing', 'store-1', { name: 'New' })).rejects.toMatchObject({
        code: ErrorCodes.NOT_FOUND,
      });
    });
  });

  describe('deleteKey', () => {
    it('deletes key when found', async () => {
      mockRepo.delete.mockResolvedValue({ id: 'k1' });
      const result = await apiKeyService.deleteKey('k1', 'store-1');
      expect(result.id).toBe('k1');
    });

    it('throws NOT_FOUND when missing', async () => {
      mockRepo.delete.mockResolvedValue(undefined);
      await expect(apiKeyService.deleteKey('missing', 'store-1')).rejects.toMatchObject({
        code: ErrorCodes.NOT_FOUND,
      });
    });
  });

  describe('validateKey', () => {
    it('returns storeId and scopes for valid key', async () => {
      const rawKey = 'ak_test_1234567890abcdef';
      mockRepo.findByKeyHash.mockResolvedValue({
        id: 'k1',
        storeId: 'store-1',
        scopes: ['merchant'],
        isActive: true,
        expiresAt: null,
      });
      const result = await apiKeyService.validateKey(rawKey);
      expect(result).toEqual({ storeId: 'store-1', scopes: ['merchant'] });
      expect(mockRepo.touchLastUsed).toHaveBeenCalledWith('k1');
    });

    it('returns null for expired key', async () => {
      const rawKey = 'ak_test_1234567890abcdef';
      mockRepo.findByKeyHash.mockResolvedValue({
        id: 'k1',
        storeId: 'store-1',
        scopes: ['merchant'],
        isActive: true,
        expiresAt: new Date(Date.now() - 86400000),
      });
      const result = await apiKeyService.validateKey(rawKey);
      expect(result).toBeNull();
    });

    it('returns null for unknown key', async () => {
      mockRepo.findByKeyHash.mockResolvedValue(undefined);
      const result = await apiKeyService.validateKey('unknown');
      expect(result).toBeNull();
    });
  });
});

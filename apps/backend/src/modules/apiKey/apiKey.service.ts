// API Key service — business logic, calls apiKeyRepo, never imports db directly
import { createHash, randomBytes } from 'node:crypto';
import { apiKeyRepo } from './apiKey.repo.js';
import { ErrorCodes } from '../../errors/codes.js';

function hashKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

function generateRawKey(storeId: string): string {
  const prefix = storeId.slice(0, 8);
  const entropy = randomBytes(24).toString('hex');
  return `ak_${prefix}_${entropy}`;
}

export const apiKeyService = {
  async listKeys(storeId: string, options?: { limit?: number; offset?: number }) {
    const limit = Math.max(1, Math.min(options?.limit ?? 50, 100));
    const offset = Math.max(0, options?.offset ?? 0);
    const { items, total } = await apiKeyRepo.findByStoreId(storeId, { limit, offset });
    // Never return keyHash — only prefix
    return {
      items: items.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        scopes: k.scopes,
        isActive: k.isActive,
        lastUsedAt: k.lastUsedAt,
        expiresAt: k.expiresAt,
        createdAt: k.createdAt,
      })),
      total,
    };
  },

  async getKey(id: string, storeId: string) {
    const key = await apiKeyRepo.findById(id, storeId);
    if (!key) {
      throw Object.assign(new Error('API key not found'), {
        code: ErrorCodes.NOT_FOUND,
      });
    }
    return {
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
    };
  },

  async createKey(storeId: string, data: { name: string; scopes: string[]; expiresInDays?: number }) {
    const rawKey = generateRawKey(storeId);
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    const expiresAt = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const key = await apiKeyRepo.create({
      storeId,
      name: data.name,
      keyHash,
      keyPrefix,
      scopes: data.scopes,
      isActive: true,
      expiresAt,
    });

    if (!key) {
      throw Object.assign(new Error('Failed to create API key'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return {
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      isActive: key.isActive,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
      // rawKey is returned ONLY on creation
      rawKey,
    };
  },

  async updateKey(id: string, storeId: string, data: Partial<{ name: string; scopes: string[]; isActive: boolean }>) {
    const key = await apiKeyRepo.findById(id, storeId);
    if (!key) {
      throw Object.assign(new Error('API key not found'), {
        code: ErrorCodes.NOT_FOUND,
      });
    }

    const updated = await apiKeyRepo.update(id, storeId, data);
    if (!updated) {
      throw Object.assign(new Error('Failed to update API key'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return {
      id: updated.id,
      name: updated.name,
      keyPrefix: updated.keyPrefix,
      scopes: updated.scopes,
      isActive: updated.isActive,
      lastUsedAt: updated.lastUsedAt,
      expiresAt: updated.expiresAt,
      createdAt: updated.createdAt,
    };
  },

  async deleteKey(id: string, storeId: string) {
    const key = await apiKeyRepo.delete(id, storeId);
    if (!key) {
      throw Object.assign(new Error('API key not found'), {
        code: ErrorCodes.NOT_FOUND,
      });
    }
    return key;
  },

  async validateKey(rawKey: string): Promise<{ storeId: string; scopes: string[] } | null> {
    const keyHash = hashKey(rawKey);
    const key = await apiKeyRepo.findByKeyHash(keyHash);
    if (!key) return null;

    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return null;
    }

    await apiKeyRepo.touchLastUsed(key.id);
    return { storeId: key.storeId, scopes: key.scopes };
  },
};

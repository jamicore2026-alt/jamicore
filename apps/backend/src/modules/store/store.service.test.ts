/* eslint-disable @typescript-eslint/no-explicit-any */
// Unit tests for storeService — business logic with mocked dependencies
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock storeRepo ───
vi.mock('./store.repo.js', () => ({
  storeRepo: {
    findById: vi.fn(),
    findByDomain: vi.fn(),
    findByOwnerId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));
import { storeRepo } from './store.repo.js';
const mockRepo = storeRepo as any;

import { storeService } from './store.service.js';
import { ErrorCodes } from '../../errors/codes.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════
// findById
// ═══════════════════════════════════════════
describe('storeService.findById', () => {
  it('returns store when found', async () => {
    const store = { id: 's1', name: 'My Store', domain: 'mystore' };
    mockRepo.findById.mockResolvedValueOnce(store);

    const result = await storeService.findById('s1');

    expect(result).toEqual(store);
    expect(mockRepo.findById).toHaveBeenCalledWith('s1');
  });

  it('returns null when not found', async () => {
    mockRepo.findById.mockResolvedValueOnce(null);

    const result = await storeService.findById('nonexistent');
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════
// findByDomain
// ═══════════════════════════════════════════
describe('storeService.findByDomain', () => {
  it('returns store when found', async () => {
    const store = { id: 's1', domain: 'mystore' };
    mockRepo.findByDomain.mockResolvedValueOnce(store);

    const result = await storeService.findByDomain('mystore');

    expect(result).toEqual(store);
    expect(mockRepo.findByDomain).toHaveBeenCalledWith('mystore');
  });

  it('returns null when not found', async () => {
    mockRepo.findByDomain.mockResolvedValueOnce(null);

    const result = await storeService.findByDomain('nonexistent');
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════
// findByIdOrFail
// ═══════════════════════════════════════════
describe('storeService.findByIdOrFail', () => {
  it('returns store when found', async () => {
    const store = { id: 's1', name: 'My Store' };
    mockRepo.findById.mockResolvedValueOnce(store);

    const result = await storeService.findByIdOrFail('s1');
    expect(result).toEqual(store);
  });

  it('throws STORE_NOT_FOUND when store not found', async () => {
    mockRepo.findById.mockResolvedValueOnce(null);

    await expect(storeService.findByIdOrFail('nonexistent'))
      .rejects.toMatchObject({ code: ErrorCodes.STORE_NOT_FOUND });
  });
});

// ═══════════════════════════════════════════
// create
// ═══════════════════════════════════════════
describe('storeService.create', () => {
  it('creates a store and returns it', async () => {
    const storeData = {
      name: 'My Store',
      domain: 'mystore',
      ownerEmail: 'owner@store.com',
      ownerName: 'Jane Doe',
    };
    const createdStore = { id: 's1', ...storeData };
    mockRepo.create.mockResolvedValueOnce([createdStore]);

    const result = await storeService.create(storeData);

    expect(result).toEqual(createdStore);
    expect(mockRepo.create).toHaveBeenCalledWith(storeData);
  });
});

// ═══════════════════════════════════════════
// update
// ═══════════════════════════════════════════
describe('storeService.update', () => {
  it('updates a store and returns it', async () => {
    const updatedStore = { id: 's1', name: 'Updated Store' };
    mockRepo.update.mockResolvedValueOnce([updatedStore]);

    const result = await storeService.update('s1', { name: 'Updated Store' });

    expect(result).toEqual(updatedStore);
    expect(mockRepo.update).toHaveBeenCalledWith('s1', { name: 'Updated Store' });
  });
});

// ═══════════════════════════════════════════
// findByOwnerId
// ═══════════════════════════════════════════
describe('storeService.findByOwnerId', () => {
  it('returns store when found by owner email', async () => {
    const store = { id: 's1', ownerEmail: 'owner@store.com' };
    mockRepo.findByOwnerId.mockResolvedValueOnce(store);

    const result = await storeService.findByOwnerId('owner@store.com');

    expect(result).toEqual(store);
    expect(mockRepo.findByOwnerId).toHaveBeenCalledWith('owner@store.com');
  });

  it('returns null when no store matches owner', async () => {
    mockRepo.findByOwnerId.mockResolvedValueOnce(null);

    const result = await storeService.findByOwnerId('nobody@store.com');
    expect(result).toBeNull();
  });
});
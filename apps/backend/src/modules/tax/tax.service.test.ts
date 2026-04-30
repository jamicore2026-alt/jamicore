// Unit tests for taxService — business logic with mocked dependencies
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock taxRepo (namespace import) ───
vi.mock('./tax.repo.js', () => ({
  insertRate: vi.fn(),
  findRatesByStoreId: vi.fn(),
  findRateById: vi.fn(),
  updateRate: vi.fn(),
  deleteRateById: vi.fn(),
  findActiveRatesByStoreId: vi.fn(),
}));

// ─── Mock cacheService ───
vi.mock('../../services/cache.service.js', () => ({
  getCacheService: vi.fn(() => ({
    delete: vi.fn(),
    wrap: vi.fn((_key: string, fn: () => unknown) => fn()),
    get: vi.fn(),
    set: vi.fn(),
    deletePattern: vi.fn(),
    getTTL: vi.fn(),
  })),
}));
import * as _taxRepo from './tax.repo.js';
const mockRepo = _taxRepo as any;

import { taxService } from './tax.service.js';
import { ErrorCodes } from '../../errors/codes.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════
// CRUD operations
// ═══════════════════════════════════════════
describe('taxService.createRate', () => {
  it('delegates to repo.insertRate', async () => {
    const rate = { id: 't1', name: 'CA Sales Tax', rate: '0.0825', storeId: 's1' };
    mockRepo.insertRate.mockResolvedValueOnce(rate);

    const result = await taxService.createRate('s1', { name: 'CA Sales Tax', rate: '0.0825', country: 'US', state: 'CA' });

    expect(result).toEqual(rate);
    expect(mockRepo.insertRate).toHaveBeenCalledWith('s1', expect.objectContaining({
      name: 'CA Sales Tax',
      rate: '0.0825',
      country: 'US',
      state: 'CA',
    }));
  });
});

describe('taxService.listRates', () => {
  it('returns all rates for a store', async () => {
    const rates = [{ id: 't1' }, { id: 't2' }];
    mockRepo.findRatesByStoreId.mockResolvedValueOnce(rates);

    const result = await taxService.listRates('s1');

    expect(result).toEqual(rates);
    expect(mockRepo.findRatesByStoreId).toHaveBeenCalledWith('s1');
  });
});

describe('taxService.getRate', () => {
  it('returns rate when found', async () => {
    const rate = { id: 't1', name: 'VAT' };
    mockRepo.findRateById.mockResolvedValueOnce(rate);

    const result = await taxService.getRate('t1', 's1');
    expect(result).toEqual(rate);
    expect(mockRepo.findRateById).toHaveBeenCalledWith('t1', 's1');
  });

  it('returns null when not found', async () => {
    mockRepo.findRateById.mockResolvedValueOnce(null);

    const result = await taxService.getRate('nonexistent', 's1');
    expect(result).toBeNull();
  });
});

describe('taxService.updateRate', () => {
  it('updates rate and returns it', async () => {
    const updated = { id: 't1', name: 'Updated Tax', rate: '0.10' };
    mockRepo.updateRate.mockResolvedValueOnce(updated);

    const result = await taxService.updateRate('t1', 's1', { name: 'Updated Tax', rate: '0.10' });

    expect(result).toEqual(updated);
    expect(mockRepo.updateRate).toHaveBeenCalledWith('t1', 's1', { name: 'Updated Tax', rate: '0.10' });
  });

  it('throws TAX_RATE_NOT_FOUND when rate not found', async () => {
    mockRepo.updateRate.mockResolvedValueOnce(undefined);

    await expect(taxService.updateRate('nonexistent', 's1', { name: 'X' }))
      .rejects.toMatchObject({ code: ErrorCodes.TAX_RATE_NOT_FOUND });
  });
});

describe('taxService.deleteRate', () => {
  it('deletes rate and returns confirmation', async () => {
    mockRepo.deleteRateById.mockResolvedValueOnce([{ id: 't1' }]);

    const result = await taxService.deleteRate('t1', 's1');

    expect(result).toEqual({ deleted: true });
    expect(mockRepo.deleteRateById).toHaveBeenCalledWith('t1', 's1');
  });

  it('throws TAX_RATE_NOT_FOUND when no rows deleted', async () => {
    mockRepo.deleteRateById.mockResolvedValueOnce([]);

    await expect(taxService.deleteRate('nonexistent', 's1'))
      .rejects.toMatchObject({ code: ErrorCodes.TAX_RATE_NOT_FOUND });
  });
});

// ═══════════════════════════════════════════
// calculateTax
// ═══════════════════════════════════════════
describe('taxService.calculateTax', () => {
  it('returns 0 tax when no rates match address', async () => {
    mockRepo.findActiveRatesByStoreId.mockResolvedValueOnce([
      { name: 'CA Tax', rate: '0.0825', country: 'US', state: 'CA', postalCode: null, isCompound: false, priority: 1 },
    ]);

    const result = await taxService.calculateTax('s1', { country: 'DE' }, '100.00', '10.00');

    expect(result.totalTax).toBe('0.00');
    expect(result.breakdown).toEqual([]);
  });

  it('matches rate with null country (applies to all)', async () => {
    mockRepo.findActiveRatesByStoreId.mockResolvedValueOnce([
      { name: 'Global Tax', rate: '0.05', country: null, state: null, postalCode: null, isCompound: false, priority: 1 },
    ]);

    const result = await taxService.calculateTax('s1', { country: 'US' }, '100.00', '10.00');

    // taxable = 100 + 10 = 110, tax = 110 * 0.05 = 5.50
    expect(result.totalTax).toBe('5.50');
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0]).toMatchObject({ name: 'Global Tax', rate: '0.05', amount: '5.50' });
  });

  it('matches rate by country', async () => {
    mockRepo.findActiveRatesByStoreId.mockResolvedValueOnce([
      { name: 'US Tax', rate: '0.07', country: 'US', state: null, postalCode: null, isCompound: false, priority: 1 },
    ]);

    const result = await taxService.calculateTax('s1', { country: 'US' }, '100.00', '10.00');

    // taxable = 110, tax = 7.70
    expect(result.totalTax).toBe('7.70');
    expect(result.breakdown[0].name).toBe('US Tax');
  });

  it('matches rate by state within country', async () => {
    mockRepo.findActiveRatesByStoreId.mockResolvedValueOnce([
      { name: 'CA Tax', rate: '0.0825', country: 'US', state: 'CA', postalCode: null, isCompound: false, priority: 1 },
    ]);

    const result = await taxService.calculateTax('s1', { country: 'US', state: 'CA' }, '100.00', '0.00');

    // taxable = 100, tax = 8.25
    expect(result.totalTax).toBe('8.25');
  });

  it('excludes rate when state does not match', async () => {
    mockRepo.findActiveRatesByStoreId.mockResolvedValueOnce([
      { name: 'CA Tax', rate: '0.0825', country: 'US', state: 'CA', postalCode: null, isCompound: false, priority: 1 },
    ]);

    const result = await taxService.calculateTax('s1', { country: 'US', state: 'NY' }, '100.00', '0.00');

    expect(result.totalTax).toBe('0.00');
    expect(result.breakdown).toEqual([]);
  });

  it('matches rate by postal code', async () => {
    mockRepo.findActiveRatesByStoreId.mockResolvedValueOnce([
      { name: 'ZIP Tax', rate: '0.01', country: 'US', state: null, postalCode: '90210', isCompound: false, priority: 1 },
    ]);

    const result = await taxService.calculateTax('s1', { country: 'US', state: undefined, postalCode: '90210' }, '100.00', '0.00');

    expect(result.totalTax).toBe('1.00');
  });

  it('excludes rate when postal code does not match', async () => {
    mockRepo.findActiveRatesByStoreId.mockResolvedValueOnce([
      { name: 'ZIP Tax', rate: '0.01', country: 'US', state: null, postalCode: '90210', isCompound: false, priority: 1 },
    ]);

    const result = await taxService.calculateTax('s1', { country: 'US', state: undefined, postalCode: '10001' }, '100.00', '0.00');

    expect(result.totalTax).toBe('0.00');
  });

  it('applies multiple non-compound rates at same priority', async () => {
    mockRepo.findActiveRatesByStoreId.mockResolvedValueOnce([
      { name: 'State Tax', rate: '0.06', country: 'US', state: 'CA', postalCode: null, isCompound: false, priority: 1 },
      { name: 'County Tax', rate: '0.01', country: 'US', state: 'CA', postalCode: null, isCompound: false, priority: 1 },
    ]);

    const result = await taxService.calculateTax('s1', { country: 'US', state: 'CA' }, '100.00', '0.00');

    // Both apply on 100.00: 6.00 + 1.00 = 7.00
    expect(result.totalTax).toBe('7.00');
    expect(result.breakdown).toHaveLength(2);
  });

  it('applies compound tax on top of previous taxes when priority changes', async () => {
    mockRepo.findActiveRatesByStoreId.mockResolvedValueOnce([
      { name: 'State Tax', rate: '0.06', country: null, state: null, postalCode: null, isCompound: false, priority: 1 },
      { name: 'City Tax', rate: '0.02', country: null, state: null, postalCode: null, isCompound: true, priority: 2 },
    ]);

    const result = await taxService.calculateTax('s1', { country: 'US' }, '100.00', '0.00');

    // State Tax: 100 * 0.06 = 6.00, totalTax = 6.00
    // City Tax (compound, priority 2): taxableAmount += totalTax => 106.00, tax = 106 * 0.02 = 2.12
    // totalTax = 6.00 + 2.12 = 8.12
    expect(result.totalTax).toBe('8.12');
    expect(result.breakdown).toHaveLength(2);
    expect(result.breakdown[0].amount).toBe('6.00');
    expect(result.breakdown[1].amount).toBe('2.12');
  });

  it('does not roll taxable amount for compound tax at same priority as previous', async () => {
    mockRepo.findActiveRatesByStoreId.mockResolvedValueOnce([
      { name: 'State Tax', rate: '0.06', country: null, state: null, postalCode: null, isCompound: false, priority: 1 },
      { name: 'Local Tax', rate: '0.01', country: null, state: null, postalCode: null, isCompound: true, priority: 1 },
    ]);

    const result = await taxService.calculateTax('s1', { country: 'US' }, '100.00', '0.00');

    // State: 100 * 0.06 = 6.00
    // Local (compound but same priority): taxable stays 100, tax = 100 * 0.01 = 1.00
    // totalTax = 7.00
    expect(result.totalTax).toBe('7.00');
    expect(result.breakdown).toHaveLength(2);
  });

  it('includes shipping in taxable amount', async () => {
    mockRepo.findActiveRatesByStoreId.mockResolvedValueOnce([
      { name: 'Tax', rate: '0.10', country: null, state: null, postalCode: null, isCompound: false, priority: 1 },
    ]);

    const result = await taxService.calculateTax('s1', { country: 'US' }, '90.00', '10.00');

    // taxable = 90 + 10 = 100, tax = 100 * 0.10 = 10.00
    expect(result.totalTax).toBe('10.00');
  });

  it('rounds each tax amount to 2 decimal places', async () => {
    mockRepo.findActiveRatesByStoreId.mockResolvedValueOnce([
      { name: 'Odd Tax', rate: '0.0825', country: null, state: null, postalCode: null, isCompound: false, priority: 1 },
    ]);

    const result = await taxService.calculateTax('s1', { country: 'US' }, '99.99', '0.00');

    // 99.99 * 0.0825 = 8.2491... rounded to 8.25
    expect(result.breakdown[0].amount).toBe('8.25');
  });

  it('rounds totalTax to 2 decimal places', async () => {
    mockRepo.findActiveRatesByStoreId.mockResolvedValueOnce([
      { name: 'Tax A', rate: '0.0825', country: null, state: null, postalCode: null, isCompound: false, priority: 1 },
    ]);

    const result = await taxService.calculateTax('s1', { country: 'US' }, '99.99', '0.00');

    // totalTax should also be rounded
    expect(typeof result.totalTax).toBe('string');
    expect(result.totalTax).toBe('8.25');
  });
});
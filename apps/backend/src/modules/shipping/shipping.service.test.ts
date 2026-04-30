// Unit tests for shippingService — business logic with mocked dependencies
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock shippingRepo (namespace import) ───
vi.mock('./shipping.repo.js', () => ({
  insertZone: vi.fn(),
  findZonesByStoreId: vi.fn(),
  findZoneById: vi.fn(),
  updateZone: vi.fn(),
  deleteZoneById: vi.fn(),
  findZoneByIdFlat: vi.fn(),
  insertRate: vi.fn(),
  findRatesByZoneId: vi.fn(),
  findRateById: vi.fn(),
  updateRate: vi.fn(),
  deleteRateById: vi.fn(),
  findActiveZonesWithRates: vi.fn(),
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
import * as _shippingRepo from './shipping.repo.js';
const mockRepo = _shippingRepo as any;

import { shippingService } from './shipping.service.js';
import { ErrorCodes } from '../../errors/codes.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════
// Zone CRUD
// ═══════════════════════════════════════════
describe('shippingService.createZone', () => {
  it('delegates to repo.insertZone', async () => {
    const zone = { id: 'z1', name: 'US Zone', storeId: 's1' };
    mockRepo.insertZone.mockResolvedValueOnce(zone);

    const result = await shippingService.createZone('s1', { name: 'US Zone', countries: ['US'] });

    expect(result).toEqual(zone);
    expect(mockRepo.insertZone).toHaveBeenCalledWith('s1', expect.objectContaining({
      name: 'US Zone',
      countries: ['US'],
    }));
  });
});

describe('shippingService.listZones', () => {
  it('returns zones with rates', async () => {
    const zones = [{ id: 'z1', name: 'US Zone', rates: [] }];
    mockRepo.findZonesByStoreId.mockResolvedValueOnce(zones);

    const result = await shippingService.listZones('s1');

    expect(result).toEqual(zones);
    expect(mockRepo.findZonesByStoreId).toHaveBeenCalledWith('s1');
  });
});

describe('shippingService.getZone', () => {
  it('returns zone when found', async () => {
    const zone = { id: 'z1', storeId: 's1', name: 'US Zone' };
    mockRepo.findZoneById.mockResolvedValueOnce(zone);

    const result = await shippingService.getZone('z1', 's1');
    expect(result).toEqual(zone);
  });

  it('returns null when not found', async () => {
    mockRepo.findZoneById.mockResolvedValueOnce(null);

    const result = await shippingService.getZone('z1', 's1');
    expect(result).toBeNull();
  });
});

describe('shippingService.updateZone', () => {
  it('updates zone and returns it', async () => {
    const updated = { id: 'z1', name: 'Updated Zone' };
    mockRepo.updateZone.mockResolvedValueOnce(updated);

    const result = await shippingService.updateZone('z1', 's1', { name: 'Updated Zone' });

    expect(result).toEqual(updated);
    expect(mockRepo.updateZone).toHaveBeenCalledWith('z1', 's1', { name: 'Updated Zone' });
  });

  it('throws ZONE_NOT_FOUND when zone not found', async () => {
    mockRepo.updateZone.mockResolvedValueOnce(undefined);

    await expect(shippingService.updateZone('nonexistent', 's1', { name: 'X' }))
      .rejects.toMatchObject({ code: ErrorCodes.ZONE_NOT_FOUND });
  });
});

describe('shippingService.deleteZone', () => {
  it('deletes zone and returns confirmation', async () => {
    mockRepo.deleteZoneById.mockResolvedValueOnce([{ id: 'z1' }]);

    const result = await shippingService.deleteZone('z1', 's1');

    expect(result).toEqual({ deleted: true });
    expect(mockRepo.deleteZoneById).toHaveBeenCalledWith('z1', 's1');
  });

  it('throws ZONE_NOT_FOUND when no rows deleted', async () => {
    mockRepo.deleteZoneById.mockResolvedValueOnce([]);

    await expect(shippingService.deleteZone('nonexistent', 's1'))
      .rejects.toMatchObject({ code: ErrorCodes.ZONE_NOT_FOUND });
  });
});

// ═══════════════════════════════════════════
// Rate CRUD
// ═══════════════════════════════════════════
describe('shippingService.createRate', () => {
  const rateData = {
    zoneId: 'z1',
    name: 'Standard',
    method: 'ground',
    price: '5.99',
  };

  it('creates rate after verifying zone exists', async () => {
    mockRepo.findZoneByIdFlat.mockResolvedValueOnce({ id: 'z1', storeId: 's1' });
    const rate = { id: 'r1', ...rateData };
    mockRepo.insertRate.mockResolvedValueOnce(rate);

    const result = await shippingService.createRate('s1', rateData);

    expect(result).toEqual(rate);
    expect(mockRepo.findZoneByIdFlat).toHaveBeenCalledWith('z1', 's1');
    expect(mockRepo.insertRate).toHaveBeenCalledWith('s1', rateData);
  });

  it('throws ZONE_NOT_FOUND when zone does not belong to store', async () => {
    mockRepo.findZoneByIdFlat.mockResolvedValueOnce(null);

    await expect(shippingService.createRate('s1', rateData))
      .rejects.toMatchObject({ code: ErrorCodes.ZONE_NOT_FOUND });
  });
});

describe('shippingService.listRates', () => {
  it('returns rates after verifying zone', async () => {
    mockRepo.findZoneByIdFlat.mockResolvedValueOnce({ id: 'z1', storeId: 's1' });
    const rates = [{ id: 'r1' }, { id: 'r2' }];
    mockRepo.findRatesByZoneId.mockResolvedValueOnce(rates);

    const result = await shippingService.listRates('z1', 's1');

    expect(result).toEqual(rates);
  });

  it('throws ZONE_NOT_FOUND when zone not found', async () => {
    mockRepo.findZoneByIdFlat.mockResolvedValueOnce(null);

    await expect(shippingService.listRates('z1', 's1'))
      .rejects.toMatchObject({ code: ErrorCodes.ZONE_NOT_FOUND });
  });
});

describe('shippingService.getRate', () => {
  it('returns rate when found', async () => {
    const rate = { id: 'r1', name: 'Standard' };
    mockRepo.findRateById.mockResolvedValueOnce(rate);

    const result = await shippingService.getRate('r1', 's1');
    expect(result).toEqual(rate);
  });

  it('returns null when not found', async () => {
    mockRepo.findRateById.mockResolvedValueOnce(null);

    const result = await shippingService.getRate('r1', 's1');
    expect(result).toBeNull();
  });
});

describe('shippingService.updateRate', () => {
  it('updates rate and returns it', async () => {
    const updated = { id: 'r1', name: 'Express' };
    mockRepo.updateRate.mockResolvedValueOnce(updated);

    const result = await shippingService.updateRate('r1', 's1', { name: 'Express' });

    expect(result).toEqual(updated);
    expect(mockRepo.updateRate).toHaveBeenCalledWith('r1', 's1', { name: 'Express' });
  });

  it('throws RATE_NOT_FOUND when rate not found', async () => {
    mockRepo.updateRate.mockResolvedValueOnce(undefined);

    await expect(shippingService.updateRate('nonexistent', 's1', { name: 'X' }))
      .rejects.toMatchObject({ code: ErrorCodes.RATE_NOT_FOUND });
  });
});

describe('shippingService.deleteRate', () => {
  it('deletes rate and returns confirmation', async () => {
    mockRepo.deleteRateById.mockResolvedValueOnce([{ id: 'r1' }]);

    const result = await shippingService.deleteRate('r1', 's1');

    expect(result).toEqual({ deleted: true });
  });

  it('throws RATE_NOT_FOUND when no rows deleted', async () => {
    mockRepo.deleteRateById.mockResolvedValueOnce([]);

    await expect(shippingService.deleteRate('nonexistent', 's1'))
      .rejects.toMatchObject({ code: ErrorCodes.RATE_NOT_FOUND });
  });
});

// ═══════════════════════════════════════════
// calculateShipping
// ═══════════════════════════════════════════
describe('shippingService.calculateShipping', () => {
  const addressUS = { country: 'US', state: 'CA', postalCode: '90210' };
  const addressDE = { country: 'DE', state: undefined, postalCode: undefined };

  it('returns no options when no zones match address', async () => {
    mockRepo.findActiveZonesWithRates.mockResolvedValueOnce([
      { id: 'z1', countries: ['CA'], states: [], postalCodePatterns: [], rates: [{ id: 'r1', price: '5.00', method: 'ground', name: 'Std', carrier: null, estimatedDays: null, freeAbove: null, weightBased: false, pricePerKg: null }] },
    ]);

    const result = await shippingService.calculateShipping('s1', addressUS, '100.00');

    expect(result.options).toEqual([]);
    expect(result.message).toBe('No shipping available for this address');
  });

  it('matches zone with empty countries/states/patterns (wildcard)', async () => {
    mockRepo.findActiveZonesWithRates.mockResolvedValueOnce([
      { id: 'z1', countries: [], states: [], postalCodePatterns: [], rates: [{ id: 'r1', price: '5.00', method: 'ground', name: 'Std', carrier: null, estimatedDays: null, freeAbove: null, weightBased: false, pricePerKg: null }] },
    ]);

    const result = await shippingService.calculateShipping('s1', addressUS, '50.00');

    expect(result.options).toHaveLength(1);
    expect(result.options[0]).toMatchObject({ id: 'r1', price: '5.00', free: false });
    expect(result.message).toBeUndefined();
  });

  it('matches zone by country', async () => {
    mockRepo.findActiveZonesWithRates.mockResolvedValueOnce([
      { id: 'z1', countries: ['US', 'CA'], states: [], postalCodePatterns: [], rates: [{ id: 'r1', price: '7.50', method: 'ground', name: 'Std', carrier: 'UPS', estimatedDays: 3, freeAbove: null, weightBased: false, pricePerKg: null }] },
    ]);

    const result = await shippingService.calculateShipping('s1', addressUS, '100.00');

    expect(result.options).toHaveLength(1);
    expect(result.options[0].price).toBe('7.50');
  });

  it('excludes zone when country does not match', async () => {
    mockRepo.findActiveZonesWithRates.mockResolvedValueOnce([
      { id: 'z1', countries: ['DE'], states: [], postalCodePatterns: [], rates: [{ id: 'r1', price: '5.00', method: 'ground', name: 'Std', carrier: null, estimatedDays: null, freeAbove: null, weightBased: false, pricePerKg: null }] },
    ]);

    const result = await shippingService.calculateShipping('s1', addressUS, '100.00');

    expect(result.options).toEqual([]);
  });

  it('matches zone by state within country', async () => {
    mockRepo.findActiveZonesWithRates.mockResolvedValueOnce([
      { id: 'z1', countries: ['US'], states: ['CA', 'NY'], postalCodePatterns: [], rates: [{ id: 'r1', price: '5.00', method: 'ground', name: 'CA Std', carrier: null, estimatedDays: null, freeAbove: null, weightBased: false, pricePerKg: null }] },
    ]);

    const result = await shippingService.calculateShipping('s1', { country: 'US', state: 'CA' }, '100.00');

    expect(result.options).toHaveLength(1);
  });

  it('excludes zone when state does not match', async () => {
    mockRepo.findActiveZonesWithRates.mockResolvedValueOnce([
      { id: 'z1', countries: ['US'], states: ['TX', 'NY'], postalCodePatterns: [], rates: [{ id: 'r1', price: '5.00', method: 'ground', name: 'TX Std', carrier: null, estimatedDays: null, freeAbove: null, weightBased: false, pricePerKg: null }] },
    ]);

    const result = await shippingService.calculateShipping('s1', { country: 'US', state: 'CA' }, '100.00');

    expect(result.options).toEqual([]);
  });

  it('matches zone by postal code pattern (wildcard)', async () => {
    mockRepo.findActiveZonesWithRates.mockResolvedValueOnce([
      { id: 'z1', countries: ['US'], states: [], postalCodePatterns: ['90*'], rates: [{ id: 'r1', price: '3.00', method: 'ground', name: 'CA Local', carrier: null, estimatedDays: null, freeAbove: null, weightBased: false, pricePerKg: null }] },
    ]);

    const result = await shippingService.calculateShipping('s1', { country: 'US', state: undefined, postalCode: '90210' }, '100.00');

    expect(result.options).toHaveLength(1);
  });

  it('applies freeAbove threshold when subtotal meets it', async () => {
    mockRepo.findActiveZonesWithRates.mockResolvedValueOnce([
      { id: 'z1', countries: [], states: [], postalCodePatterns: [], rates: [{ id: 'r1', price: '10.00', method: 'ground', name: 'Std', carrier: null, estimatedDays: 5, freeAbove: '50.00', weightBased: false, pricePerKg: null }] },
    ]);

    const result = await shippingService.calculateShipping('s1', addressDE, '75.00');

    expect(result.options[0].price).toBe('0');
    expect(result.options[0].free).toBe(true);
  });

  it('does not apply freeAbove when subtotal is below threshold', async () => {
    mockRepo.findActiveZonesWithRates.mockResolvedValueOnce([
      { id: 'z1', countries: [], states: [], postalCodePatterns: [], rates: [{ id: 'r1', price: '10.00', method: 'ground', name: 'Std', carrier: null, estimatedDays: 5, freeAbove: '50.00', weightBased: false, pricePerKg: null }] },
    ]);

    const result = await shippingService.calculateShipping('s1', addressDE, '30.00');

    expect(result.options[0].price).toBe('10.00');
    expect(result.options[0].free).toBe(false);
  });

  it('applies weight-based pricing', async () => {
    mockRepo.findActiveZonesWithRates.mockResolvedValueOnce([
      { id: 'z1', countries: [], states: [], postalCodePatterns: [], rates: [{ id: 'r1', price: '5.00', method: 'ground', name: 'Heavy', carrier: null, estimatedDays: null, freeAbove: null, weightBased: true, pricePerKg: '2.00' }] },
    ]);

    const result = await shippingService.calculateShipping('s1', addressDE, '100.00', 3);

    // price = base 5.00 + (2.00 * 3) = 11.00
    expect(result.options[0].price).toBe('11.00');
  });

  it('applies weight-based pricing with free shipping override', async () => {
    mockRepo.findActiveZonesWithRates.mockResolvedValueOnce([
      { id: 'z1', countries: [], states: [], postalCodePatterns: [], rates: [{ id: 'r1', price: '5.00', method: 'ground', name: 'Heavy', carrier: null, estimatedDays: null, freeAbove: '50.00', weightBased: true, pricePerKg: '2.00' }] },
    ]);

    const result = await shippingService.calculateShipping('s1', addressDE, '60.00', 3);

    // Weight would be 5.00 + 6.00 = 11.00, but free overrides to '0'
    expect(result.options[0].price).toBe('0');
    expect(result.options[0].free).toBe(true);
  });

  it('skips weight-based pricing when weightKg is 0 or not provided', async () => {
    mockRepo.findActiveZonesWithRates.mockResolvedValueOnce([
      { id: 'z1', countries: [], states: [], postalCodePatterns: [], rates: [{ id: 'r1', price: '5.00', method: 'ground', name: 'Heavy', carrier: null, estimatedDays: null, freeAbove: null, weightBased: true, pricePerKg: '2.00' }] },
    ]);

    const result = await shippingService.calculateShipping('s1', addressDE, '100.00');

    // No weight provided — falls through to base price
    expect(result.options[0].price).toBe('5.00');
  });

  it('collects rates from multiple matching zones', async () => {
    mockRepo.findActiveZonesWithRates.mockResolvedValueOnce([
      {
        id: 'z1', countries: [], states: [], postalCodePatterns: [],
        rates: [{ id: 'r1', price: '5.00', method: 'ground', name: 'Std', carrier: null, estimatedDays: 5, freeAbove: null, weightBased: false, pricePerKg: null }],
      },
      {
        id: 'z2', countries: [], states: [], postalCodePatterns: [],
        rates: [{ id: 'r2', price: '15.00', method: 'express', name: 'Express', carrier: 'FedEx', estimatedDays: 1, freeAbove: null, weightBased: false, pricePerKg: null }],
      },
    ]);

    const result = await shippingService.calculateShipping('s1', addressDE, '100.00');

    expect(result.options).toHaveLength(2);
    expect(result.options.map((o) => o.id)).toEqual(['r1', 'r2']);
  });
});
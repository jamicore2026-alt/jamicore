/* eslint-disable @typescript-eslint/no-explicit-any */
// Verifies shippingService wraps every entry in withTenant(storeId, fn) and
// threads the tx into shippingRepo (RLS Phase 1, Approach A).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock, shippingRepo } = vi.hoisted(() => ({
  withTenantMock: vi.fn(),
  shippingRepo: {
    insertZone: vi.fn().mockResolvedValue({ id: 'z1', storeId: 's1' }),
    findZonesByStoreId: vi.fn().mockResolvedValue([]),
    findZoneById: vi.fn().mockResolvedValue(undefined),
    updateZone: vi.fn().mockResolvedValue(undefined),
    deleteZoneById: vi.fn().mockResolvedValue([{ id: 'z1' }]),
    findZoneByIdFlat: vi.fn().mockResolvedValue({ id: 'z1', storeId: 's1' }),
    insertRate: vi.fn().mockResolvedValue({ id: 'r1', storeId: 's1' }),
    findRatesByZoneId: vi.fn().mockResolvedValue([]),
    findRateById: vi.fn().mockResolvedValue(undefined),
    updateRate: vi.fn().mockResolvedValue(undefined),
    deleteRateById: vi.fn().mockResolvedValue([{ id: 'r1' }]),
    findActiveZonesWithRates: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn({ __sentinel: 'tx' });
  },
}));

vi.mock('../../services/cache.service.js', () => ({
  getCacheService: () => ({
    wrap: (_key: string, fn: () => unknown) => fn(),
    delete: () => {},
  }),
}));

vi.mock('./shipping.repo.js', () => shippingRepo);

import { shippingService } from './shipping.service.js';

const tx = expect.objectContaining({ __sentinel: 'tx' });

describe('shippingService wraps shipping work in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createZone runs inside withTenant(storeId) and threads tx into insertZone', async () => {
    await shippingService.createZone('s1', { name: 'US', countries: ['US'] });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.insertZone).toHaveBeenCalledWith('s1', expect.objectContaining({ name: 'US' }), tx);
  });

  it('listZones runs inside withTenant(storeId) and threads tx into findZonesByStoreId', async () => {
    await shippingService.listZones('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.findZonesByStoreId).toHaveBeenCalledWith('s1', tx);
  });

  it('getZone runs inside withTenant(storeId) and threads tx into findZoneById', async () => {
    shippingRepo.findZoneById.mockResolvedValueOnce({ id: 'z1', storeId: 's1' });
    await shippingService.getZone('z1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.findZoneById).toHaveBeenCalledWith('z1', 's1', tx);
  });

  it('updateZone runs inside withTenant(storeId) and threads tx into repo.updateZone', async () => {
    shippingRepo.updateZone.mockResolvedValueOnce({ id: 'z1', storeId: 's1' });
    await shippingService.updateZone('z1', 's1', { name: 'X' });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.updateZone).toHaveBeenCalledWith('z1', 's1', { name: 'X' }, tx);
  });

  it('deleteZone runs inside withTenant(storeId) and threads tx into deleteZoneById', async () => {
    await shippingService.deleteZone('z1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.deleteZoneById).toHaveBeenCalledWith('z1', 's1', tx);
  });

  it('createRate runs inside withTenant(storeId) and threads tx into findZoneByIdFlat + insertRate', async () => {
    await shippingService.createRate('s1', { zoneId: 'z1', name: 'Std', method: 'ground', price: '5.00' });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.findZoneByIdFlat).toHaveBeenCalledWith('z1', 's1', tx);
    expect(shippingRepo.insertRate).toHaveBeenCalledWith('s1', expect.objectContaining({ zoneId: 'z1' }), tx);
  });

  it('listRates runs inside withTenant(storeId) and threads tx into findRatesByZoneId', async () => {
    await shippingService.listRates('z1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.findRatesByZoneId).toHaveBeenCalledWith('z1', 's1', tx);
  });

  it('getRate runs inside withTenant(storeId) and threads tx into findRateById', async () => {
    shippingRepo.findRateById.mockResolvedValueOnce({ id: 'r1', storeId: 's1' });
    await shippingService.getRate('r1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.findRateById).toHaveBeenCalledWith('r1', 's1', tx);
  });

  it('updateRate runs inside withTenant(storeId) and threads tx into repo.updateRate', async () => {
    shippingRepo.updateRate.mockResolvedValueOnce({ id: 'r1', storeId: 's1' });
    await shippingService.updateRate('r1', 's1', { name: 'Express' });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.updateRate).toHaveBeenCalledWith('r1', 's1', { name: 'Express' }, tx);
  });

  it('deleteRate runs inside withTenant(storeId) and threads tx into deleteRateById', async () => {
    await shippingService.deleteRate('r1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.deleteRateById).toHaveBeenCalledWith('r1', 's1', tx);
  });

  it('calculateShipping runs inside withTenant(storeId) and threads tx into findActiveZonesWithRates', async () => {
    shippingRepo.findActiveZonesWithRates.mockResolvedValueOnce([
      { id: 'z1', countries: [], states: [], postalCodePatterns: [], rates: [] },
    ]);
    await shippingService.calculateShipping('s1', { country: 'US' }, '100.00');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(shippingRepo.findActiveZonesWithRates).toHaveBeenCalledWith('s1', tx);
  });
});
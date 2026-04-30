// Shipping Service - Zone and rate CRUD, shipping calculation
import { ErrorCodes } from '../../errors/codes.js';
import { toCents, fromCents } from '../../lib/decimal.js';
import { getCacheService } from '../../services/cache.service.js';
import * as repo from './shipping.repo.js';

export const shippingService = {
  // ─── Zone CRUD ───

  async createZone(
    storeId: string,
    data: {
      name: string;
      countries?: string[];
      states?: string[];
      postalCodePatterns?: string[];
      isActive?: boolean;
    },
  ) {
    const zone = await repo.insertZone(storeId, data);
    await getCacheService().delete(`shipping_zones:${storeId}`);
    return zone;
  },

  async listZones(storeId: string) {
    return repo.findZonesByStoreId(storeId);
  },

  async getZone(zoneId: string, storeId: string) {
    return repo.findZoneById(zoneId, storeId);
  },

  async updateZone(
    zoneId: string,
    storeId: string,
    data: Partial<{
      name: string;
      countries: string[];
      states: string[];
      postalCodePatterns: string[];
      isActive: boolean;
    }>,
  ) {
    const updated = await repo.updateZone(zoneId, storeId, data);
    if (!updated)
      throw Object.assign(new Error('Zone not found'), {
        code: ErrorCodes.ZONE_NOT_FOUND,
      });
    await getCacheService().delete(`shipping_zones:${storeId}`);
    return updated;
  },

  async deleteZone(zoneId: string, storeId: string) {
    const result = await repo.deleteZoneById(zoneId, storeId);
    if (result.length === 0)
      throw Object.assign(new Error('Zone not found'), {
        code: ErrorCodes.ZONE_NOT_FOUND,
      });
    await getCacheService().delete(`shipping_zones:${storeId}`);
    return { deleted: true };
  },

  // ─── Rate CRUD ───

  async createRate(
    storeId: string,
    data: {
      zoneId: string;
      name: string;
      method: string;
      carrier?: string;
      price: string;
      freeAbove?: string;
      weightBased?: boolean;
      pricePerKg?: string;
      estimatedDays?: number;
      isActive?: boolean;
    },
  ) {
    // Verify zone belongs to store
    const zone = await repo.findZoneByIdFlat(data.zoneId, storeId);
    if (!zone)
      throw Object.assign(new Error('Zone not found'), {
        code: ErrorCodes.ZONE_NOT_FOUND,
      });

    const rate = await repo.insertRate(storeId, data);
    await getCacheService().delete(`shipping_zones:${storeId}`);
    return rate;
  },

  async listRates(zoneId: string, storeId: string) {
    // Verify zone belongs to store
    const zone = await repo.findZoneByIdFlat(zoneId, storeId);
    if (!zone)
      throw Object.assign(new Error('Zone not found'), {
        code: ErrorCodes.ZONE_NOT_FOUND,
      });

    return repo.findRatesByZoneId(zoneId, storeId);
  },

  async getRate(rateId: string, storeId: string) {
    return repo.findRateById(rateId, storeId);
  },

  async updateRate(
    rateId: string,
    storeId: string,
    data: Partial<{
      name: string;
      method: string;
      carrier: string;
      price: string;
      freeAbove: string;
      weightBased: boolean;
      pricePerKg: string;
      estimatedDays: number;
      isActive: boolean;
    }>,
  ) {
    const updated = await repo.updateRate(rateId, storeId, data);
    if (!updated)
      throw Object.assign(new Error('Rate not found'), {
        code: ErrorCodes.RATE_NOT_FOUND,
      });
    await getCacheService().delete(`shipping_zones:${storeId}`);
    return updated;
  },

  async deleteRate(rateId: string, storeId: string) {
    const result = await repo.deleteRateById(rateId, storeId);
    if (result.length === 0)
      throw Object.assign(new Error('Rate not found'), {
        code: ErrorCodes.RATE_NOT_FOUND,
      });
    await getCacheService().delete(`shipping_zones:${storeId}`);
    return { deleted: true };
  },

  // ─── Calculate Shipping ───

  async calculateShipping(
    storeId: string,
    address: { country: string; state?: string; postalCode?: string },
    subtotal: string,
    weightKg?: number,
  ) {
    // Find matching zones for this address (cached for 5 minutes)
    const cacheKey = `shipping_zones:${storeId}`;
    const zones = await getCacheService().wrap(
      cacheKey,
      () => repo.findActiveZonesWithRates(storeId),
      300,
    );

    const matchingZones = zones.filter((zone) => {
      const countries = zone.countries || [];
      const states = zone.states || [];
      const patterns = zone.postalCodePatterns || [];

      // Empty arrays = matches all
      if (countries.length === 0 && states.length === 0 && patterns.length === 0)
        return true;

      if (countries.length > 0 && !countries.includes(address.country)) return false;
      if (states.length > 0 && address.state && !states.includes(address.state))
        return false;
      if (patterns.length > 0 && address.postalCode) {
        const matchesPattern = patterns.some((p) => {
          // Simple wildcard matching: "12*" matches "12345"
          const regex = new RegExp('^' + p.replace(/\*/g, '.*') + '$');
          return regex.test(address.postalCode!);
        });
        if (!matchesPattern) return false;
      }

      return true;
    });

    if (matchingZones.length === 0) {
      return { options: [], message: 'No shipping available for this address' };
    }

    // Collect all active rates from matching zones, applying freeAbove logic
    const options: Array<{
      id: string;
      name: string;
      method: string;
      carrier: string | null;
      price: string;
      estimatedDays: number | null;
      free: boolean;
    }> = [];

    for (const zone of matchingZones) {
      for (const rate of zone.rates) {
        let price = rate.price;
        let isFree = false;

        // Check free shipping threshold
        if (rate.freeAbove && Number(subtotal) >= Number(rate.freeAbove)) {
          price = '0';
          isFree = true;
        }

        // Weight-based pricing
        if (rate.weightBased && rate.pricePerKg && weightKg && weightKg > 0) {
          const basePriceCents = toCents(rate.price);
          const weightPriceCents = Math.round(toCents(rate.pricePerKg) * weightKg);
          const totalCents = basePriceCents + weightPriceCents;
          price = fromCents(totalCents);
          if (isFree) price = '0';
        }

        options.push({
          id: rate.id,
          name: rate.name,
          method: rate.method,
          carrier: rate.carrier,
          price,
          estimatedDays: rate.estimatedDays,
          free: isFree,
        });
      }
    }

    return { options };
  },
};
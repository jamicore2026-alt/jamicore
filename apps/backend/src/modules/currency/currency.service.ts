// Currency Service - Exchange rate CRUD and conversion
import { ErrorCodes } from '../../errors/codes.js';
import { toCents, fromCents } from '../../lib/decimal.js';
import { storeService } from '../store/store.service.js';
import * as repo from './currency.repo.js';

export const currencyService = {
  // â”€â”€â”€ Rate lookup â”€â”€â”€

  async getRate(baseCurrency: string, targetCurrency: string) {
    return repo.findRate(baseCurrency, targetCurrency);
  },

  async listRates() {
    return repo.findAllRates();
  },

  // â”€â”€â”€ Conversion â”€â”€â”€

  async convert(amount: string, from: string, to: string) {
    if (from === to) return amount;

    const rate = await repo.findRate(from, to);
    if (!rate) {
      throw Object.assign(new Error(`Exchange rate not found for ${from} â†’ ${to}`), {
        code: ErrorCodes.NOT_FOUND,
      });
    }

    const amountCents = toCents(amount);
    const rateValue = Number(rate.rate);
    const convertedCents = Math.round(amountCents * rateValue);
    return fromCents(convertedCents);
  },

  // â”€â”€â”€ Store currency â”€â”€â”€

  async getStoreCurrency(storeId: string) {
    const store = await storeService.findById(storeId);
    return store?.currency ?? 'USD';
  },

  // â”€â”€â”€ Formatting â”€â”€â”€

  formatCurrency(amount: string, currency: string) {
    return `${currency} ${amount}`;
  },

  // â”€â”€â”€ Seeding â”€â”€â”€

  async seedDefaultRates() {
    const defaults = [
      { baseCurrency: 'USD', targetCurrency: 'EUR', rate: '0.85' },
      { baseCurrency: 'USD', targetCurrency: 'GBP', rate: '0.75' },
      { baseCurrency: 'USD', targetCurrency: 'JPY', rate: '110.00' },
      { baseCurrency: 'USD', targetCurrency: 'INR', rate: '75.00' },
      { baseCurrency: 'USD', targetCurrency: 'AED', rate: '3.67' },
    ];

    for (const entry of defaults) {
      await repo.upsertRate(entry);
    }

    return { seeded: true };
  },
};

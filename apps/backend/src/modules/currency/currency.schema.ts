// Currency Zod schemas
import { z } from 'zod';

export const exchangeRateSchema = z.strictObject({
  baseCurrency: z.string().length(3),
  targetCurrency: z.string().length(3),
  rate: z.string().regex(/^\d+(\.\d+)?$/),
});

export const convertSchema = z.strictObject({
  amount: z.string().regex(/^\d+(\.\d+)?$/),
  from: z.string().length(3),
  to: z.string().length(3),
});

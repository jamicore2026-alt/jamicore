import { z } from 'zod';

export const createConsentSchema = z.strictObject({
  essential: z.boolean(),
  analytics: z.boolean().optional(),
  marketing: z.boolean().optional(),
});

export const updateConsentSchema = z.strictObject({
  analytics: z.boolean().optional(),
  marketing: z.boolean().optional(),
});

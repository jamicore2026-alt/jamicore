import { z } from 'zod';
import { idParamSchema } from '../_shared/schema.js';

export { idParamSchema };

const SUBDOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export const checkDomainSchema = z.strictObject({
  domain: z.string().min(3).max(63).regex(SUBDOMAIN_PATTERN),
});

export const updateSubdomainSchema = z.strictObject({
  domain: z.string().min(3).max(63).regex(SUBDOMAIN_PATTERN),
});

export const addCustomDomainSchema = z.strictObject({
  domain: z.string().min(4).max(253),
  verificationType: z.enum(['cname', 'txt']),
});

export const customDomainListQuerySchema = z.strictObject({
  status: z.enum(['pending_dns', 'dns_verified', 'ssl_provisioning', 'live', 'failed']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

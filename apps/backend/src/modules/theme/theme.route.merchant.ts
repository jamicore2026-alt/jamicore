// Merchant Theme Routes - Manage store theme settings
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { themeService } from './theme.service.js';
import { themeSettingsSchema } from './theme.schema.js';

export default async function themeMerchantRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/theme
  fastify.get('/', {
    preHandler: requirePermission('store:read'),
    schema: {
      tags: ['Merchant Theme'],
      summary: 'Get theme settings',
      description: 'Retrieve current store theme configuration',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const settings = await themeService.findByStoreId(request.storeId);
    return { theme: settings };
  });

  // PUT /api/v1/merchant/theme
  fastify.put('/', {
    preHandler: requirePermission('store:write'),
    schema: {
      tags: ['Merchant Theme'],
      summary: 'Update theme settings',
      description: 'Update store theme configuration',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const parsed = themeSettingsSchema.parse(request.body);
    const settings = await themeService.update(request.storeId, parsed);
    return { theme: settings };
  });
}

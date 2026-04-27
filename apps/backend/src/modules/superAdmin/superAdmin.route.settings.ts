// SuperAdmin Platform Settings Routes
import { FastifyInstance } from 'fastify';
import { superAdminService } from './superAdmin.service.js';
import { platformSettingSchema } from './superAdmin.schema.js';

export default async function superAdminSettingsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/settings/platform - List all platform settings
  fastify.get('/platform', {
    schema: {
      tags: ['SuperAdmin Settings'],
      summary: 'List platform settings',
      description: 'Get all platform-wide configuration settings',
      security: [{ cookieAuth: [] }],
    },
  }, async () => {
    return { settings: await superAdminService.listSettings() };
  });

  // PUT /api/v1/admin/settings/platform - Update platform settings (batch)
  fastify.put('/platform', {
    schema: {
      tags: ['SuperAdmin Settings'],
      summary: 'Update platform settings',
      description: 'Batch update platform settings',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const body = request.body as Array<{ key: string; value: string; type?: string }>;
    const updatedBy = request.superAdminId!;
    const results = [];
    for (const item of body) {
      const parsed = platformSettingSchema.parse(item);
      const setting = await superAdminService.upsertSetting(parsed.key, parsed.value, parsed.type, updatedBy);
      results.push(setting);
    }
    return { settings: results };
  });
}

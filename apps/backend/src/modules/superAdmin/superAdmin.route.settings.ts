// SuperAdmin Platform Settings Routes
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { superAdminService } from './superAdmin.service.js';
import { platformSettingSchema } from './superAdmin.schema.js';

const settingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().max(1000),
  type: z.enum(['string', 'number', 'boolean']).optional(),
});

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
    const body = z.array(settingSchema).parse(request.body);
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

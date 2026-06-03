// SuperAdmin Stores Routes - View and manage stores
import { FastifyInstance } from 'fastify';
import { idParamSchema, updateStoreSchema, storeListQuerySchema } from './store.schema.js';
import { storeService } from './store.service.js';
import { superAdminService } from '../superAdmin/superAdmin.service.js';
import { requireAdminRole } from '../../scopes/superAdmin.js';

export default async function superAdminStoresRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/stores - List all stores
  fastify.get('/', {
    schema: {
      tags: ['SuperAdmin Stores'],
      summary: 'List stores',
      description: 'List all stores on the platform with optional status filter and pagination',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = storeListQuerySchema.parse(request.query);
    const result = await superAdminService.listStores(query);
    return result;
  });

  // GET /api/v1/admin/stores/stats - Platform statistics
  fastify.get('/stats', {
    schema: {
      tags: ['SuperAdmin Stores'],
      summary: 'Get platform stats',
      description: 'Retrieve aggregate platform statistics across all stores',
      security: [{ cookieAuth: [] }],
    },
  }, async () => {
    const stats = await superAdminService.getPlatformStats();
    return { stats };
  });

  // GET /api/v1/admin/stores/:id - Get store detail
  fastify.get('/:id', {
    schema: {
      tags: ['SuperAdmin Stores'],
      summary: 'Get store detail',
      description: 'Retrieve detailed information for a specific store by ID',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const store = await superAdminService.getStore(id);
    return { store };
  });

  // PATCH /api/v1/admin/stores/:id - Update store (plan assignment, status)
  fastify.patch('/:id', {
    preHandler: requireAdminRole('superAdmin'),
    schema: {
      tags: ['SuperAdmin Stores'],
      summary: 'Update store',
      description: 'Update store plan assignment, status, or expiration date',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateStoreSchema.parse(request.body);
    // CONS-007: fetch existing store first so we can invalidate the public
    // domain cache after the update. Without this, suspended stores remain
    // visible to the public scope for up to 5 minutes (cache TTL).
    const existing = await storeService.findById(id);
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined) {
        if (key === 'planExpiresAt' && typeof value === 'string') {
          updateData[key] = new Date(value);
        } else {
          updateData[key] = value;
        }
      }
    }
    const store = await storeService.update(id, updateData);
    // CONS-007: invalidate the public domain cache so the suspended/expired
    // status takes effect immediately instead of after the 5-minute TTL.
    if (existing?.domain) {
      await fastify.cacheService.delete(`store:domain:${existing.domain}`);
    }
    return { store };
  });
}
// SuperAdmin Plans Routes - CRUD for merchant plans
import { FastifyInstance } from 'fastify';
import { createPlanSchema, updatePlanSchema, idParamSchema } from './superAdmin.schema.js';
import { superAdminService } from './superAdmin.service.js';
import { requireAdminRole } from '../../scopes/superAdmin.js';

export default async function superAdminPlansRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/plans - List all plans
  fastify.get('/', {
    schema: {
      tags: ['SuperAdmin Plans'],
      summary: 'List plans',
      description: 'List all subscription plans available on the platform',
      security: [{ cookieAuth: [] }],
    },
  }, async () => {
    const plans = await superAdminService.listPlans();
    return { plans };
  });

  // POST /api/v1/admin/plans - Create a plan
  fastify.post('/', {
    preHandler: requireAdminRole('superAdmin'),
    schema: {
      tags: ['SuperAdmin Plans'],
      summary: 'Create plan',
      description: 'Create a new subscription plan for merchant stores',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parsed = createPlanSchema.parse(request.body);
    const plan = await superAdminService.createPlan(parsed);
    reply.status(201).send({ plan });
  });

  // GET /api/v1/admin/plans/:id - Get plan detail
  fastify.get('/:id', {
    schema: {
      tags: ['SuperAdmin Plans'],
      summary: 'Get plan detail',
      description: 'Retrieve a single subscription plan by ID',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const plan = await superAdminService.getPlan(id);
    return { plan };
  });

  // PATCH /api/v1/admin/plans/:id - Update a plan
  fastify.patch('/:id', {
    preHandler: requireAdminRole('superAdmin'),
    schema: {
      tags: ['SuperAdmin Plans'],
      summary: 'Update plan',
      description: 'Partial update of a subscription plan',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updatePlanSchema.parse(request.body);
    const plan = await superAdminService.updatePlan(id, parsed);
    return { plan };
  });

  // DELETE /api/v1/admin/plans/:id - Delete a plan
  fastify.delete('/:id', {
    preHandler: requireAdminRole('superAdmin'),
    schema: {
      tags: ['SuperAdmin Plans'],
      summary: 'Delete plan',
      description: 'Delete a subscription plan from the platform',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await superAdminService.deletePlan(id);
    reply.status(204).send();
  });
}
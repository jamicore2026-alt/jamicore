// SuperAdmin Staff Management Routes
import { FastifyInstance } from 'fastify';
import { superAdminService } from './superAdmin.service.js';
import { staffListQuerySchema, invitationListQuerySchema, idParamSchema } from './superAdmin.schema.js';
import { ErrorCodes } from '../../errors/codes.js';

export default async function superAdminStaffRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/staff - List all staff across stores
  fastify.get('/', {
    schema: {
      tags: ['SuperAdmin Staff'],
      summary: 'List staff',
      description: 'List all non-owner staff members across all stores',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = staffListQuerySchema.parse(request.query);
    return superAdminService.listAllStaff({
      page: query.page,
      limit: query.limit,
      storeId: query.storeId,
      role: query.role,
    });
  });

  // GET /api/v1/admin/staff/invitations - List all invitations
  fastify.get('/invitations', {
    schema: {
      tags: ['SuperAdmin Staff'],
      summary: 'List invitations',
      description: 'List all staff invitations across all stores',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = invitationListQuerySchema.parse(request.query);
    return superAdminService.listAllInvitations({
      page: query.page,
      limit: query.limit,
      storeId: query.storeId,
      status: query.status,
    });
  });

  // DELETE /api/v1/admin/staff/:id - Remove staff member
  fastify.delete('/:id', {
    schema: {
      tags: ['SuperAdmin Staff'],
      summary: 'Remove staff',
      description: 'Remove a staff member from their store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    try {
      await superAdminService.removeStaff(id);
      reply.status(204).send();
    } catch (err: any) {
      if (err.code === ErrorCodes.NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: ErrorCodes.NOT_FOUND, message: 'Staff not found' });
        return;
      }
      if (err.code === ErrorCodes.CANNOT_REMOVE_OWNER) {
        reply.status(403).send({ error: 'Forbidden', code: ErrorCodes.CANNOT_REMOVE_OWNER, message: err.message });
        return;
      }
      throw err;
    }
  });

  // PATCH /api/v1/admin/staff/invitations/:id/revoke - Revoke invitation
  fastify.patch('/invitations/:id/revoke', {
    schema: {
      tags: ['SuperAdmin Staff'],
      summary: 'Revoke invitation',
      description: 'Revoke a pending staff invitation',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    try {
      const invitation = await superAdminService.revokeInvitation(id);
      return { invitation };
    } catch (err: any) {
      if (err.code === ErrorCodes.NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: ErrorCodes.NOT_FOUND, message: 'Invitation not found' });
        return;
      }
      throw err;
    }
  });
}

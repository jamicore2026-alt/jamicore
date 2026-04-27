// Merchant Staff Routes - Staff listing, invitations, role management
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { staffService } from './staff.service.js';
import { planLimitsService } from '../plan-limits/plan-limits.service.js';
import { ErrorCodes } from '../../errors/codes.js';
import { idParamSchema } from '../_shared/schema.js';
import { inviteSchema, updateRoleSchema, tokenParamSchema, acceptInviteSchema } from './staff.schema.js';

export default async function merchantStaffRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/staff
  fastify.get('/', {
    schema: {
      tags: ['Merchant Staff'],
      summary: 'List staff members',
      description: 'List all non-owner staff members for the authenticated store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const staff = await staffService.listStaff(request.storeId);
    const invitations = await staffService.listInvitations(request.storeId);
    return { staff, invitations };
  });

  // POST /api/v1/merchant/staff/invite
  fastify.post('/invite', {
    preHandler: [
      requirePermission('staff:write'),
      async (request, reply) => {
        try {
          await planLimitsService.checkStaffLimit(request.storeId);
        } catch (err: any) {
          if (err.code === ErrorCodes.PLAN_LIMIT_EXCEEDED) {
            reply.status(403).send({
              error: 'Forbidden',
              code: err.code,
              message: err.message,
            });
            return;
          }
          throw err;
        }
      },
    ],
    config: {
      rateLimit: { max: 5, timeWindow: '1 minute' },
    },
    schema: {
      tags: ['Merchant Staff'],
      summary: 'Invite staff member',
      description: 'Send an invitation to a new staff member. Only OWNER and MANAGER can invite.',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parsed = inviteSchema.parse(request.body);

    // Permission check: only OWNER and MANAGER can invite
    if (request.userRole !== 'OWNER' && request.userRole !== 'MANAGER') {
      reply.status(403).send({
        error: 'Forbidden',
        code: ErrorCodes.PERMISSION_DENIED,
        message: 'Only owners and managers can invite staff',
      });
      return;
    }

    // Only OWNER can invite managers
    if (parsed.role === 'MANAGER' && request.userRole !== 'OWNER') {
      reply.status(403).send({
        error: 'Forbidden',
        code: ErrorCodes.PERMISSION_DENIED,
        message: 'Only owners can invite managers',
      });
      return;
    }

    const invitation = await staffService.inviteStaff(
      request.storeId,
      parsed.email,
      parsed.role,
      request.userId,
    );

    // Queue invitation email
    await fastify.emailService.sendEmail({
      to: parsed.email,
      subject: `You're invited to join as ${parsed.role}`,
      html: `<p>You've been invited to join the store as a <strong>${parsed.role}</strong>.</p><p>Use this token to accept: <code>${invitation.token}</code></p>`,
      text: `You've been invited to join the store as ${parsed.role}. Use this token to accept: ${invitation.token}`,
    });

    reply.status(201).send({ invitation });
  });

  // GET /api/v1/merchant/staff/invitations
  fastify.get('/invitations', {
    schema: {
      tags: ['Merchant Staff'],
      summary: 'List pending invitations',
      description: 'List all pending staff invitations for the authenticated store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const invitations = await staffService.listInvitations(request.storeId);
    return { invitations };
  });

  // PATCH /api/v1/merchant/staff/:id/role
  fastify.patch('/:id/role', {
    preHandler: requirePermission('staff:write'),
    schema: {
      tags: ['Merchant Staff'],
      summary: 'Update staff role',
      description: 'Change a staff member role. Only OWNER can change roles.',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateRoleSchema.parse(request.body);

    if (request.userRole !== 'OWNER') {
      return {
        error: 'Forbidden',
        code: ErrorCodes.PERMISSION_DENIED,
        message: 'Only owners can change staff roles',
      };
    }

    const result = await staffService.updateStaffRole(id, request.storeId, parsed.role);
    return { staff: result };
  });

  // DELETE /api/v1/merchant/staff/:id
  fastify.delete('/:id', {
    preHandler: requirePermission('staff:write'),
    schema: {
      tags: ['Merchant Staff'],
      summary: 'Remove staff member',
      description: 'Remove a staff member from the store. Only OWNER can remove staff.',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);

    if (request.userRole !== 'OWNER') {
      reply.status(403).send({
        error: 'Forbidden',
        code: ErrorCodes.PERMISSION_DENIED,
        message: 'Only owners can remove staff',
      });
      return;
    }

    const result = await staffService.removeStaff(id, request.storeId);
    reply.status(204).send(result);
  });

  // ─── Invitation Accept/Reject (NO AUTH - new user or unauthenticated) ───

  // POST /api/v1/merchant/staff/invitations/:token/accept
  fastify.post('/invitations/:token/accept', {
    config: {
      rateLimit: { max: 5, timeWindow: '1 minute' },
    },
    schema: {
      tags: ['Merchant Staff'],
      summary: 'Accept staff invitation',
      description: 'Accept a staff invitation by token and set password. No auth required (new user).',
    },
  }, async (request, reply) => {
    const { token } = tokenParamSchema.parse(request.params);
    const parsed = acceptInviteSchema.parse(request.body);

    const result = await staffService.acceptInvitation(token, parsed.password, parsed.name);

    // Auto-login: generate JWT and set cookie
    const jwtToken = await reply.jwtSign({
      userId: result.user.id,
      storeId: result.user.storeId,
      role: result.user.role,
    });

    reply.setCookie('access_token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    reply.status(200).send({ success: true, user: result.user });
  });

  // POST /api/v1/merchant/staff/invitations/:token/reject
  fastify.post('/invitations/:token/reject', {
    schema: {
      tags: ['Merchant Staff'],
      summary: 'Reject staff invitation',
      description: 'Reject a staff invitation by token. No auth required.',
    },
  }, async (request) => {
    const { token } = tokenParamSchema.parse(request.params);
    const result = await staffService.rejectInvitation(token);
    return result;
  });
}

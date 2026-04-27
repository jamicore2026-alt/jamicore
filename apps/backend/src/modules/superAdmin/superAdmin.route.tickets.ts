// SuperAdmin Support Ticket Routes
import { FastifyInstance } from 'fastify';
import { superAdminService } from './superAdmin.service.js';
import { ticketListQuerySchema, createTicketSchema, updateTicketSchema, createTicketReplySchema, idParamSchema } from './superAdmin.schema.js';
import { ErrorCodes } from '../../errors/codes.js';

export default async function superAdminTicketRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/tickets - List all tickets
  fastify.get('/', {
    schema: {
      tags: ['SuperAdmin Tickets'],
      summary: 'List support tickets',
      description: 'List all support tickets with optional filters',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = ticketListQuerySchema.parse(request.query);
    return superAdminService.listTickets(query);
  });

  // POST /api/v1/admin/tickets - Create a ticket
  fastify.post('/', {
    schema: {
      tags: ['SuperAdmin Tickets'],
      summary: 'Create ticket',
      description: 'Create a new support ticket on behalf of a merchant',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const body = createTicketSchema.parse(request.body);
    const ticket = await superAdminService.createTicket(body);
    // Auto-notify admins
    await superAdminService.createNotification({
      type: 'ticket_created',
      title: 'New Support Ticket',
      body: ticket.subject,
      targetStoreId: ticket.storeId,
    });
    return ticket;
  });

  // GET /api/v1/admin/tickets/:id - Get ticket detail
  fastify.get('/:id', {
    schema: {
      tags: ['SuperAdmin Tickets'],
      summary: 'Get ticket',
      description: 'Get support ticket detail with replies',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    try {
      const ticket = await superAdminService.getTicket(id);
      return { ticket };
    } catch (err: any) {
      if (err.code === ErrorCodes.NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: ErrorCodes.NOT_FOUND, message: 'Ticket not found' });
        return;
      }
      throw err;
    }
  });

  // PATCH /api/v1/admin/tickets/:id - Update ticket
  fastify.patch('/:id', {
    schema: {
      tags: ['SuperAdmin Tickets'],
      summary: 'Update ticket',
      description: 'Update ticket status, priority, or assignment',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = updateTicketSchema.parse(request.body);
    try {
      const ticket = await superAdminService.updateTicket(id, body);
      return { ticket };
    } catch (err: any) {
      if (err.code === ErrorCodes.NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: ErrorCodes.NOT_FOUND, message: 'Ticket not found' });
        return;
      }
      throw err;
    }
  });

  // POST /api/v1/admin/tickets/:id/replies - Reply to ticket
  fastify.post('/:id/replies', {
    schema: {
      tags: ['SuperAdmin Tickets'],
      summary: 'Reply to ticket',
      description: 'Add a reply to a support ticket',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = createTicketReplySchema.parse(request.body);
    const authorId = request.superAdminId!;
    try {
      const replyItem = await superAdminService.replyToTicket(id, authorId, 'superadmin', body.message);
      return { reply: replyItem };
    } catch (err: any) {
      if (err.code === ErrorCodes.NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: ErrorCodes.NOT_FOUND, message: 'Ticket not found' });
        return;
      }
      throw err;
    }
  });
}

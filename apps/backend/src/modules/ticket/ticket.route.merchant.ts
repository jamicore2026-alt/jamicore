// Merchant Support Ticket Routes — for merchant store owners
import { FastifyInstance } from 'fastify';
import { ErrorCodes } from '../../errors/codes.js';
import { db } from '../../db/index.js';
import { supportTickets, ticketReplies } from '../../db/schema.js';
import { eq, and, desc, count } from 'drizzle-orm';

export default async function merchantTicketRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/tickets
  fastify.get('/', {
    schema: {
      tags: ['Merchant Tickets'],
      summary: 'List tickets',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const storeId = request.storeId;
    const page = Math.max(1, Number((request.query as any).page || '1'));
    const limit = Math.min(100, Math.max(1, Number((request.query as any).limit || '20')));
    const status = (request.query as any).status;

    const conditions = [eq(supportTickets.storeId, storeId)];
    if (status) conditions.push(eq(supportTickets.status, status));
    const where = conditions.length === 1 ? conditions[0] : and(...conditions);

    const [rows, totalResult] = await Promise.all([
      db.query.supportTickets.findMany({
        where,
        orderBy: desc(supportTickets.createdAt),
        limit,
        offset: (page - 1) * limit,
      }),
      db.select({ count: count() }).from(supportTickets).where(where),
    ]);

    return {
      data: rows,
      pagination: { page, limit, total: Number(totalResult[0]?.count ?? 0), totalPages: Math.ceil(Number(totalResult[0]?.count ?? 0) / limit) },
    };
  });

  // GET /api/v1/merchant/tickets/:id
  fastify.get('/:id', {
    schema: {
      tags: ['Merchant Tickets'],
      summary: 'Get ticket',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const storeId = request.storeId;

    const ticket = await db.query.supportTickets.findFirst({
      where: and(eq(supportTickets.id, id), eq(supportTickets.storeId, storeId)),
      with: {
        replies: { orderBy: desc(ticketReplies.createdAt) },
      },
    });

    if (!ticket) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.NOT_FOUND, message: 'Ticket not found' });
      return;
    }

    return { ticket };
  });

  // POST /api/v1/merchant/tickets
  fastify.post('/', {
    schema: {
      tags: ['Merchant Tickets'],
      summary: 'Create ticket',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const body = request.body as { subject: string; description: string; priority?: string };
    const storeId = request.storeId;

    const [ticket] = await db.insert(supportTickets).values({
      storeId,
      subject: body.subject,
      description: body.description,
      priority: body.priority || 'medium',
      status: 'open',
    }).returning();

    return { ticket };
  });

  // POST /api/v1/merchant/tickets/:id/replies
  fastify.post('/:id/replies', {
    schema: {
      tags: ['Merchant Tickets'],
      summary: 'Reply to ticket',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const storeId = request.storeId;
    const body = request.body as { message: string };
    const userId = request.userId;

    const ticket = await db.query.supportTickets.findFirst({
      where: and(eq(supportTickets.id, id), eq(supportTickets.storeId, storeId)),
    });

    if (!ticket) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.NOT_FOUND, message: 'Ticket not found' });
      return;
    }

    const [replyRow] = await db.insert(ticketReplies).values({
      ticketId: id,
      authorId: userId,
      authorType: 'merchant',
      message: body.message,
    }).returning();

    // Update ticket status if it was closed
    if (ticket.status === 'closed') {
      await db.update(supportTickets).set({ status: 'open', updatedAt: new Date() }).where(eq(supportTickets.id, id));
    }

    return { reply: replyRow };
  });
}

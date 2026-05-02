// Merchant Newsletter Routes - Subscriber management
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { newsletterSubscribers } from '../../db/schema.js';
import { eq, desc, count, and } from 'drizzle-orm';

const listQuerySchema = z.strictObject({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  active: z.enum(['true', 'false']).optional(),
});

export default async function merchantNewsletterRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/newsletter
  fastify.get('/', {
    schema: {
      tags: ['Merchant Newsletter'],
      summary: 'List newsletter subscribers',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    const conditions = [eq(newsletterSubscribers.storeId, request.storeId)];

    if (query.active === 'true') {
      conditions.push(eq(newsletterSubscribers.isActive, true));
    } else if (query.active === 'false') {
      conditions.push(eq(newsletterSubscribers.isActive, false));
    }

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);

    const [rows, totalResult] = await Promise.all([
      db
        .select()
        .from(newsletterSubscribers)
        .where(where)
        .limit(query.limit)
        .offset((query.page - 1) * query.limit)
        .orderBy(desc(newsletterSubscribers.subscribedAt)),
      db.select({ count: count() }).from(newsletterSubscribers).where(where),
    ]);

    return {
      data: rows,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totalResult[0]?.count ?? 0,
        totalPages: Math.ceil((totalResult[0]?.count ?? 0) / query.limit),
      },
    };
  });
}

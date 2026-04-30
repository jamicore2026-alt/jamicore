// Public Newsletter Routes - Subscribe/unsubscribe
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { newsletterSubscribers } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';

const subscribeSchema = z.strictObject({
  email: z.string().email(),
});

export default async function publicNewsletterRoutes(fastify: FastifyInstance) {
  // POST /api/v1/public/newsletter/subscribe
  fastify.post('/subscribe', {
    schema: {
      tags: ['Public'],
      summary: 'Subscribe to newsletter',
    },
  }, async (request, reply) => {
    if (!request.storeId) {
      reply.status(404).send({ error: 'Not Found', message: 'Store not found' });
      return;
    }

    const parsed = subscribeSchema.parse(request.body);

    const existing = await db.query.newsletterSubscribers.findFirst({
      where: and(
        eq(newsletterSubscribers.storeId, request.storeId),
        eq(newsletterSubscribers.email, parsed.email.toLowerCase()),
      ),
    });

    if (existing) {
      if (!existing.isActive) {
        await db.update(newsletterSubscribers)
          .set({ isActive: true, unsubscribedAt: null })
          .where(eq(newsletterSubscribers.id, existing.id));
      }
      reply.status(200).send({ success: true, message: 'Already subscribed' });
      return;
    }

    await db.insert(newsletterSubscribers).values({
      storeId: request.storeId,
      email: parsed.email.toLowerCase(),
    });

    reply.status(201).send({ success: true, message: 'Subscribed successfully' });
  });

  // POST /api/v1/public/newsletter/unsubscribe
  fastify.post('/unsubscribe', {
    schema: {
      tags: ['Public'],
      summary: 'Unsubscribe from newsletter',
    },
  }, async (request, reply) => {
    if (!request.storeId) {
      reply.status(404).send({ error: 'Not Found', message: 'Store not found' });
      return;
    }

    const parsed = subscribeSchema.parse(request.body);

    await db.update(newsletterSubscribers)
      .set({ isActive: false, unsubscribedAt: new Date() })
      .where(and(
        eq(newsletterSubscribers.storeId, request.storeId),
        eq(newsletterSubscribers.email, parsed.email.toLowerCase()),
      ));

    reply.status(200).send({ success: true, message: 'Unsubscribed successfully' });
  });
}

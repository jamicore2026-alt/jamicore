
// Merchant Notifications Routes � SSE stream + REST endpoints
import { FastifyInstance } from 'fastify';
import { notificationService } from './notifications.service.js';
import { ErrorCodes } from '../../errors/codes.js';

export default async function merchantNotificationRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/notifications � SSE stream
  fastify.get('/', {
    schema: {
      tags: ['Merchant Notifications'],
      summary: 'SSE stream',
      description: 'Server-Sent Events stream for real-time merchant notifications',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const client = {
      write: (data: string) => reply.raw.write(data),
      close: () => reply.raw.end(),
    };

    notificationService.subscribe(request.storeId, client);

    const unreadCount = await notificationService.getUnreadCount(request.storeId);
    client.write('data: ' + JSON.stringify({ type: 'connected', unreadCount }) + '\n\n');

    request.raw.on('close', () => {
      notificationService.unsubscribe(request.storeId, client);
    });
  });

  // GET /api/v1/merchant/notifications/list � List notifications
  fastify.get('/list', {
    schema: {
      tags: ['Merchant Notifications'],
      summary: 'List notifications',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const notifications = await notificationService.getNotifications(request.storeId, {
      unreadOnly: false,
    });
    const unreadCount = await notificationService.getUnreadCount(request.storeId);
    return { notifications, unreadCount };
  });

  // PATCH /api/v1/merchant/notifications/:id/read
  fastify.patch('/:id/read', {
    schema: {
      tags: ['Merchant Notifications'],
      summary: 'Mark notification as read',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const notification = await notificationService.markAsRead(id, request.storeId);
    if (!notification) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.NOT_FOUND, message: 'Notification not found' });
      return;
    }
    return { notification };
  });

  // POST /api/v1/merchant/notifications/read-all
  fastify.post('/read-all', {
    schema: {
      tags: ['Merchant Notifications'],
      summary: 'Mark all as read',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    await notificationService.markAllAsRead(request.storeId);
    return { success: true };
  });
}

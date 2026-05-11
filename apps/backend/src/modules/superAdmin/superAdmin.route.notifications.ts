/* eslint-disable @typescript-eslint/no-explicit-any */
// SuperAdmin Notification Routes
import { FastifyInstance } from 'fastify';
import { superAdminService } from './superAdmin.service.js';
import { notificationListQuerySchema, createNotificationSchema, idParamSchema } from './superAdmin.schema.js';
import { ErrorCodes } from '../../errors/codes.js';

export default async function superAdminNotificationRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/notifications/stream — SSE stream for real-time notifications
  fastify.get('/stream', {
    schema: {
      tags: ['SuperAdmin Notifications'],
      summary: 'SSE stream',
      description: 'Server-Sent Events stream for real-time admin notifications',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const client = {
      write: (data: string) => reply.raw.write(data),
      close: () => reply.raw.end(),
    };

    superAdminService.subscribeAdminSSE(client);

    const unreadCount = await superAdminService.getUnreadNotificationCount();
    client.write('data: ' + JSON.stringify({ type: 'connected', unreadCount }) + '\n\n');

    // Keep the connection alive by sending a heartbeat every 25s
    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(':ping\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 25000);

    request.raw.on('close', () => {
      clearInterval(heartbeat);
      superAdminService.unsubscribeAdminSSE(client);
    });

    // Also cleanup on raw socket error to prevent leaking dead connections
    reply.raw.on('error', () => {
      clearInterval(heartbeat);
      superAdminService.unsubscribeAdminSSE(client);
    });
  });

  // GET /api/v1/admin/notifications - List notifications
  fastify.get('/', {
    schema: {
      tags: ['SuperAdmin Notifications'],
      summary: 'List notifications',
      description: 'List admin notifications with optional unread-only filter',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parseResult = notificationListQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      reply.status(400).send({
        error: 'Bad Request',
        code: ErrorCodes.VALIDATION_ERROR,
        message: parseResult.error.issues.map((e: { message: string }) => e.message).join(', ')
      });
      return;
    }
    const query = parseResult.data;
    const result = await superAdminService.listNotifications(query);
    return result;
  });

  // GET /api/v1/admin/notifications/count - Unread count
  fastify.get('/count', {
    schema: {
      tags: ['SuperAdmin Notifications'],
      summary: 'Unread notification count',
      description: 'Get count of unread notifications',
      security: [{ cookieAuth: [] }],
    },
  }, async () => {
    const count = await superAdminService.getUnreadNotificationCount();
    return { count };
  });

  // POST /api/v1/admin/notifications - Create notification
  fastify.post('/', {
    schema: {
      tags: ['SuperAdmin Notifications'],
      summary: 'Create notification',
      description: 'Create a new admin notification',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parseResult = createNotificationSchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.status(400).send({
        error: 'Bad Request',
        code: ErrorCodes.VALIDATION_ERROR,
        message: parseResult.error.issues.map((e: { message: string }) => e.message).join(', ')
      });
      return;
    }
    const body = parseResult.data;
    const notification = await superAdminService.createNotification(body);
    return { notification };
  });

  // PATCH /api/v1/admin/notifications/:id/read - Mark as read
  fastify.patch('/:id/read', {
    schema: {
      tags: ['SuperAdmin Notifications'],
      summary: 'Mark notification read',
      description: 'Mark a notification as read',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parseResult = idParamSchema.safeParse(request.params);
    if (!parseResult.success) {
      reply.status(400).send({
        error: 'Bad Request',
        code: ErrorCodes.VALIDATION_ERROR,
        message: parseResult.error.issues.map((e: { message: string }) => e.message).join(', ')
      });
      return;
    }
    const { id } = parseResult.data;
    try {
      const notification = await superAdminService.markNotificationRead(id);
      return { notification };
    } catch (err: any) {
      if (err.code === ErrorCodes.NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: ErrorCodes.NOT_FOUND, message: 'Notification not found' });
        return;
      }
      throw err;
    }
  });

  // PATCH /api/v1/admin/notifications/read-all - Mark all as read
  fastify.patch('/read-all', {
    schema: {
      tags: ['SuperAdmin Notifications'],
      summary: 'Mark all read',
      description: 'Mark all notifications as read',
      security: [{ cookieAuth: [] }],
    },
  }, async () => {
    await superAdminService.markAllNotificationsRead();
    return { success: true };
  });
}

// SuperAdmin Notification Routes
import { FastifyInstance } from 'fastify';
import { superAdminService } from './superAdmin.service.js';
import { notificationListQuerySchema, createNotificationSchema, idParamSchema } from './superAdmin.schema.js';
import { ErrorCodes } from '../../errors/codes.js';

export default async function superAdminNotificationRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/notifications - List notifications
  fastify.get('/', {
    schema: {
      tags: ['SuperAdmin Notifications'],
      summary: 'List notifications',
      description: 'List admin notifications with optional unread-only filter',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = notificationListQuerySchema.parse(request.query);
    return superAdminService.listNotifications(query);
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
  }, async (request) => {
    const body = createNotificationSchema.parse(request.body);
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
    const { id } = idParamSchema.parse(request.params);
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

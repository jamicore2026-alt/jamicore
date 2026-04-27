// Merchant Upload Routes - Image upload and delete with validation
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { ErrorCodes } from '../../errors/codes.js';
import { deleteSchema } from './upload.schema.js';
import { planLimitsService } from '../plan-limits/plan-limits.service.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default async function merchantUploadRoutes(fastify: FastifyInstance) {
  // POST /api/v1/merchant/upload
  fastify.post('/', {
    preHandler: requirePermission('upload:write'),
    schema: {
      tags: ['Merchant Upload'],
      summary: 'Upload image',
      description: 'Upload an image file (JPEG, PNG, WebP, GIF) up to 10MB for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const data = await request.file();

    if (!data) {
      reply.status(400).send({
        error: 'Bad Request',
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'No file provided',
      });
      return;
    }

    // Validate mimetype
    if (!ALLOWED_TYPES.includes(data.mimetype)) {
      reply.status(400).send({
        error: 'Bad Request',
        code: ErrorCodes.INVALID_FILE_TYPE,
        message: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`,
      });
      return;
    }

    // Read file buffer
    const buffer = await data.toBuffer();

    // Validate size
    if (buffer.length > MAX_FILE_SIZE) {
      reply.status(400).send({
        error: 'Bad Request',
        code: ErrorCodes.FILE_TOO_LARGE,
        message: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
      return;
    }

    // Check storage limit
    try {
      await planLimitsService.checkStorageLimit(request.storeId, buffer.length);
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

    const result = await fastify.uploadService.uploadImage(buffer, request.storeId, 'products');

    await planLimitsService.incrementStorage(request.storeId, buffer.length);

    reply.status(201).send({ file: result });
  });

  // DELETE /api/v1/merchant/upload
  fastify.delete('/', {
    preHandler: requirePermission('upload:write'),
    schema: {
      tags: ['Merchant Upload'],
      summary: 'Delete image',
      description: 'Delete an uploaded image by its URL',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { url } = deleteSchema.parse(request.query);

    // Security: only allow deleting URLs from our own uploads
    if (!url.startsWith('/uploads/')) {
      reply.status(400).send({
        error: 'Bad Request',
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid URL. Only uploaded files can be deleted.',
      });
      return;
    }

    await fastify.uploadService.deleteImage(url);

    reply.status(204).send();
  });
}

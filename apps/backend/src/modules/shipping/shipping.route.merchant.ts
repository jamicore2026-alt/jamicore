// Merchant Shipping Routes - Zone and rate CRUD
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { shippingService } from './shipping.service.js';
import { idParamSchema } from '../_shared/schema.js';
import { zoneIdParamSchema, createZoneSchema, updateZoneSchema, createRateSchema, updateRateSchema } from './shipping.schema.js';
import { ErrorCodes } from '../../errors/codes.js';

export default async function merchantShippingRoutes(fastify: FastifyInstance) {
  // ─── Zones ───

  // GET /api/v1/merchant/shipping/zones
  fastify.get('/zones', {
    schema: { tags: ['Merchant Shipping'], summary: 'List shipping zones', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const zones = await shippingService.listZones(request.storeId);
    return { zones };
  });

  // POST /api/v1/merchant/shipping/zones
  fastify.post('/zones', {
    preHandler: requirePermission('shipping:write'),
    schema: { tags: ['Merchant Shipping'], summary: 'Create shipping zone', security: [{ cookieAuth: [] }] },
  }, async (request, reply) => {
    const parsed = createZoneSchema.parse(request.body);
    const zone = await shippingService.createZone(request.storeId, parsed);
    reply.status(201).send({ zone });
  });

  // GET /api/v1/merchant/shipping/zones/:id
  fastify.get('/zones/:id', {
    schema: { tags: ['Merchant Shipping'], summary: 'Get shipping zone', security: [{ cookieAuth: [] }] },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const zone = await shippingService.getZone(id, request.storeId);
    if (!zone) {
      return reply.status(404).send({ error: 'Not Found', code: ErrorCodes.ZONE_NOT_FOUND, message: 'Shipping zone not found' });
    }
    return { zone };
  });

  // PATCH /api/v1/merchant/shipping/zones/:id
  fastify.patch('/zones/:id', {
    preHandler: requirePermission('shipping:write'),
    schema: { tags: ['Merchant Shipping'], summary: 'Update shipping zone', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateZoneSchema.parse(request.body);
    const zone = await shippingService.updateZone(id, request.storeId, parsed);
    return { zone };
  });

  // DELETE /api/v1/merchant/shipping/zones/:id
  fastify.delete('/zones/:id', {
    preHandler: requirePermission('shipping:write'),
    schema: { tags: ['Merchant Shipping'], summary: 'Delete shipping zone', security: [{ cookieAuth: [] }] },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await shippingService.deleteZone(id, request.storeId);
    reply.status(204).send();
  });

  // ─── Rates ───

  // GET /api/v1/merchant/shipping/zones/:zoneId/rates
  fastify.get('/zones/:zoneId/rates', {
    schema: { tags: ['Merchant Shipping'], summary: 'List shipping rates for zone', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const { zoneId } = zoneIdParamSchema.parse(request.params);
    const rates = await shippingService.listRates(zoneId, request.storeId);
    return { rates };
  });

  // POST /api/v1/merchant/shipping/zones/:zoneId/rates
  fastify.post('/zones/:zoneId/rates', {
    preHandler: requirePermission('shipping:write'),
    schema: { tags: ['Merchant Shipping'], summary: 'Create shipping rate', security: [{ cookieAuth: [] }] },
  }, async (request, reply) => {
    const { zoneId } = zoneIdParamSchema.parse(request.params);
    const parsed = createRateSchema.parse(request.body);
    const rate = await shippingService.createRate(request.storeId, { ...parsed, zoneId });
    reply.status(201).send({ rate });
  });

  // PATCH /api/v1/merchant/shipping/rates/:id
  fastify.patch('/rates/:id', {
    preHandler: requirePermission('shipping:write'),
    schema: { tags: ['Merchant Shipping'], summary: 'Update shipping rate', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateRateSchema.parse(request.body);
    const rate = await shippingService.updateRate(id, request.storeId, parsed);
    return { rate };
  });

  // DELETE /api/v1/merchant/shipping/rates/:id
  fastify.delete('/rates/:id', {
    preHandler: requirePermission('shipping:write'),
    schema: { tags: ['Merchant Shipping'], summary: 'Delete shipping rate', security: [{ cookieAuth: [] }] },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await shippingService.deleteRate(id, request.storeId);
    reply.status(204).send();
  });
}
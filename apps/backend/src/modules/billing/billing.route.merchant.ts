// Merchant Billing Routes — view plan, usage, invoices, and upgrade
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { billingService } from './billing.service.js';
import { upgradePlanSchema, paginationQuerySchema } from './billing.schema.js';

export default async function merchantBillingRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/billing — Billing summary (plan + usage + recent invoices + available plans)
  fastify.get('/', {
    schema: {
      tags: ['Merchant Billing'],
      summary: 'Get billing summary',
      description: 'Returns current plan, usage stats, recent invoices, and available plans',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const summary = await billingService.getBillingSummary(request.storeId);
    return summary;
  });

  // GET /api/v1/merchant/billing/invoices — Paginated invoice list for the store
  fastify.get('/invoices', {
    schema: {
      tags: ['Merchant Billing'],
      summary: 'List invoices',
      description: 'List all invoices for the authenticated store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = paginationQuerySchema.parse(request.query);
    const page = Math.max(1, query.page);
    const limit = Math.max(1, query.limit);
    return billingService.listInvoices(request.storeId, page, limit);
  });

  // POST /api/v1/merchant/billing/upgrade — Upgrade or downgrade plan
  fastify.post('/upgrade', {
    preHandler: requirePermission('billing:write'),
    schema: {
      tags: ['Merchant Billing'],
      summary: 'Upgrade plan',
      description: 'Change the store subscription plan',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parsed = upgradePlanSchema.parse(request.body);
    const result = await billingService.upgradePlan(request.storeId, parsed.planId);
    reply.status(201).send(result);
  });
}

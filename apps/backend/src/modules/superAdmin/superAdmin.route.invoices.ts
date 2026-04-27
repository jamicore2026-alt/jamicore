// SuperAdmin Invoice Routes
import { FastifyInstance } from 'fastify';
import { superAdminService } from './superAdmin.service.js';
import { invoiceListQuerySchema, createInvoiceSchema, updateInvoiceSchema, idParamSchema } from './superAdmin.schema.js';
import { ErrorCodes } from '../../errors/codes.js';

export default async function superAdminInvoiceRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/invoices - List all invoices
  fastify.get('/', {
    schema: {
      tags: ['SuperAdmin Invoices'],
      summary: 'List invoices',
      description: 'List all platform invoices with optional filters',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = invoiceListQuerySchema.parse(request.query);
    return superAdminService.listInvoices(query);
  });

  // POST /api/v1/admin/invoices - Create an invoice
  fastify.post('/', {
    schema: {
      tags: ['SuperAdmin Invoices'],
      summary: 'Create invoice',
      description: 'Create a new invoice for a merchant',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const body = createInvoiceSchema.parse(request.body);
    const invoice = await superAdminService.createInvoice({
      storeId: body.storeId,
      planId: body.planId,
      amount: body.amount,
      periodStart: body.periodStart ? new Date(body.periodStart) : undefined,
      periodEnd: body.periodEnd ? new Date(body.periodEnd) : undefined,
      notes: body.notes,
    });
    await superAdminService.createNotification({
      type: 'invoice_created',
      title: 'Invoice Created',
      body: `New invoice for $${body.amount} created`,
      targetStoreId: body.storeId,
    });
    return { invoice };
  });

  // GET /api/v1/admin/invoices/:id - Get invoice detail
  fastify.get('/:id', {
    schema: {
      tags: ['SuperAdmin Invoices'],
      summary: 'Get invoice',
      description: 'Get invoice detail',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    try {
      const invoice = await superAdminService.getInvoice(id);
      return { invoice };
    } catch (err: any) {
      if (err.code === ErrorCodes.NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: ErrorCodes.NOT_FOUND, message: 'Invoice not found' });
        return;
      }
      throw err;
    }
  });

  // PATCH /api/v1/admin/invoices/:id - Update invoice
  fastify.patch('/:id', {
    schema: {
      tags: ['SuperAdmin Invoices'],
      summary: 'Update invoice',
      description: 'Update invoice status or notes',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = updateInvoiceSchema.parse(request.body);
    try {
      const invoice = await superAdminService.updateInvoice(id, body);
      return { invoice };
    } catch (err: any) {
      if (err.code === ErrorCodes.NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: ErrorCodes.NOT_FOUND, message: 'Invoice not found' });
        return;
      }
      throw err;
    }
  });
}

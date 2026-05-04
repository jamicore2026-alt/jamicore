/* eslint-disable @typescript-eslint/no-explicit-any */
// Fastify API integration tests for merchant return routes.
// Tests the request->response cycle including Zod validation, status codes, and response shapes
// by mocking the service layer and using fastify.inject() for HTTP simulation.
import Fastify from 'fastify';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock returnService ───
vi.mock('./return.service.js', () => ({
  returnService: {
    listReturns: vi.fn() as any,
    getReturn: vi.fn() as any,
    updateStatus: vi.fn() as any,
  },
}));

import { returnService as _returnService } from './return.service.js';
import returnRoutes from './return.route.merchant.js';

// Cast to any to bypass Drizzle's complex return types on service methods
const returnService = _returnService as any;

// ─── Fixtures ───
const mockReturnRequest = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  storeId: 'test-store-id',
  orderId: '550e8400-e29b-41d4-a716-446655440002',
  customerId: '550e8400-e29b-41d4-a716-446655440003',
  status: 'requested',
  reason: 'Defective product',
  notes: null,
  adminNotes: null,
  refundAmount: null,
  refundMethod: null,
  refundTransactionId: null,
  shippedAt: null,
  receivedAt: null,
  inspectedAt: null,
  refundedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  items: [],
};

async function buildApp() {
  const fastify = Fastify();

  // Error handler matching production setup
  fastify.setErrorHandler((error: unknown, _request, reply) => {
    if (error && typeof error === 'object' && 'issues' in (error as object)) {
      const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
      reply.status(400).send({
        error: 'Validation Error',
        code: 'VALIDATION_ERROR',
        message: zodError.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      });
      return;
    }

    const err = error instanceof Error ? error : new Error(String(error));
    const code = 'code' in err ? (err as unknown as { code: string }).code : undefined;

    const codeToStatus: Record<string, number> = {
      ORDER_NOT_FOUND: 404,
      ORDER_CANCELLED: 409,
      ORDER_ALREADY_FULFILLED: 409,
      VALIDATION_ERROR: 400,
      RETURN_NOT_FOUND: 404,
      RETURN_INVALID_STATUS: 409,
    };

    const statusCode = (code && codeToStatus[code]) || 500;
    reply.status(statusCode).send({
      error: err.name || 'Internal Server Error',
      ...(code ? { code } : {}),
      message: err.message,
    });
  });

  fastify.addHook('onRequest', async (request: any) => {
    request.storeId = 'test-store-id';
    request.userId = 'test-user-id';
    request.userRole = 'OWNER';
  });

  await fastify.register(returnRoutes, { prefix: '/returns' });
  return fastify;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════
// GET /returns — list returns
// ═══════════════════════════════════════════
describe('GET /returns', () => {
  it('returns returns with default pagination', async () => {
    const mockResult = {
      data: [mockReturnRequest],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    vi.mocked(returnService.listReturns).mockResolvedValueOnce(mockResult);

    const fastify = await buildApp();
    const response = await fastify.inject({ method: 'GET', url: '/returns' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(mockResult);
    expect(returnService.listReturns).toHaveBeenCalledWith('test-store-id', {
      page: 1,
      limit: 20,
    });
    await fastify.close();
  });

  it('passes query params for pagination and status filter', async () => {
    const mockResult = {
      data: [],
      pagination: { page: 2, limit: 10, total: 0, totalPages: 0 },
    };
    vi.mocked(returnService.listReturns).mockResolvedValueOnce(mockResult);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/returns?page=2&limit=10&status=requested',
    });

    expect(response.statusCode).toBe(200);
    expect(returnService.listReturns).toHaveBeenCalledWith('test-store-id', {
      page: 2,
      limit: 10,
      status: 'requested',
    });
    await fastify.close();
  });

  it('rejects invalid status value', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/returns?status=invalid_status',
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });

  it('rejects negative page number', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/returns?page=-1',
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });

  it('rejects limit exceeding max (100)', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/returns?limit=101',
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });
});

// ═══════════════════════════════════════════
// GET /returns/:id — get return detail
// ═══════════════════════════════════════════
describe('GET /returns/:id', () => {
  it('returns a return by ID', async () => {
    vi.mocked(returnService.getReturn).mockResolvedValueOnce(mockReturnRequest);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/returns/550e8400-e29b-41d4-a716-446655440001',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ returnRequest: mockReturnRequest });
    expect(returnService.getReturn).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440001',
      'test-store-id',
    );
    await fastify.close();
  });

  it('returns 404 when return not found (service throws)', async () => {
    vi.mocked(returnService.getReturn).mockRejectedValueOnce(
      Object.assign(new Error('Return not found'), { code: 'RETURN_NOT_FOUND' }),
    );

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/returns/550e8400-e29b-41d4-a716-446655440001',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe('RETURN_NOT_FOUND');
    await fastify.close();
  });

  it('rejects invalid id format (non-uuid)', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/returns/not-a-uuid',
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });
});

// ═══════════════════════════════════════════
// PATCH /returns/:id/status — update status
// ═══════════════════════════════════════════
describe('PATCH /returns/:id/status', () => {
  it('updates return status and returns the return', async () => {
    const updated = { ...mockReturnRequest, status: 'approved', adminNotes: 'Approved by merchant' };
    vi.mocked(returnService.updateStatus).mockResolvedValueOnce(updated);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/returns/550e8400-e29b-41d4-a716-446655440001/status',
      payload: { status: 'approved', adminNotes: 'Approved by merchant' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ returnRequest: updated });
    expect(returnService.updateStatus).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440001',
      'test-store-id',
      'approved',
      'Approved by merchant',
    );
    await fastify.close();
  });

  it('accepts all valid status values', async () => {
    const validStatuses = ['requested', 'approved', 'received', 'inspected', 'refunded', 'rejected', 'cancelled'];
    for (const status of validStatuses) {
      vi.mocked(returnService.updateStatus).mockResolvedValueOnce({ ...mockReturnRequest, status });

      const fastify = await buildApp();
      const response = await fastify.inject({
        method: 'PATCH',
        url: '/returns/550e8400-e29b-41d4-a716-446655440001/status',
        payload: { status },
      });

      expect(response.statusCode).toBe(200);
      expect(returnService.updateStatus).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440001',
        'test-store-id',
        status,
        undefined,
      );
      await fastify.close();
    }
  });

  it('rejects invalid status value', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/returns/550e8400-e29b-41d4-a716-446655440001/status',
      payload: { status: 'unknown_status' },
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });

  it('rejects missing status field', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/returns/550e8400-e29b-41d4-a716-446655440001/status',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });

  it('rejects invalid id format (non-uuid)', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/returns/not-a-uuid/status',
      payload: { status: 'approved' },
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });

  it('returns 409 for invalid status transition (requested -> refunded)', async () => {
    vi.mocked(returnService.updateStatus).mockRejectedValueOnce(
      Object.assign(
        new Error('Invalid status transition from requested to refunded'),
        { code: 'RETURN_INVALID_STATUS' },
      ),
    );

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/returns/550e8400-e29b-41d4-a716-446655440001/status',
      payload: { status: 'refunded' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe('RETURN_INVALID_STATUS');
    await fastify.close();
  });

  it('returns 404 when return not found on status update', async () => {
    vi.mocked(returnService.updateStatus).mockRejectedValueOnce(
      Object.assign(new Error('Return not found'), { code: 'RETURN_NOT_FOUND' }),
    );

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/returns/550e8400-e29b-41d4-a716-446655440001/status',
      payload: { status: 'approved' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe('RETURN_NOT_FOUND');
    await fastify.close();
  });
});

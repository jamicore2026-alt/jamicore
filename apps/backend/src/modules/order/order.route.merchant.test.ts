/* eslint-disable @typescript-eslint/no-explicit-any */
// Fastify API integration tests for merchant order routes.
// Tests the request->response cycle including Zod validation, status codes, and response shapes
// by mocking the service layer and using fastify.inject() for HTTP simulation.
import Fastify from 'fastify';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock orderService ───
vi.mock('./order.service.js', () => ({
  orderService: {
    findByStoreId: vi.fn() as any,
    findById: vi.fn() as any,
    updateStatus: vi.fn() as any,
  },
}));

import { orderService as _orderService } from './order.service.js';
import orderRoutes from './order.route.merchant.js';

// Cast to any to bypass Drizzle's complex return types on service methods
const orderService = _orderService as any;

// ─── Fixtures ───
const mockOrder = {
  id: 'order-1',
  storeId: 'test-store-id',
  orderNumber: 'ORD-ABC123',
  email: 'customer@example.com',
  status: 'pending',
  total: '99.99',
  items: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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
  await fastify.register(orderRoutes, { prefix: '/orders' });
  return fastify;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════
// GET /orders — list orders
// ═══════════════════════════════════════════
describe('GET /orders', () => {
  it('returns orders with default pagination', async () => {
    const mockResult = {
      data: [mockOrder],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    vi.mocked(orderService.findByStoreId).mockResolvedValueOnce(mockResult);

    const fastify = await buildApp();
    const response = await fastify.inject({ method: 'GET', url: '/orders' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(mockResult);
    expect(orderService.findByStoreId).toHaveBeenCalledWith('test-store-id', {
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
    vi.mocked(orderService.findByStoreId).mockResolvedValueOnce(mockResult);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/orders?page=2&limit=10&status=shipped',
    });

    expect(response.statusCode).toBe(200);
    expect(orderService.findByStoreId).toHaveBeenCalledWith('test-store-id', {
      page: 2,
      limit: 10,
      status: 'shipped',
    });
    await fastify.close();
  });

  it('rejects invalid status value', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/orders?status=invalid_status',
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });

  it('rejects negative page number', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/orders?page=-1',
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });

  it('rejects limit exceeding max (100)', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/orders?limit=101',
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });
});

// ═══════════════════════════════════════════
// GET /orders/:id — get order detail
// ═══════════════════════════════════════════
describe('GET /orders/:id', () => {
  it('returns an order by ID', async () => {
    vi.mocked(orderService.findById).mockResolvedValueOnce(mockOrder);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/orders/550e8400-e29b-41d4-a716-446655440099',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ order: mockOrder });
    expect(orderService.findById).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440099',
      'test-store-id',
    );
    await fastify.close();
  });

  it('returns 404 when order not found (service throws)', async () => {
    vi.mocked(orderService.findById).mockRejectedValueOnce(
      Object.assign(new Error('Order not found'), { code: 'ORDER_NOT_FOUND' }),
    );

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/orders/550e8400-e29b-41d4-a716-446655440099',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe('ORDER_NOT_FOUND');
    await fastify.close();
  });

  it('rejects invalid id format (non-uuid)', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/orders/not-a-uuid',
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });
});

// ═══════════════════════════════════════════
// PATCH /orders/:id/status — update status
// ═══════════════════════════════════════════
describe('PATCH /orders/:id/status', () => {
  it('updates order status and returns the order', async () => {
    const updated = { ...mockOrder, status: 'shipped' };
    vi.mocked(orderService.updateStatus).mockResolvedValueOnce(updated);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/orders/550e8400-e29b-41d4-a716-446655440099/status',
      payload: { status: 'shipped' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ order: updated });
    expect(orderService.updateStatus).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440099',
      'test-store-id',
      'shipped',
    );
    await fastify.close();
  });

  it('accepts all valid status values', async () => {
    for (const status of ['pending', 'processing', 'shipped', 'delivered', 'cancelled']) {
      vi.mocked(orderService.updateStatus).mockResolvedValueOnce({ ...mockOrder, status });

      const fastify = await buildApp();
      const response = await fastify.inject({
        method: 'PATCH',
        url: '/orders/550e8400-e29b-41d4-a716-446655440099/status',
        payload: { status },
      });

      expect(response.statusCode).toBe(200);
      expect(orderService.updateStatus).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440099',
        'test-store-id',
        status,
      );
      await fastify.close();
    }
  });

  it('rejects invalid status value', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/orders/550e8400-e29b-41d4-a716-446655440099/status',
      payload: { status: 'unknown_status' },
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });

  it('rejects missing status field', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/orders/550e8400-e29b-41d4-a716-446655440099/status',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });

  it('rejects invalid id format (non-uuid)', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/orders/not-a-uuid/status',
      payload: { status: 'shipped' },
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });
});
/* eslint-disable @typescript-eslint/no-explicit-any */
// Fastify API integration tests for merchant store routes.
// Tests the request->response cycle including Zod validation, status codes, and response shapes
// by mocking the service layer and using fastify.inject() for HTTP simulation.
import Fastify from 'fastify';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock storeService ───
vi.mock('./store.service.js', () => ({
  storeService: {
    findByIdOrFail: vi.fn(),
    update: vi.fn(),
  },
}));

import { storeService as _storeService } from './store.service.js';
const storeService = _storeService as any;
import storeRoutes from './store.route.merchant.js';

// ─── Fixtures ───
const mockStore = {
  id: 'store-1',
  name: 'My Store',
  domain: 'mystore.example.com',
  primaryColor: '#0ea5e9',
  secondaryColor: '#1e293b',
  accentColor: '#f59e0b',
  backgroundColor: '#ffffff',
  surfaceColor: '#f8fafc',
  textColor: '#0f172a',
  textSecondaryColor: '#64748b',
  borderColor: '#e2e8f0',
  borderRadius: '8px',
  fontFamily: 'Inter, sans-serif',
  logoUrl: 'https://example.com/logo.png',
  faviconUrl: 'https://example.com/favicon.ico',
  activeTheme: 'default',
  currency: 'USD',
  language: 'en',
  ownerEmail: 'owner@example.com',
  ownerName: 'Store Owner',
  ownerPhone: '+1234567890',
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
      STORE_NOT_FOUND: 404,
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
  await fastify.register(storeRoutes, { prefix: '/store' });
  return fastify;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════
// GET /store — get store info
// ═══════════════════════════════════════════
describe('GET /store', () => {
  it('returns store info with sensitive fields stripped', async () => {
    (storeService.findByIdOrFail).mockResolvedValueOnce(mockStore);

    const fastify = await buildApp();
    const response = await fastify.inject({ method: 'GET', url: '/store' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.store).toBeDefined();
    // Verify sensitive fields are stripped
    expect(body.store.ownerEmail).toBeUndefined();
    expect(body.store.ownerName).toBeUndefined();
    expect(body.store.ownerPhone).toBeUndefined();
    // Verify public fields are present
    expect(body.store.id).toBe('store-1');
    expect(body.store.name).toBe('My Store');
    expect(body.store.domain).toBe('mystore.example.com');
    expect(storeService.findByIdOrFail).toHaveBeenCalledWith('test-store-id');
    await fastify.close();
  });

  it('returns 404 when store not found (service throws)', async () => {
    (storeService.findByIdOrFail).mockRejectedValueOnce(
      Object.assign(new Error('Store not found'), { code: 'STORE_NOT_FOUND' }),
    );

    const fastify = await buildApp();
    const response = await fastify.inject({ method: 'GET', url: '/store' });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe('STORE_NOT_FOUND');
    await fastify.close();
  });
});

// ═══════════════════════════════════════════
// PATCH /store — update store settings
// ═══════════════════════════════════════════
describe('PATCH /store', () => {
  it('updates store name and returns updated store with sensitive fields stripped', async () => {
    const updated = { ...mockStore, name: 'Updated Store' };
    (storeService.update).mockResolvedValueOnce(updated);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/store',
      payload: { name: 'Updated Store' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.store).toBeDefined();
    expect(body.store.ownerEmail).toBeUndefined();
    expect(body.store.ownerName).toBeUndefined();
    expect(body.store.ownerPhone).toBeUndefined();
    expect(body.store.name).toBe('Updated Store');
    expect(storeService.update).toHaveBeenCalledWith('test-store-id', { name: 'Updated Store' });
    await fastify.close();
  });

  it('updates theme-related fields (colors, fonts, radius)', async () => {
    const updated = {
      ...mockStore,
      primaryColor: '#ff0000',
      borderRadius: '16px',
      fontFamily: 'Roboto, sans-serif',
    };
    (storeService.update).mockResolvedValueOnce(updated);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/store',
      payload: {
        primaryColor: '#ff0000',
        borderRadius: '16px',
        fontFamily: 'Roboto, sans-serif',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(storeService.update).toHaveBeenCalledWith('test-store-id', {
      primaryColor: '#ff0000',
      borderRadius: '16px',
      fontFamily: 'Roboto, sans-serif',
    });
    await fastify.close();
  });

  it('rejects invalid hex color format', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/store',
      payload: { primaryColor: 'red' },
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });

  it('rejects invalid borderRadius format', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/store',
      payload: { borderRadius: '12em' },
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });

  it('rejects invalid fontFamily format (contains script injection)', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/store',
      payload: { fontFamily: '<script>alert(1)</script>' },
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });

  it('rejects invalid url for logoUrl', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/store',
      payload: { logoUrl: 'not-a-url' },
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });

  it('accepts rgba color for borderColor', async () => {
    const updated = { ...mockStore, borderColor: 'rgba(0, 0, 0, 0.5)' };
    (storeService.update).mockResolvedValueOnce(updated);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/store',
      payload: { borderColor: 'rgba(0, 0, 0, 0.5)' },
    });

    expect(response.statusCode).toBe(200);
    await fastify.close();
  });

  it('accepts hex color for borderColor', async () => {
    const updated = { ...mockStore, borderColor: '#e2e8f0' };
    (storeService.update).mockResolvedValueOnce(updated);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/store',
      payload: { borderColor: '#e2e8f0' },
    });

    expect(response.statusCode).toBe(200);
    await fastify.close();
  });
});
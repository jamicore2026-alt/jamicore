// Fastify API integration tests for public cart routes.
// Tests the request->response cycle including Zod validation, status codes, and response shapes
// by mocking the service layer and using fastify.inject() for HTTP simulation.
import Fastify from 'fastify';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock cartService ───
vi.mock('./cart.service.js', () => ({
  cartService: {
    getOrCreateCart: vi.fn() as any,
    addItem: vi.fn() as any,
    updateItemQuantity: vi.fn() as any,
    removeItem: vi.fn() as any,
  },
}));

// Mock pricingService since cartService.addItem imports it internally
vi.mock('../pricing/pricing.service.js', () => ({
  pricingService: {
    computeItemPrice: vi.fn() as any,
  },
}));

// Mock cartRepo since route handlers call it directly
vi.mock('./cart.repo.js', () => ({
  cartRepo: {
    findCartById: vi.fn() as any,
    findItemById: vi.fn() as any,
  },
}));

import { cartService as _cartService } from './cart.service.js';
import { cartRepo as _cartRepo } from './cart.repo.js';
import cartRoutes from './cart.route.public.js';

// Cast to any to bypass complex return types on service methods
const cartService = _cartService as any;
const cartRepo = _cartRepo as any;

// ─── Fixtures ───
const mockCart = {
  id: 'cart-1',
  storeId: 'test-store-id',
  sessionId: 'session-1',
  subtotal: '19.99',
  total: '19.99',
  itemCount: 1,
  items: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockCartItem = {
  id: 'item-1',
  cartId: 'cart-1',
  productId: '550e8400-e29b-41d4-a716-446655440001',
  quantity: 2,
  price: '9.99',
  total: '19.98',
  modifiers: null,
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
      STORE_NOT_FOUND: 400,
      CART_NOT_FOUND: 404,
      CART_ITEM_NOT_FOUND: 404,
      VALIDATION_ERROR: 400,
    };

    const statusCode = (code && codeToStatus[code]) || 500;
    reply.status(statusCode).send({
      error: err.name || 'Internal Server Error',
      ...(code ? { code } : {}),
      message: err.message,
    });
  });

  // Register cookie support
  await fastify.register(import('@fastify/cookie'));
  (fastify as any).decorate('queueService', { add: vi.fn().mockResolvedValue(undefined) });
  fastify.addHook('onRequest', async (request: any) => {
    request.storeId = 'test-store-id';
  });
  await fastify.register(cartRoutes, { prefix: '/cart' });
  return fastify;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════
// GET /cart — get or create cart
// ═══════════════════════════════════════════
describe('GET /cart', () => {
  it('returns existing cart when cookie is present', async () => {
    vi.mocked(cartService.getOrCreateCart).mockResolvedValueOnce({
      cart: mockCart,
      isNew: false,
    });

    const fastify = await buildApp();
    vi.mocked(cartRepo.findCartById).mockResolvedValueOnce(mockCart);
    const response = await fastify.inject({
      method: 'GET',
      url: '/cart',
      cookies: { cartId: 'cart-1' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ cart: mockCart });
    expect(cartService.getOrCreateCart).toHaveBeenCalledWith('cart-1', 'test-store-id');
    await fastify.close();
  });

  it('creates a new cart and sets cookie when no cartId cookie', async () => {
    vi.mocked(cartService.getOrCreateCart).mockResolvedValueOnce({
      cart: mockCart,
      isNew: true,
    });

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/cart',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ cart: mockCart });
    expect(cartService.getOrCreateCart).toHaveBeenCalledWith(undefined, 'test-store-id');
    // Verify the set-cookie header is present
    const setCookie = response.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    await fastify.close();
  });

  it('returns 400 when storeId is missing', async () => {
    const fastify = Fastify();
    // No storeId hook — simulates missing store context
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
      reply.status(500).send({ error: err.name, message: err.message });
    });
    await fastify.register(import('@fastify/cookie'));
    await fastify.register(cartRoutes, { prefix: '/cart' });

    const response = await fastify.inject({
      method: 'GET',
      url: '/cart',
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.code).toBe('STORE_NOT_FOUND');
    await fastify.close();
  });
});

// ═══════════════════════════════════════════
// POST /cart/items — add item to cart
// ═══════════════════════════════════════════
describe('POST /cart/items', () => {
  it('adds an item to existing cart', async () => {
    const addItemResult = { cart: mockCart, item: mockCartItem };
    vi.mocked(cartService.addItem).mockResolvedValueOnce(addItemResult);
    vi.mocked(cartRepo.findCartById).mockResolvedValueOnce(mockCart);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'POST',
      url: '/cart/items',
      payload: {
        productId: '550e8400-e29b-41d4-a716-446655440001',
        quantity: 2,
      },
      cookies: { cartId: 'cart-1' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(addItemResult);
    expect(cartService.addItem).toHaveBeenCalledWith('cart-1', 'test-store-id', {
      productId: '550e8400-e29b-41d4-a716-446655440001',
      quantity: 2,
      bundleId: undefined,
      variantOptionIds: undefined,
      combinationKey: undefined,
      modifierOptionIds: undefined,
    }, undefined, expect.any(Object));
    await fastify.close();
  });

  it('creates a new cart when no cartId cookie and adds item', async () => {
    // First call: getOrCreateCart from the route's own cart check
    vi.mocked(cartService.getOrCreateCart).mockResolvedValueOnce({
      cart: mockCart,
      isNew: true,
    });

    const addItemResult = { cart: mockCart, item: mockCartItem };
    vi.mocked(cartService.addItem).mockResolvedValueOnce(addItemResult);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'POST',
      url: '/cart/items',
      payload: {
        productId: '550e8400-e29b-41d4-a716-446655440001',
        quantity: 1,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(cartService.getOrCreateCart).toHaveBeenCalledWith(undefined, 'test-store-id');
    expect(cartService.addItem).toHaveBeenCalled();
    await fastify.close();
  });

  it('rejects missing required productId', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'POST',
      url: '/cart/items',
      payload: { quantity: 1 },
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });

  it('rejects invalid productId (non-uuid)', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'POST',
      url: '/cart/items',
      payload: {
        productId: 'not-a-uuid',
        quantity: 1,
      },
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });

  it('rejects zero quantity', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'POST',
      url: '/cart/items',
      payload: {
        productId: '550e8400-e29b-41d4-a716-446655440001',
        quantity: 0,
      },
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });

  it('accepts optional variantOptionIds and modifierOptionIds', async () => {
    const addItemResult = { cart: mockCart, item: mockCartItem };
    vi.mocked(cartService.addItem).mockResolvedValueOnce(addItemResult);
    vi.mocked(cartRepo.findCartById).mockResolvedValueOnce(mockCart);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'POST',
      url: '/cart/items',
      payload: {
        productId: '550e8400-e29b-41d4-a716-446655440001',
        quantity: 2,
        variantOptionIds: ['550e8400-e29b-41d4-a716-446655440010'],
        combinationKey: 'red-large',
        modifierOptionIds: ['550e8400-e29b-41d4-a716-446655440020'],
      },
      cookies: { cartId: 'cart-1' },
    });

    expect(response.statusCode).toBe(200);
    expect(cartService.addItem).toHaveBeenCalledWith('cart-1', 'test-store-id', {
      productId: '550e8400-e29b-41d4-a716-446655440001',
      quantity: 2,
      variantOptionIds: ['550e8400-e29b-41d4-a716-446655440010'],
      combinationKey: 'red-large',
      modifierOptionIds: ['550e8400-e29b-41d4-a716-446655440020'],
    }, undefined, expect.any(Object));
    await fastify.close();
  });

  it('returns 400 when storeId is missing', async () => {
    const fastify = Fastify();
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
      reply.status(500).send({ error: err.name, message: err.message });
    });
    await fastify.register(import('@fastify/cookie'));
    await fastify.register(cartRoutes, { prefix: '/cart' });

    const response = await fastify.inject({
      method: 'POST',
      url: '/cart/items',
      payload: {
        productId: '550e8400-e29b-41d4-a716-446655440001',
        quantity: 1,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.code).toBe('STORE_NOT_FOUND');
    await fastify.close();
  });
});

// ═══════════════════════════════════════════
// PATCH /cart/items/:itemId — update item quantity
// ═══════════════════════════════════════════
describe('PATCH /cart/items/:itemId', () => {
  it('updates item quantity and returns updated cart + item', async () => {
    const updateResult = { cart: mockCart, item: { ...mockCartItem, quantity: 5, total: '49.95' } };
    vi.mocked(cartService.updateItemQuantity).mockResolvedValueOnce(updateResult);
    vi.mocked(cartRepo.findCartById).mockResolvedValueOnce(mockCart);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/cart/items/550e8400-e29b-41d4-a716-446655440050',
      payload: { quantity: 5 },
      cookies: { cartId: 'cart-1' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(updateResult);
    expect(cartService.updateItemQuantity).toHaveBeenCalledWith(
      'cart-1',
      '550e8400-e29b-41d4-a716-446655440050',
      5,
      'test-store-id',
      undefined,
      expect.any(Object),
    );
    await fastify.close();
  });

  it('returns 404 when no cartId cookie', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/cart/items/550e8400-e29b-41d4-a716-446655440050',
      payload: { quantity: 5 },
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.code).toBe('CART_NOT_FOUND');
    await fastify.close();
  });

  it('returns 404 when cart item not found (service throws)', async () => {
    vi.mocked(cartService.updateItemQuantity).mockRejectedValueOnce(
      Object.assign(new Error('Cart item not found'), { code: 'CART_ITEM_NOT_FOUND' }),
    );
    vi.mocked(cartRepo.findCartById).mockResolvedValueOnce(mockCart);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/cart/items/550e8400-e29b-41d4-a716-446655440050',
      payload: { quantity: 5 },
      cookies: { cartId: 'cart-1' },
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.code).toBe('CART_ITEM_NOT_FOUND');
    await fastify.close();
  });

  it('rejects invalid itemId (non-uuid)', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/cart/items/not-a-uuid',
      payload: { quantity: 5 },
      cookies: { cartId: 'cart-1' },
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });

  it('rejects missing quantity', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/cart/items/550e8400-e29b-41d4-a716-446655440050',
      payload: {},
      cookies: { cartId: 'cart-1' },
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });

  it('rejects zero or negative quantity', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/cart/items/550e8400-e29b-41d4-a716-446655440050',
      payload: { quantity: 0 },
      cookies: { cartId: 'cart-1' },
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });
});

// ═══════════════════════════════════════════
// DELETE /cart/items/:itemId — remove item
// ═══════════════════════════════════════════
describe('DELETE /cart/items/:itemId', () => {
  it('removes an item and returns updated cart', async () => {
    const removeResult = { cart: { ...mockCart, itemCount: 0, total: '0' } };
    vi.mocked(cartService.removeItem).mockResolvedValueOnce(removeResult);
    vi.mocked(cartRepo.findCartById).mockResolvedValueOnce(mockCart);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'DELETE',
      url: '/cart/items/550e8400-e29b-41d4-a716-446655440050',
      cookies: { cartId: 'cart-1' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(removeResult);
    expect(cartService.removeItem).toHaveBeenCalledWith(
      'cart-1',
      '550e8400-e29b-41d4-a716-446655440050',
      expect.any(String),
    );
    await fastify.close();
  });

  it('returns 404 when no cartId cookie', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'DELETE',
      url: '/cart/items/550e8400-e29b-41d4-a716-446655440050',
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.code).toBe('CART_NOT_FOUND');
    await fastify.close();
  });

  it('rejects invalid itemId (non-uuid)', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'DELETE',
      url: '/cart/items/not-a-uuid',
      cookies: { cartId: 'cart-1' },
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });
});
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCart,
  openCartDrawer,
  closeCartDrawer,
  refreshCart,
  addToCart,
  updateCartItemQuantity,
  removeCartItem,
  cartItemCount,
} from './cart.svelte.js';

const mockCart = {
  id: 'cart-1',
  storeId: 'store-1',
  customerId: 'customer-1',
  itemCount: 2,
  items: [
    { id: 'item-1', productId: 'prod-1', quantity: 1, price: '10.00', total: '10.00' },
    { id: 'item-2', productId: 'prod-2', quantity: 1, price: '20.00', total: '20.00' },
  ],
};

describe('cart store', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    closeCartDrawer();
    getCart().cart = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with null cart and closed drawer', () => {
    const state = getCart();
    expect(state.cart).toBeNull();
    expect(state.drawerOpen).toBe(false);
    expect(state.loading).toBe(false);
  });

  it('opens and closes drawer', () => {
    openCartDrawer();
    expect(getCart().drawerOpen).toBe(true);
    closeCartDrawer();
    expect(getCart().drawerOpen).toBe(false);
  });

  it('refreshCart fetches and sets cart', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ cart: mockCart }),
    });

    await refreshCart();

    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/public/cart', {
      credentials: 'include',
    });
    expect(getCart().cart).toEqual(mockCart);
    expect(getCart().loading).toBe(false);
  });

  it('addToCart posts item and opens drawer on success', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ cart: mockCart }),
    });

    const result = await addToCart('prod-1', 2, undefined, undefined, undefined, undefined);

    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/public/cart/items', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }));
    expect(getCart().drawerOpen).toBe(true);
    expect(getCart().cart).toEqual(mockCart);
  });

  it('addToCart returns false on failure', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
    });

    const result = await addToCart('prod-1', 1);

    expect(result).toBe(false);
    expect(getCart().drawerOpen).toBe(false);
  });

  it('updateCartItemQuantity patches item and updates cart', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ cart: mockCart }),
    });

    await updateCartItemQuantity('item-1', 3);

    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/public/cart/items/item-1', expect.objectContaining({
      method: 'PATCH',
      credentials: 'include',
      body: JSON.stringify({ quantity: 3 }),
    }));
    expect(getCart().cart).toEqual(mockCart);
  });

  it('removeCartItem deletes item and updates cart', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ cart: mockCart }),
    });

    await removeCartItem('item-1');

    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/public/cart/items/item-1', expect.objectContaining({
      method: 'DELETE',
      credentials: 'include',
    }));
    expect(getCart().cart).toEqual(mockCart);
  });

  it('cartItemCount returns 0 when cart is null', () => {
    getCart().cart = null;
    expect(cartItemCount()).toBe(0);
  });

  it('cartItemCount returns itemCount from cart', () => {
    getCart().cart = mockCart as any;
    expect(cartItemCount()).toBe(2);
  });
});

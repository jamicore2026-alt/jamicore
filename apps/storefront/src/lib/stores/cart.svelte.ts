import type { Cart, CartItem } from '@repo/shared-types';
import { getCookie } from '$lib/api/client.js';

// Simple reactive cart state using Svelte 5 runes pattern
// This module is imported into components that need cart state

const cartState = $state<{
  cart: Cart | null;
  loading: boolean;
  drawerOpen: boolean;
}>({
  cart: null,
  loading: false,
  drawerOpen: false,
});

export function getCart() {
  return cartState;
}

export function openCartDrawer() {
  cartState.drawerOpen = true;
}

export function closeCartDrawer() {
  cartState.drawerOpen = false;
}

export async function refreshCart() {
  cartState.loading = true;
  try {
    const res = await fetch('/api/v1/public/cart', {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      cartState.cart = data.cart ?? null;
    }
  } catch (err) {
    console.error('Cart fetch failed:', err);
  } finally {
    cartState.loading = false;
  }
}

export async function addToCart(
  productId: string,
  quantity = 1,
  bundleId?: string,
  variantOptionIds?: string[],
  combinationKey?: string,
  modifierOptionIds?: string[],
) {
  try {
    const csrfToken = getCookie('csrf_token');
    const res = await fetch('/api/v1/public/cart/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({
        productId,
        quantity,
        bundleId: bundleId || undefined,
        variantOptionIds: variantOptionIds?.length ? variantOptionIds : undefined,
        combinationKey: combinationKey || undefined,
        modifierOptionIds: modifierOptionIds?.length ? modifierOptionIds : undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      cartState.cart = data.cart ?? null;
      cartState.drawerOpen = true; // Open drawer on add
      return true;
    }
    return false;
  } catch (err) {
    console.error('Add to cart failed:', err);
    return false;
  }
}

export async function updateCartItemQuantity(itemId: string, quantity: number) {
  try {
    const csrfToken = getCookie('csrf_token');
    const res = await fetch(`/api/v1/public/cart/items/${itemId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ quantity }),
    });
    if (res.ok) {
      const data = await res.json();
      cartState.cart = data.cart ?? null;
    }
  } catch (err) {
    console.error('Cart item update failed:', err);
  }
}

export async function removeCartItem(itemId: string) {
  try {
    const csrfToken = getCookie('csrf_token');
    const res = await fetch(`/api/v1/public/cart/items/${itemId}`, {
      method: 'DELETE',
      headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      cartState.cart = data.cart ?? null;
    }
  } catch (err) {
    console.error('Cart item removal failed:', err);
  }
}

export function cartItemCount(): number {
  return cartState.cart?.itemCount ?? 0;
}
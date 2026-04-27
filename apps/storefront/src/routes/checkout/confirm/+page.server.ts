import type { PageServerLoad } from './$types.js';
import type { Cart } from '@repo/shared-types';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ cookies, url, fetch, parent }) => {
  const parentData = await parent();

  const host = url.hostname;
  const subdomain = host.split('.')[0];
  const storeDomain = subdomain !== 'localhost' && subdomain !== '127' ? subdomain : undefined;
  const headers: Record<string, string> = {};
  if (storeDomain) headers['X-Store-Domain'] = storeDomain;

  const cartId = cookies.get('cartId');
  if (cartId) headers['Cookie'] = `cartId=${cartId}`;

  let cart: Cart | null = null;
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/cart`, { headers });
    if (res.ok) {
      const data = await res.json();
      cart = data.cart ?? null;
    }
  } catch {
    // continue
  }

  return {
    cart,
    isLoggedIn: parentData.isLoggedIn,
  };
};
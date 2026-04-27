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

  // Fetch enabled payment providers for this store
  let paymentProviders: Array<{ provider: string; isEnabled: boolean }> = [];
  try {
    const accessToken = cookies.get('access_token');
    const authHeaders = { ...headers };
    if (accessToken) authHeaders['Cookie'] = `access_token=${accessToken}`;
    // Use merchant endpoint since we need to see configured providers
    // The public store context resolves the storeId via Host header
    const res = await fetch(`${API_BASE}/api/v1/public/payments/providers`, {
      headers,
    });
    if (res.ok) {
      const data = await res.json();
      paymentProviders = data.providers ?? [];
    }
  } catch {
    // continue
  }

  return {
    cart,
    paymentProviders,
    isLoggedIn: parentData.isLoggedIn,
  };
};
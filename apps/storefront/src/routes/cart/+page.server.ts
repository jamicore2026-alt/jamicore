import type { PageServerLoad } from './$types.js';
import type { Cart } from '@repo/shared-types';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ cookies, url, fetch }) => {
  const host = url.hostname;
  const subdomain = host.split('.')[0];
  const storeDomain = subdomain !== 'localhost' && subdomain !== '127' ? subdomain : undefined;
  const headers: Record<string, string> = {};
  if (storeDomain) headers['X-Store-Domain'] = storeDomain;

  // Forward cart cookies
  const cartId = cookies.get('cartId');
  if (cartId) headers['Cookie'] = `cartId=${cartId}`;

  let cart: Cart | null = null;
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/cart`, { headers });
    if (res.ok) {
      const data = await res.json();
      cart = data.cart ?? null;

      // Capture Set-Cookie from backend for cartId
      const setCookie = res.headers.getSetCookie();
      for (const header of setCookie) {
        const match = header.match(/^cartId=([^;]+)/);
        if (match) {
          cookies.set('cartId', match[1], {
            path: '/',
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 30, // 30 days
          });
        }
      }
    }
  } catch {
    // continue without cart
  }

  return { cart };
};
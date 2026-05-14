import type { LayoutServerLoad } from './$types.js';
import { safeDecodeJWT, getAuthScope } from '@repo/shared-utils/jwt';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load: LayoutServerLoad = async ({ cookies, url, fetch }) => {
  const host = url.hostname;
  const subdomain = host.split('.')[0];
  const storeDomain = subdomain !== 'localhost' && subdomain !== '127'
    ? subdomain
    : undefined;

  let store = null;
  if (storeDomain) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/public/store`, {
        headers: { 'X-Store-Domain': storeDomain },
      });
      if (res.ok) {
        const data = await res.json();
        store = data.store ?? data;
      }
    } catch {
      // Store fetch failed
    }
  }

  const accessToken = cookies.get('access_token');
  const payload = safeDecodeJWT(accessToken);
  const scope = payload ? getAuthScope(payload) : null;
  const isLoggedIn = scope === 'customer';

  return {
    store,
    isLoggedIn,
  };
};

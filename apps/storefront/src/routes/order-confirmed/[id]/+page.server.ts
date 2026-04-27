import type { PageServerLoad } from './$types.js';
import type { Order } from '@repo/shared-types';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ params, cookies, url, fetch, parent }) => {
  const parentData = await parent();

  let order: Order | null = null;

  if (parentData.isLoggedIn) {
    const host = url.hostname;
    const subdomain = host.split('.')[0];
    const storeDomain = subdomain !== 'localhost' && subdomain !== '127' ? subdomain : undefined;
    const headers: Record<string, string> = {};
    if (storeDomain) headers['X-Store-Domain'] = storeDomain;

    const accessToken = cookies.get('access_token');
    if (accessToken) headers['Cookie'] = `access_token=${accessToken}`;

    try {
      const res = await fetch(`${API_BASE}/api/v1/customer/orders/${params.id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        order = data.order ?? null;
      }
    } catch {
      // continue without order data
    }
  }

  return {
    order,
    isLoggedIn: parentData.isLoggedIn,
  };
};
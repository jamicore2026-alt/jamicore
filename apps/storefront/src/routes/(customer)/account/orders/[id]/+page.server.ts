import type { PageServerLoad } from './$types.js';
import { error } from '@sveltejs/kit';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ params, cookies, url, fetch }) => {
  const accessToken = cookies.get('access_token');
  if (!accessToken) throw error(401, 'Not authenticated');

  const host = url.hostname;
  const subdomain = host.split('.')[0];
  const storeDomain = subdomain !== 'localhost' && subdomain !== '127' ? subdomain : undefined;
  const headers: Record<string, string> = {
    'Cookie': `access_token=${accessToken}`,
  };
  if (storeDomain) headers['X-Store-Domain'] = storeDomain;

  let order: any = null;
  try {
    const res = await fetch(`${API_BASE}/api/v1/customer/orders/${params.id}`, { headers });
    if (res.ok) {
      const data = await res.json();
      order = data.order ?? null;
    } else if (res.status === 404 || res.status === 403) {
      throw error(404, 'Order not found');
    }
  } catch (e: any) {
    if (e?.status) throw e;
  }

  if (!order) {
    throw error(404, 'Order not found');
  }

  return { order };
};
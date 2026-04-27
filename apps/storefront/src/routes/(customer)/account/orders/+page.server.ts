import type { PageServerLoad } from './$types.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ cookies, url, fetch }) => {
  const accessToken = cookies.get('access_token');
  if (!accessToken) return { orders: [], total: 0, page: 1, limit: 20 };

  const host = url.hostname;
  const subdomain = host.split('.')[0];
  const storeDomain = subdomain !== 'localhost' && subdomain !== '127' ? subdomain : undefined;
  const headers: Record<string, string> = {
    'Cookie': `access_token=${accessToken}`,
  };
  if (storeDomain) headers['X-Store-Domain'] = storeDomain;

  const page = parseInt(url.searchParams.get('page') ?? '1');
  const limit = 20;

  let orders: any[] = [];
  let total = 0;
  try {
    const res = await fetch(`${API_BASE}/api/v1/customer/orders?page=${page}&limit=${limit}`, {
      headers,
    });
    if (res.ok) {
      const data = await res.json();
      orders = data.data ?? [];
      total = data.pagination?.total ?? 0;
    }
  } catch {
    // continue without orders
  }

  return { orders, total, page, limit };
};
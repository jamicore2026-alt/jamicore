import type { PageServerLoad } from './$types.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ cookies, url, fetch }) => {
  const accessToken = cookies.get('access_token');
  if (!accessToken) return { addresses: [] };

  const host = url.hostname;
  const subdomain = host.split('.')[0];
  const storeDomain = subdomain !== 'localhost' && subdomain !== '127' ? subdomain : undefined;
  const headers: Record<string, string> = {
    'Cookie': `access_token=${accessToken}`,
  };
  if (storeDomain) headers['X-Store-Domain'] = storeDomain;

  let addresses: any[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/v1/customer/addresses`, { headers });
    if (res.ok) {
      const data = await res.json();
      addresses = data.addresses ?? [];
    }
  } catch {
    // continue
  }

  return { addresses };
};
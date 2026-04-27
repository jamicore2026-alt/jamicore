import type { PageServerLoad } from './$types.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ cookies, url, fetch }) => {
  const accessToken = cookies.get('access_token');
  if (!accessToken) return { wishlist: [] };

  const host = url.hostname;
  const subdomain = host.split('.')[0];
  const storeDomain = subdomain !== 'localhost' && subdomain !== '127' ? subdomain : undefined;
  const headers: Record<string, string> = {
    'Cookie': `access_token=${accessToken}`,
  };
  if (storeDomain) headers['X-Store-Domain'] = storeDomain;

  let wishlist: any[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/v1/customer/wishlist`, { headers });
    if (res.ok) {
      const data = await res.json();
      wishlist = data.wishlist ?? [];
    }
  } catch {
    // continue
  }

  return { wishlist };
};
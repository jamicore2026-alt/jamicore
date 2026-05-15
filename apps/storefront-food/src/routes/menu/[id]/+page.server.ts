import type { PageServerLoad } from './$types';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ params, url, fetch }) => {
  const host = url.hostname;
  const subdomain = host.split('.')[0];
  const storeDomain = subdomain !== 'localhost' && subdomain !== '127' ? subdomain : 'techgear';

  try {
    const res = await fetch(`${API_BASE}/api/v1/public/products/${params.id}`, {
      headers: { 'X-Store-Domain': storeDomain },
    });

    if (!res.ok) {
      return { item: null };
    }

    const data = await res.json();
    return { item: data.product || data };
  } catch {
    return { item: null };
  }
};

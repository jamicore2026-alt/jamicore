import type { PageServerLoad } from './$types.js';
import { error } from '@sveltejs/kit';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ params, fetch, url }) => {
  const host = url.hostname;
  const subdomain = host.split('.')[0];
  const storeDomain = subdomain !== 'localhost' && subdomain !== '127' ? subdomain : undefined;

  const headers: Record<string, string> = {};
  if (storeDomain) headers['X-Store-Domain'] = storeDomain;

  try {
    const res = await fetch(`${API_BASE}/api/v1/public/pages/${params.slug}`, { headers });
    if (!res.ok) {
      if (res.status === 404) {
        throw error(404, 'Page not found');
      }
      throw error(500, 'Failed to load page');
    }
    const data = await res.json();
    return {
      page: data.page,
    };
  } catch (e) {
    if (e && typeof e === 'object' && 'status' in e) throw e;
    throw error(500, 'Failed to load page');
  }
};

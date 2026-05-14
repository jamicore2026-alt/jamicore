// @ts-nocheck
import type { PageServerLoad } from './$types.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load = async ({ params, fetch, url }: Parameters<PageServerLoad>[0]) => {
  const { slug } = params;
  const host = url.hostname;
  const storeDomain = host.split('.')[0] !== 'localhost' ? host.split('.')[0] : slug;

  // Fetch store info
  let store = null;
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/store`, {
      headers: { 'X-Store-Domain': storeDomain },
    });
    if (res.ok) {
      const data = await res.json();
      store = data.store ?? data;
    }
  } catch { /* ignore */ }

  // Fetch theme settings
  let theme = null;
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/stores/${storeDomain}/theme`);
    if (res.ok) {
      const data = await res.json();
      theme = data.theme;
    }
  } catch { /* ignore */ }

  // Fetch categories
  let categories = [];
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/stores/${storeDomain}/categories`);
    if (res.ok) {
      const data = await res.json();
      categories = data.categories || [];
    }
  } catch { /* ignore */ }

  // Fetch featured products if set
  let featuredProducts = [];
  if (theme?.featuredProductIds?.length > 0) {
    try {
      const ids = theme.featuredProductIds.join(',');
      const res = await fetch(`${API_BASE}/api/v1/public/stores/${storeDomain}/products?ids=${ids}`);
      if (res.ok) {
        const data = await res.json();
        featuredProducts = data.products || [];
      }
    } catch { /* ignore */ }
  }

  return {
    store,
    theme: theme || {},
    categories,
    featuredProducts,
  };
};

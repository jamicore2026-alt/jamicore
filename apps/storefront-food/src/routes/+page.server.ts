import type { PageServerLoad } from './$types';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ url, fetch }) => {
  const host = url.hostname;
  const subdomain = host.split('.')[0];
  const storeDomain = subdomain !== 'localhost' && subdomain !== '127' ? subdomain : 'techgear';

  try {
    const [categoriesRes, featuredRes] = await Promise.all([
      fetch(`${API_BASE}/api/v1/public/categories?limit=20`, {
        headers: { 'X-Store-Domain': storeDomain },
      }),
      fetch(`${API_BASE}/api/v1/public/products?limit=8&isFeatured=true`, {
        headers: { 'X-Store-Domain': storeDomain },
      }),
    ]);

    const categoriesData = categoriesRes.ok ? await categoriesRes.json() : { categories: [] };
    const featuredData = featuredRes.ok ? await featuredRes.json() : { products: [] };

    return {
      categories: categoriesData.categories || [],
      featuredItems: featuredData.products || [],
    };
  } catch {
    return { categories: [], featuredItems: [] };
  }
};

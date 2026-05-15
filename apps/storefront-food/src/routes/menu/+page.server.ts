import type { PageServerLoad } from './$types';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ url, fetch }) => {
  const host = url.hostname;
  const subdomain = host.split('.')[0];
  const storeDomain = subdomain !== 'localhost' && subdomain !== '127' ? subdomain : 'techgear';

  const category = url.searchParams.get('category');
  const search = url.searchParams.get('search');

  try {
    const params = new URLSearchParams({ limit: '50' });
    if (category) params.set('categoryId', category);
    if (search) params.set('q', search);

    const [productsRes, categoriesRes] = await Promise.all([
      fetch(`${API_BASE}/api/v1/public/products?${params}`, {
        headers: { 'X-Store-Domain': storeDomain },
      }),
      fetch(`${API_BASE}/api/v1/public/categories?limit=50`, {
        headers: { 'X-Store-Domain': storeDomain },
      }),
    ]);

    const productsData = productsRes.ok ? await productsRes.json() : { products: [] };
    const categoriesData = categoriesRes.ok ? await categoriesRes.json() : { categories: [] };

    return {
      items: productsData.products || [],
      categories: categoriesData.categories || [],
      category,
      search,
    };
  } catch {
    return { items: [], categories: [], category, search };
  }
};

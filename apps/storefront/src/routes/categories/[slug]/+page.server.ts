import type { PageServerLoad } from './$types.js';
import type { ProductSearchResult } from '@repo/shared-types';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ params, url, fetch }) => {
  const host = url.hostname;
  const subdomain = host.split('.')[0];
  const storeDomain = subdomain !== 'localhost' && subdomain !== '127' ? subdomain : undefined;
  const headers: Record<string, string> = {};
  if (storeDomain) headers['X-Store-Domain'] = storeDomain;

  const slug = params.slug;
  const page = parseInt(url.searchParams.get('page') ?? '1');
  const limit = 20;
  const sort = url.searchParams.get('sort') ?? 'newest';

  const searchParams = new URLSearchParams();
  searchParams.set('categoryId', slug);
  searchParams.set('sort', sort);
  searchParams.set('limit', String(limit));
  searchParams.set('offset', String((page - 1) * limit));

  let searchResult: ProductSearchResult = { items: [], total: 0, limit, offset: 0 };
  let categoryName = 'Category';

  try {
    const res = await fetch(`${API_BASE}/api/v1/public/products/search?${searchParams.toString()}`, {
      headers,
    });
    if (res.ok) {
      searchResult = await res.json();
      if (searchResult.items.length > 0 && searchResult.items[0].category) {
        categoryName = searchResult.items[0].category.nameEn;
      }
    }
  } catch {
    // continue without products
  }

  return {
    products: searchResult.items,
    total: searchResult.total,
    page,
    limit,
    categoryName,
    categoryId: slug,
    sort,
  };
};
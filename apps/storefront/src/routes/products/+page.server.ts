import type { PageServerLoad } from './$types.js';
import type { ProductSearchResult } from '@repo/shared-types';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ url, fetch, parent }) => {
  const parentData = await parent();
  const { store } = parentData;

  const host = url.hostname;
  const subdomain = host.split('.')[0];
  const storeDomain = subdomain !== 'localhost' && subdomain !== '127' ? subdomain : undefined;

  const headers: Record<string, string> = {};
  if (storeDomain) headers['X-Store-Domain'] = storeDomain;

  // Build search params from URL query
  const params = new URLSearchParams();
  const q = url.searchParams.get('q');
  const categoryId = url.searchParams.get('category');
  const minPrice = url.searchParams.get('minPrice');
  const maxPrice = url.searchParams.get('maxPrice');
  const sort = url.searchParams.get('sort') ?? 'newest';
  const page = parseInt(url.searchParams.get('page') ?? '1');
  const limit = 20;

  if (q) params.set('q', q);
  if (categoryId) params.set('categoryId', categoryId);
  if (minPrice) params.set('minPrice', minPrice);
  if (maxPrice) params.set('maxPrice', maxPrice);
  params.set('sort', sort);
  params.set('limit', String(limit));
  params.set('offset', String((page - 1) * limit));

  let searchResult: ProductSearchResult = { items: [], total: 0, limit, offset: 0 };
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/products/search?${params.toString()}`, {
      headers,
    });
    if (res.ok) {
      searchResult = await res.json();
    }
  } catch {
    // continue without products
  }

  // Extract categories from products for filter sidebar
  const seen = new Set<string>();
  const categories: { id: string; nameEn: string }[] = [];
  for (const p of searchResult.items) {
    if (p.category && !seen.has(p.category.id)) {
      seen.add(p.category.id);
      categories.push({ id: p.category.id, nameEn: p.category.nameEn });
    }
  }

  return {
    products: searchResult.items,
    total: searchResult.total,
    page,
    limit,
    categories,
    filters: { q, categoryId, minPrice, maxPrice, sort },
    storeConfig: {
      filtersEnabled: (store as any)?.filtersEnabled ?? true,
      visibleFilters: (store as any)?.visibleFilters ?? ['category', 'price'],
      defaultColumns: (store as any)?.defaultColumns ?? 4,
      defaultSort: (store as any)?.defaultSort ?? 'newest',
      cardAspectRatio: (store as any)?.cardAspectRatio ?? 'landscape',
      showDiscountBadge: (store as any)?.showDiscountBadge ?? true,
      showAddToCartOnCard: (store as any)?.showAddToCartOnCard ?? true,
    },
  };
};
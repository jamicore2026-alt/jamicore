import type { PageServerLoad } from './$types.js';
import type { Product } from '@repo/shared-types';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ parent, fetch, url }) => {
  const parentData = await parent();
  const { store } = parentData;

  const host = url.hostname;
  const subdomain = host.split('.')[0];
  const storeDomain = subdomain !== 'localhost' && subdomain !== '127' ? subdomain : undefined;
  const headers: Record<string, string> = {};
  if (storeDomain) headers['X-Store-Domain'] = storeDomain;

  // Fetch featured products (limit 8)
  let featuredProducts: Product[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/products?limit=8`, {
      headers,
    });
    if (res.ok) {
      const data = await res.json();
      featuredProducts = data.items ?? [];
    }
  } catch {
    // continue without products
  }

  // Fetch new arrivals (sorted newest, limit 8)
  let newArrivals: Product[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/products/search?sort=newest&limit=8`, {
      headers,
    });
    if (res.ok) {
      const data = await res.json();
      newArrivals = data.items ?? [];
    }
  } catch {
    // continue without products
  }

  // Extract unique categories from products
  const seen = new Set<string>();
  const categories: { id: string; nameEn: string }[] = [];
  for (const p of [...featuredProducts, ...newArrivals]) {
    if (p.category && !seen.has(p.category.id)) {
      seen.add(p.category.id);
      categories.push({ id: p.category.id, nameEn: p.category.nameEn });
    }
  }

  return {
    featuredProducts,
    newArrivals,
    categories,
    homeSections: store?.homeSections ?? [
      'HeroSection',
      'FeaturedProductsSection',
      'CategoryGrid',
      'BrandTrustSection',
    ],
  };
};
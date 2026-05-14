// @ts-nocheck
import type { PageServerLoad } from './$types.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load = async ({ params, fetch }: Parameters<PageServerLoad>[0]) => {
  const { slug, catId } = params;

  let store = null;
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/store`, {
      headers: { 'X-Store-Domain': slug },
    });
    if (res.ok) {
      const data = await res.json();
      store = data.store ?? data;
    }
  } catch { /* ignore */ }

  let category = null;
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/stores/${slug}/categories/${catId}`);
    if (res.ok) {
      const data = await res.json();
      category = data.category;
    }
  } catch { /* ignore */ }

  let products = [];
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/stores/${slug}/products?categoryId=${catId}`);
    if (res.ok) {
      const data = await res.json();
      products = data.products || [];
    }
  } catch { /* ignore */ }

  return { store, category, products };
};

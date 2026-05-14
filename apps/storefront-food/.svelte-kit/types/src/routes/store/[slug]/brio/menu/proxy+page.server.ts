// @ts-nocheck
import type { PageServerLoad } from './$types.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load = async ({ params, fetch }: Parameters<PageServerLoad>[0]) => {
  const { slug } = params;

  let categories = [];
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/categories?limit=50`, {
      headers: { 'X-Store-Domain': slug },
    });
    if (res.ok) {
      const data = await res.json();
      categories = data.categories || [];
    }
  } catch { /* ignore */ }

  return { categories };
};

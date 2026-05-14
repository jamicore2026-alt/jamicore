import type { PageServerLoad } from './$types.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const { slug, prodId } = params;

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

  let item = null;
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/stores/${slug}/products/${prodId}`);
    if (res.ok) {
      const data = await res.json();
      item = data.product;
    }
  } catch { /* ignore */ }

  return { store, item };
};

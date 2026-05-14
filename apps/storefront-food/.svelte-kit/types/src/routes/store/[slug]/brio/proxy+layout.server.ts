// @ts-nocheck
import type { LayoutServerLoad } from './$types.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load = async ({ params, fetch, url }: Parameters<LayoutServerLoad>[0]) => {
  const { slug } = params;
  const host = url.hostname;
  const storeDomain = host.split('.')[0] !== 'localhost' ? host.split('.')[0] : slug;

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

  let theme = null;
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/stores/${storeDomain}/theme`);
    if (res.ok) {
      const data = await res.json();
      theme = data.theme;
    }
  } catch { /* ignore */ }

  return { store, theme: theme || {}, slug: storeDomain };
};

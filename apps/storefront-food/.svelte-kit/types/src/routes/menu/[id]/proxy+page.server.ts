// @ts-nocheck
import type { PageServerLoad } from './$types';

export const load = async ({ params, url, fetch }: Parameters<PageServerLoad>[0]) => {
  const host = url.hostname;
  const subdomain = host.split('.')[0];
  const storeDomain = subdomain !== 'localhost' && subdomain !== '127' ? subdomain : 'techgear';

  try {
    const res = await fetch(`http://localhost:3000/api/v1/public/products/${params.id}`, {
      headers: { 'X-Store-Domain': storeDomain },
    });

    if (!res.ok) {
      return { item: null };
    }

    const data = await res.json();
    return { item: data.product || data };
  } catch {
    return { item: null };
  }
};

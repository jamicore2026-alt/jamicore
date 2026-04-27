import type { RequestHandler } from './$types';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const GET: RequestHandler = async ({ url, fetch }) => {
  const host = url.hostname;
  const subdomain = host.split('.')[0];
  const storeDomain = subdomain !== 'localhost' && subdomain !== '127' ? subdomain : undefined;
  const headers: Record<string, string> = {};
  if (storeDomain) headers['X-Store-Domain'] = storeDomain;

  let products: any[] = [];
  let categories: any[] = [];

  try {
    const res = await fetch(`${API_BASE}/api/v1/public/products?limit=1000`, { headers });
    if (res.ok) {
      const data = await res.json();
      products = data.items ?? [];
    }
  } catch {
    // ignore
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/public/categories`, { headers });
    if (res.ok) {
      const data = await res.json();
      categories = data.categories ?? [];
    }
  } catch {
    // ignore
  }

  const baseUrl = `${url.protocol}//${url.host}`;

  const pages = [
    { url: `${baseUrl}/`, priority: '1.0' },
    { url: `${baseUrl}/products`, priority: '0.9' },
    { url: `${baseUrl}/about`, priority: '0.5' },
  ];

  const categoryUrls = categories.map((c: any) => ({
    url: `${baseUrl}/categories/${c.slug || c.id}`,
    priority: '0.8',
  }));

  const productUrls = products.map((p: any) => ({
    url: `${baseUrl}/products/${p.id}`,
    priority: '0.7',
  }));

  const allUrls = [...pages, ...categoryUrls, ...productUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map((u) => `  <url>\n    <loc>${u.url}</loc>\n    <priority>${u.priority}</priority>\n  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'max-age=3600',
    },
  });
};

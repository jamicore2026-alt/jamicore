import type { RequestHandler } from './$types';

// P1-E(#45): storefront-food had zero sitemap. Mirrors apps/storefront's
// sitemap.xml/+server.ts, adapted to the food route tree (/, /menu, /menu/[id]).
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

interface ProductRef {
	id: string;
}
interface SitemapEntry {
	url: string;
	priority: string;
}

export const GET: RequestHandler = async ({ url, fetch }) => {
	const host = url.hostname;
	const subdomain = host.split('.')[0];
	const storeDomain = subdomain !== 'localhost' && subdomain !== '127' ? subdomain : undefined;
	const headers: Record<string, string> = {};
	if (storeDomain) headers['X-Store-Domain'] = storeDomain;

	let products: ProductRef[] = [];
	try {
		const res = await fetch(`${API_BASE}/api/v1/public/products?limit=1000`, { headers });
		if (res.ok) {
			const data = (await res.json()) as { items?: ProductRef[]; products?: ProductRef[] };
			products = data.items ?? data.products ?? [];
		}
	} catch {
		// ignore — sitemap degrades to static pages only
	}

	const baseUrl = `${url.protocol}//${url.host}`;
	const pages: SitemapEntry[] = [
		{ url: `${baseUrl}/`, priority: '1.0' },
		{ url: `${baseUrl}/menu`, priority: '0.9' },
	];
	const productUrls: SitemapEntry[] = products.map((p) => ({
		url: `${baseUrl}/menu/${p.id}`,
		priority: '0.7',
	}));
	const allUrls = [...pages, ...productUrls];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
	.map((u) => `  <url>\n    <loc>${u.url}</loc>\n    <priority>${u.priority}</priority>\n  </url>`)
	.join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600',
		},
	});
};
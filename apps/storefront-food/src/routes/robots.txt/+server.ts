import type { RequestHandler } from './$types';

// P1-E(#45): storefront-food had no robots.txt. Served as a route (no static/
// dir exists) so the sitemap URL is host-absolute. Disallows transactional
// (/cart, /checkout) and the BFF proxy (/api/) from indexing.
export const GET: RequestHandler = async ({ url }) => {
	const baseUrl = `${url.protocol}//${url.host}`;
	const body = `User-agent: *
Allow: /
Disallow: /cart
Disallow: /checkout
Disallow: /api/
Sitemap: ${baseUrl}/sitemap.xml
`;
	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain',
			'Cache-Control': 'max-age=3600',
		},
	});
};
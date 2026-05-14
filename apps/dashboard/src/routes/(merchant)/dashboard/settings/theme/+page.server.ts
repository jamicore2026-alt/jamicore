import type { PageServerLoad } from './$types.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	const accessToken = cookies.get('access_token');
	const csrfToken = cookies.get('csrf_token');

	const cookieHeader = [
		accessToken ? `access_token=${accessToken}` : '',
		csrfToken ? `csrf_token=${csrfToken}` : '',
	].filter(Boolean).join('; ');

	// Fetch theme settings
	const themeRes = await fetch(`${API_BASE}/api/v1/merchant/theme`, {
		headers: {
			...(cookieHeader ? { Cookie: cookieHeader } : {}),
		},
		credentials: 'include',
	});

	const themeData = themeRes.ok ? await themeRes.json() : { theme: {} };

	// Fetch products for featured picker
	const productsRes = await fetch(`${API_BASE}/api/v1/merchant/products?limit=100`, {
		headers: {
			...(cookieHeader ? { Cookie: cookieHeader } : {}),
		},
		credentials: 'include',
	});

	const productsData = productsRes.ok ? await productsRes.json() : { products: [] };

	return {
		theme: themeData.theme || {},
		products: productsData.products || [],
	};
};

import type { PageServerLoad } from './$types.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	const accessToken = cookies.get('access_token');

	// Fetch theme settings
	const themeRes = await fetch(`${API_BASE}/api/v1/merchant/theme`, {
		headers: {
			Cookie: `access_token=${accessToken}`,
		},
		credentials: 'include',
	});

	const themeData = themeRes.ok ? await themeRes.json() : { theme: {} };

	// Fetch products for featured picker
	const productsRes = await fetch(`${API_BASE}/api/v1/merchant/products?limit=100`, {
		headers: {
			Cookie: `access_token=${accessToken}`,
		},
		credentials: 'include',
	});

	const productsData = productsRes.ok ? await productsRes.json() : { products: [] };

	return {
		theme: themeData.theme || {},
		products: productsData.products || [],
	};
};

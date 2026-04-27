import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const page = url.searchParams.get('page') || '1';
	const search = url.searchParams.get('search') || '';
	const category = url.searchParams.get('category') || '';

	const offset = String((Number(page) - 1) * 20);
	const params = new URLSearchParams({ offset, limit: '20' });
	if (search) params.set('search', search);
	if (category) params.set('categoryId', category);

	try {
		const [productsRes, categoriesRes] = await Promise.all([
			apiFetch(`/api/v1/merchant/products?${params}`, {
				headers: { Cookie: cookie },
			}),
			apiFetch(`/api/v1/merchant/categories`, {
				headers: { Cookie: cookie },
			}),
		]);

		const products = productsRes.ok ? await productsRes.json() : { products: [], total: 0 };
		const categories = categoriesRes.ok ? await categoriesRes.json() : { items: [] };

		return { products, categories: categories.items || categories, search, category };
	} catch {
		return { products: { products: [], total: 0 }, categories: [], search, category };
	}
};

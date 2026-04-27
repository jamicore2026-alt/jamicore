import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies, params }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;

	try {
		const [productRes, categoriesRes] = await Promise.all([
			apiFetch(`/api/v1/merchant/products/${params.id}`, {
				headers: { Cookie: cookie },
			}),
			apiFetch(`/api/v1/merchant/categories`, {
				headers: { Cookie: cookie },
			}),
		]);

		if (!productRes.ok) {
			error(404, 'Product not found');
		}

		const product = await productRes.json();
		const categories = categoriesRes.ok ? await categoriesRes.json() : { items: [] };

		return { product, categories: categories.items || categories };
	} catch (err: any) {
		if (err?.status) throw err;
		error(500, 'Failed to load product');
	}
};

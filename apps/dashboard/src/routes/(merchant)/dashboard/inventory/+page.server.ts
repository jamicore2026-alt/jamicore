import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const page = url.searchParams.get('page') || '1';
	const search = url.searchParams.get('search') || '';
	const params = new URLSearchParams({ page, limit: '20' });
	if (search) params.set('search', search);

	try {
		const res = await apiFetch(`/api/v1/merchant/products?${params}`, { headers: { Cookie: cookie } });
		const data = res.ok ? await res.json() : { products: [], total: 0 };
		return { products: data, search };
	} catch {
		return { products: { products: [], total: 0 }, search };
	}
};

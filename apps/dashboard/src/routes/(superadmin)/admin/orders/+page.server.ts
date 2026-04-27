import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const page = url.searchParams.get('page') || '1';
	const status = url.searchParams.get('status') || '';
	const search = url.searchParams.get('search') || '';

	const params = new URLSearchParams({ page, limit: '20' });
	if (status) params.set('status', status);
	if (search) params.set('search', search);

	try {
		const res = await apiFetch(`/api/v1/admin/orders?${params}`, { headers: { Cookie: cookie } });
		const result = res.ok ? await res.json() : { data: [], total: 0 };
		return {
			orders: {
				orders: result.data || [],
				total: result.total || 0,
			},
			status,
			search,
		};
	} catch {
		return { orders: { orders: [], total: 0 }, status, search };
	}
};

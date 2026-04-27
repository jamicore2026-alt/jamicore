import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const page = url.searchParams.get('page') || '1';
	const search = url.searchParams.get('search') || '';
	const params = new URLSearchParams({ page, limit: '20' });
	if (search) params.set('search', search);

	try {
		const res = await apiFetch(`/api/v1/admin/stores?${params}`, { headers: { Cookie: cookie } });
		const result = res.ok ? await res.json() : { data: [], pagination: { total: 0 } };
		return {
			stores: {
				stores: result.data || [],
				total: result.pagination?.total || 0,
			},
			search,
		};
	} catch {
		return { stores: { stores: [], total: 0 }, search };
	}
};

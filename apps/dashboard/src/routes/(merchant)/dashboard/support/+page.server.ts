import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const page = url.searchParams.get('page') || '1';
	const status = url.searchParams.get('status') || '';
	const params = new URLSearchParams({ page, limit: '20' });
	if (status) params.set('status', status);

	try {
		const res = await apiFetch(`/api/v1/merchant/tickets?${params}`, { headers: { Cookie: cookie } });
		const data = res.ok ? await res.json() : { data: [], pagination: { total: 0 } };
		return { tickets: { tickets: data.data || [], total: data.pagination?.total || 0 }, status };
	} catch {
		return { tickets: { tickets: [], total: 0 }, status };
	}
};
import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const page = url.searchParams.get('page') || '1';
	const verified = url.searchParams.get('verified');

	const params = new URLSearchParams({ page, limit: '20' });
	if (verified !== null && verified !== '') params.set('verified', verified);

	try {
		const res = await apiFetch(`/api/v1/admin/domains?${params}`, { headers: { Cookie: cookie } });
		const result = res.ok ? await res.json() : { data: [], total: 0 };
		return {
			domains: {
				domains: result.data || [],
				total: result.total || 0,
			},
			verified,
		};
	} catch {
		return { domains: { domains: [], total: 0 }, verified };
	}
};

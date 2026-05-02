import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const page = url.searchParams.get('page') || '1';
	const active = url.searchParams.get('active') || '';

	const params = new URLSearchParams({ page, limit: '20' });
	if (active) params.set('active', active);

	try {
		const res = await apiFetch(`/api/v1/merchant/newsletter?${params}`, {
			headers: { Cookie: cookie },
		});
		const apiData = res.ok ? await res.json() : null;
		return {
			subscribers: {
				items: apiData?.data || [],
				total: apiData?.pagination?.total || 0,
			},
			active,
		};
	} catch {
		return { subscribers: { items: [], total: 0 }, active };
	}
};

import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const page = url.searchParams.get('page') || '1';
	const search = url.searchParams.get('search') || '';
	const tags = url.searchParams.get('tags') || '';

	const params = new URLSearchParams({ page, limit: '20' });
	if (search) params.set('search', search);
	if (tags) params.set('tags', tags);

	try {
		const res = await apiFetch(`/api/v1/merchant/customers?${params}`, {
			headers: { Cookie: cookie },
		});
		const data = res.ok ? await res.json() : { customers: [], total: 0 };
		return { customers: data, search, tags };
	} catch {
		return { customers: { customers: [], total: 0 }, search, tags };
	}
};

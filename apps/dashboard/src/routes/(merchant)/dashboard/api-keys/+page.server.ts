import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const page = url.searchParams.get('page') || '1';

	const offset = String((Number(page) - 1) * 20);
	const params = new URLSearchParams({ offset, limit: '20' });

	try {
		const res = await apiFetch(`/api/v1/merchant/api-keys?${params}`, {
			headers: { Cookie: cookie },
		});
		const data = res.ok ? await res.json() : { items: [], total: 0 };
		return { keys: data };
	} catch {
		return { keys: { items: [], total: 0 } };
	}
};

import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const page = url.searchParams.get('page') || '1';
	const status = url.searchParams.get('status') || '';
	const priority = url.searchParams.get('priority') || '';

	const params = new URLSearchParams({ page, limit: '20' });
	if (status) params.set('status', status);
	if (priority) params.set('priority', priority);

	try {
		const res = await apiFetch(`/api/v1/admin/tickets?${params}`, { headers: { Cookie: cookie } });
		const result = res.ok ? await res.json() : { data: [], total: 0 };
		return {
			tickets: {
				tickets: result.data || [],
				total: result.total || 0,
			},
			status,
			priority,
		};
	} catch {
		return { tickets: { tickets: [], total: 0 }, status, priority };
	}
};

import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const page = url.searchParams.get('page') || '1';
	const entityType = url.searchParams.get('entityType') || '';
	const action = url.searchParams.get('action') || '';

	const params = new URLSearchParams({ page, limit: '20' });
	if (entityType) params.set('entityType', entityType);
	if (action) params.set('action', action);

	try {
		const res = await apiFetch(`/api/v1/admin/audit-logs?${params}`, { headers: { Cookie: cookie } });
		const result = res.ok ? await res.json() : { data: [], total: 0 };
		return {
			logs: {
				logs: result.data || [],
				total: result.total || 0,
			},
			entityType,
			action,
		};
	} catch {
		return { logs: { logs: [], total: 0 }, entityType, action };
	}
};

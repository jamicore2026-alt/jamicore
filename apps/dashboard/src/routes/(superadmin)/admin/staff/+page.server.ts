import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const page = url.searchParams.get('page') || '1';
	const storeId = url.searchParams.get('storeId') || '';
	const role = url.searchParams.get('role') || '';
	const tab = url.searchParams.get('tab') || 'staff';

	if (tab === 'invitations') {
		const status = url.searchParams.get('status') || '';
		const params = new URLSearchParams({ page, limit: '20' });
		if (storeId) params.set('storeId', storeId);
		if (status) params.set('status', status);

		try {
			const res = await apiFetch(`/api/v1/admin/staff/invitations?${params}`, { headers: { Cookie: cookie } });
			const result = res.ok ? await res.json() : { data: [], total: 0 };
			return {
				invitations: {
					invitations: result.data || [],
					total: result.total || 0,
				},
				storeId,
				status,
				tab,
			};
		} catch {
			return { invitations: { invitations: [], total: 0 }, storeId, status, tab };
		}
	}

	const params = new URLSearchParams({ page, limit: '20' });
	if (storeId) params.set('storeId', storeId);
	if (role) params.set('role', role);

	try {
		const res = await apiFetch(`/api/v1/admin/staff?${params}`, { headers: { Cookie: cookie } });
		const result = res.ok ? await res.json() : { data: [], total: 0 };
		return {
			staff: {
				staff: result.data || [],
				total: result.total || 0,
			},
			storeId,
			role,
			tab,
		};
	} catch {
		return { staff: { staff: [], total: 0 }, storeId, role, tab };
	}
};

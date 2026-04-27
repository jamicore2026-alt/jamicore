import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const page = url.searchParams.get('page') || '1';
	const status = url.searchParams.get('status') || '';
	const storeId = url.searchParams.get('storeId') || '';

	const params = new URLSearchParams({ page, limit: '20' });
	if (status) params.set('status', status);
	if (storeId) params.set('storeId', storeId);

	try {
		const res = await apiFetch(`/api/v1/admin/invoices?${params}`, { headers: { Cookie: cookie } });
		const result = res.ok ? await res.json() : { data: [], total: 0 };
		return {
			invoices: {
				invoices: result.data || [],
				total: result.total || 0,
			},
			status,
			storeId,
		};
	} catch {
		return { invoices: { invoices: [], total: 0 }, status, storeId };
	}
};

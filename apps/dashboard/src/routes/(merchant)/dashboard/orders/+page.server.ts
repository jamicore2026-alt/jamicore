import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const page = url.searchParams.get('page') || '1';
	const status = url.searchParams.get('status') || '';
	const search = url.searchParams.get('search') || '';
	const dateFrom = url.searchParams.get('dateFrom') || '';
	const dateTo = url.searchParams.get('dateTo') || '';

	const params = new URLSearchParams({ page, limit: '20' });
	if (status) params.set('status', status);
	if (search) params.set('search', search);
	if (dateFrom) params.set('dateFrom', `${dateFrom}T00:00:00.000Z`);
	if (dateTo) params.set('dateTo', `${dateTo}T23:59:59.999Z`);

	try {
		const res = await apiFetch(`/api/v1/merchant/orders?${params}`, {
			headers: { Cookie: cookie },
		});
		const apiData = res.ok ? await res.json() : null;
		return {
			orders: {
				orders: apiData?.data || [],
				total: apiData?.pagination?.total || 0,
			},
			status,
			search,
			dateFrom,
			dateTo,
		};
	} catch {
		return { orders: { orders: [], total: 0 }, status, search, dateFrom, dateTo };
	}
};

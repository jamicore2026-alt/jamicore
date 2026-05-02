import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const page = url.searchParams.get('page') || '1';
	const hours = url.searchParams.get('hours') || '24';

	const params = new URLSearchParams({ page, limit: '20' });
	params.set('hoursSinceUpdate', hours);

	try {
		const [cartsRes, countRes] = await Promise.all([
			apiFetch(`/api/v1/merchant/abandoned-carts?${params}`, { headers: { Cookie: cookie } }),
			apiFetch(`/api/v1/merchant/abandoned-carts/count?hoursSinceUpdate=${hours}`, { headers: { Cookie: cookie } }),
		]);

		const cartsData = cartsRes.ok ? await cartsRes.json() : null;
		const countData = countRes.ok ? await countRes.json() : null;

		return {
			carts: {
				items: cartsData?.data || [],
				total: cartsData?.pagination?.total || 0,
			},
			count: countData?.count ?? 0,
			hours,
		};
	} catch {
		return { carts: { items: [], total: 0 }, count: 0, hours };
	}
};

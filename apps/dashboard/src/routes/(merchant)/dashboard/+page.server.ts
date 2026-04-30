import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;

	try {
		const [statsRes, recentOrdersRes, limitsRes] = await Promise.all([
			apiFetch(`/api/v1/merchant/analytics/dashboard`, { headers: { Cookie: cookie } }),
			apiFetch(`/api/v1/merchant/orders?offset=0&limit=5`, { headers: { Cookie: cookie } }),
			apiFetch(`/api/v1/merchant/store`, { headers: { Cookie: cookie } }),
		]);

		const statsData = statsRes.ok ? await statsRes.json() : null;
		const stats = statsData?.stats ?? null;
		const recentOrders = recentOrdersRes.ok ? await recentOrdersRes.json() : { items: [] };
		const limits = limitsRes.ok ? await limitsRes.json() : null;

		return {
			stats: {
				...stats,
				usedProducts: limits?.store?.totalProducts ?? stats?.totalProducts ?? 0,
				maxProducts: limits?.store?.plan?.maxProducts ?? 100,
				usedStaff: limits?.store?.totalStaff ?? stats?.totalStaff ?? 0,
				maxStaff: limits?.store?.plan?.maxStaff ?? 3,
			},
			recentOrders: recentOrders.items || recentOrders.orders || [],
		};
	} catch {
		return { stats: null, recentOrders: [] };
	}
};

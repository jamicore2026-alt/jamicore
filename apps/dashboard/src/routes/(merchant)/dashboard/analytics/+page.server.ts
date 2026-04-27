import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;

	try {
		const [statsRes, revenueRes] = await Promise.all([
			apiFetch('/api/v1/merchant/analytics/dashboard', { headers: { Cookie: cookie } }),
			apiFetch('/api/v1/merchant/analytics/revenue?period=daily', { headers: { Cookie: cookie } }),
		]);

		const stats = statsRes.ok ? await statsRes.json() : null;
		const revenue = revenueRes.ok ? await revenueRes.json() : { data: [] };

		return { stats: stats?.stats ?? null, revenue: revenue?.data ?? [] };
	} catch {
		return { stats: null, revenue: [] };
	}
};

import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;

	try {
		const res = await apiFetch('/api/v1/admin/stats', { headers: { Cookie: cookie } });
		const stats = res.ok ? await res.json() : null;
		return { stats };
	} catch {
		return {
			stats: {
				totalStores: 0,
				activeStores: 0,
				pendingStores: 0,
				suspendedStores: 0,
				totalPlans: 0,
				recentStores: [],
				storesByStatus: {},
			},
		};
	}
};

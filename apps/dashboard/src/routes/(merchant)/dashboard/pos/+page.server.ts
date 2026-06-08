import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, parent }) => {
	const parentData = await parent();
	const role = parentData.user?.role ?? 'CASHIER';

	let cashierName = 'Cashier';
	try {
		const cookie = `access_token=${cookies.get('access_token')}`;
		const meRes = await apiFetch('/api/v1/merchant/auth/me', { headers: { Cookie: cookie } });
		if (meRes.ok) {
			const meData = await meRes.json();
			cashierName = meData?.name || meData?.email || meData?.user?.name || meData?.user?.email || 'Cashier';
		}
	} catch {
		// Fall through with default name
	}

	return { cashierName, role };
};

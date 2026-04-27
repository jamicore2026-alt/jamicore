import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	try {
		const res = await apiFetch('/api/v1/admin/revenue', { headers: { Cookie: cookie } });
		const data = res.ok ? await res.json() : null;
		return { revenue: data };
	} catch {
		return { revenue: null };
	}
};

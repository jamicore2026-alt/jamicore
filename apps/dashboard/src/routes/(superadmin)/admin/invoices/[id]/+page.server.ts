import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, params }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	try {
		const res = await apiFetch(`/api/v1/admin/invoices/${params.id}`, { headers: { Cookie: cookie } });
		const data = res.ok ? await res.json() : null;
		return { invoice: data?.invoice || null };
	} catch {
		return { invoice: null };
	}
};

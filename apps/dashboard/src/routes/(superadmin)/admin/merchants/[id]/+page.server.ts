import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies, params }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	try {
		const [merchantRes, plansRes] = await Promise.all([
			apiFetch(`/api/v1/admin/merchants/${params.id}`, { headers: { Cookie: cookie } }),
			apiFetch(`/api/v1/admin/plans`, { headers: { Cookie: cookie } }),
		]);
		if (!merchantRes.ok) error(404, 'Merchant not found');
		const merchantData = await merchantRes.json();
		const plansData = plansRes.ok ? await plansRes.json() : { plans: [] };
		return { merchant: merchantData.store, plans: plansData.plans || [] };
	} catch (err) {
		const e = err as { status?: number };
		if (e?.status) throw err;
		error(500, 'Failed to load merchant');
	}
};

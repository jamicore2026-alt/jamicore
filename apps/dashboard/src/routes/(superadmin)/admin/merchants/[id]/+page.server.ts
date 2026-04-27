import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies, params }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	try {
		const res = await apiFetch(`/api/v1/admin/merchants/${params.id}`, { headers: { Cookie: cookie } });
		if (!res.ok) error(404, 'Merchant not found');
		const data = await res.json();
		return { merchant: data.store };
	} catch (err: any) {
		if (err?.status) throw err;
		error(500, 'Failed to load merchant');
	}
};

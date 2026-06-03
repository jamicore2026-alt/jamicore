import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies, params }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;

	try {
		const res = await apiFetch(`/api/v1/merchant/customers/${params.id}`, {
			headers: { Cookie: cookie },
		});
		if (!res.ok) error(404, 'Customer not found');
		const customerData = await res.json();
		return { customer: customerData.customer };
	} catch (err) {
		const e = err as { status?: number };
		if (e?.status) throw err;
		error(500, 'Failed to load customer');
	}
};

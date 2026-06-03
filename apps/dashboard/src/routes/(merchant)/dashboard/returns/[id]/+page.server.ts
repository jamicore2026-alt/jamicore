import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies, params }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;

	try {
		const res = await apiFetch(`/api/v1/merchant/returns/${params.id}`, {
			headers: { Cookie: cookie },
		});
		if (!res.ok) {
			if (res.status === 404) throw error(404, 'Return not found');
			throw error(res.status, 'Failed to load return');
		}
		const apiData = await res.json();
		return {
			returnRequest: apiData.returnRequest || null,
		};
	} catch (err) {
		const e = err as { status?: number };
		if (e.status === 404) throw err;
		throw error(500, 'Failed to load return');
	}
};

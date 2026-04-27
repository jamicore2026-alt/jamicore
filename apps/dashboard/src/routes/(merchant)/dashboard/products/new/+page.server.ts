import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;

	try {
		const res = await apiFetch(`/api/v1/merchant/categories`, {
			headers: { Cookie: cookie },
		});
		const categories = res.ok ? await res.json() : { items: [] };
		return { categories: categories.items || categories };
	} catch {
		return { categories: [] };
	}
};

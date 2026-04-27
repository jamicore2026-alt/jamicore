import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;

	let admin = null;
	let settings = [];

	try {
		const res = await apiFetch('/api/v1/admin/auth/me', { headers: { Cookie: cookie } });
		const data = res.ok ? await res.json() : null;
		admin = data?.admin || null;
	} catch {
		admin = null;
	}

	try {
		const res = await apiFetch('/api/v1/admin/settings/platform', { headers: { Cookie: cookie } });
		const data = res.ok ? await res.json() : null;
		settings = data?.settings || [];
	} catch {
		settings = [];
	}

	return { admin, settings };
};

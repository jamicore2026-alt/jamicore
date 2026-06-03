import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;

	let adminUser = null;
	let settings = [];

	try {
		const res = await apiFetch('/api/v1/admin/auth/me', { headers: { Cookie: cookie } });
		const data = res.ok ? await res.json() : null;
		// CONS-001: /me now returns { scope, user } instead of { admin }.
		// The user object has the same fields the page needs (name, email,
		// isActive, lastLoginAt) plus a `role` field added by the canonical
		// builder.
		adminUser = data?.user || null;
	} catch {
		adminUser = null;
	}

	try {
		const res = await apiFetch('/api/v1/admin/settings/platform', { headers: { Cookie: cookie } });
		const data = res.ok ? await res.json() : null;
		settings = data?.settings || [];
	} catch {
		settings = [];
	}

	return { admin: adminUser, settings };
};

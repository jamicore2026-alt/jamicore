import { redirect } from '@sveltejs/kit';
import { safeDecodeJWT, isTokenExpired, getAuthScope, type SuperAdminJWTPayload } from '@repo/shared-utils/jwt';
import { apiFetch } from '$lib/server/api';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const token = cookies.get('access_token');

	if (!token) {
		redirect(303, '/admin-login');
	}

	const payload = safeDecodeJWT(token);

	if (!payload || isTokenExpired(payload)) {
		redirect(303, '/admin-login');
	}

	const scope = getAuthScope(payload);
	if (scope !== 'superadmin') {
		redirect(303, '/admin-login');
	}

	// Ensure the token has the required superadmin claims
	if (!('superAdminId' in payload)) {
		redirect(303, '/admin-login');
	}

	const admin = payload as SuperAdminJWTPayload;

	const cookie = `access_token=${token}`;
	let pendingCount = 0;
	try {
		const statsRes = await apiFetch('/api/v1/admin/stats', { headers: { Cookie: cookie } });
		const stats = statsRes.ok ? await statsRes.json() : null;
		pendingCount = stats?.pendingStores ?? 0;
	} catch {
		pendingCount = 0;
	}

	return {
		user: {
			superAdminId: admin.superAdminId,
			role: admin.role,
		},
		pendingCount,
	};
};
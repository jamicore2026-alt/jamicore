import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { safeDecodeJWT, isTokenExpired, getAuthScope } from '@repo/shared-utils/jwt';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('access_token');

	if (!token) {
		redirect(303, '/login');
	}

	const payload = safeDecodeJWT(token);
	if (!payload || isTokenExpired(payload)) {
		redirect(303, '/login');
	}

	const scope = getAuthScope(payload);
	if (scope !== 'merchant') {
		redirect(303, '/login');
	}

	const cookie = `access_token=${token}`;
	try {
		const meRes = await apiFetch('/api/v1/merchant/auth/me', { headers: { Cookie: cookie } });
		if (!meRes.ok) {
			redirect(303, '/login');
		}
		const meData = await meRes.json();
		if (meData.store?.status === 'active') {
			redirect(303, '/dashboard');
		}
		if (meData.store?.status === 'suspended') {
			redirect(303, '/login');
		}
		return { store: meData.store };
	} catch {
		redirect(303, '/login');
	}
};

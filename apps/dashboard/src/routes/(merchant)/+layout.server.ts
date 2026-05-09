import { redirect } from '@sveltejs/kit';
import { safeDecodeJWT, isTokenExpired, getAuthScope, type MerchantJWTPayload } from '@repo/shared-utils/jwt';
import { apiFetch } from '$lib/server/api';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
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

	// Ensure the token has the required merchant claims
	if (!('userId' in payload) || !('storeId' in payload)) {
		redirect(303, '/login');
	}

	const merchant = payload as MerchantJWTPayload;

	const cookie = `access_token=${cookies.get('access_token')}`;

	// Check store status — pending merchants go to /pending
	let meData: { store?: { status?: string } } | null = null;
	try {
		const meRes = await apiFetch('/api/v1/merchant/auth/me', { headers: { Cookie: cookie } });
		meData = meRes.ok ? await meRes.json() : null;
	} catch {
		meData = null;
	}
	if (meData?.store?.status === 'pending') {
		redirect(303, '/pending');
	}

	let billing = null;
	try {
		const billingRes = await apiFetch(`/api/v1/merchant/billing`, { headers: { Cookie: cookie } });
		billing = billingRes.ok ? await billingRes.json() : null;
	} catch {
		billing = null;
	}

	return {
		user: {
			userId: merchant.userId,
			storeId: merchant.storeId,
			role: merchant.role,
		},
		billing,
	};
};

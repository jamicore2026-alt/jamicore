import { redirect } from '@sveltejs/kit';
import { safeDecodeJWT, isTokenExpired, getAuthScope, type MerchantJWTPayload } from '@repo/shared-utils/jwt';
import { apiFetch } from '$lib/server/api';
import type { LayoutServerLoad } from './$types';

async function tryRefresh(cookies: {
	get: (name: string) => string | undefined;
	set: (name: string, value: string, opts: { path: string; httpOnly?: boolean; secure?: boolean; sameSite?: 'strict' | 'lax' | 'none'; maxAge?: number }) => void;
}): Promise<boolean> {
	const refreshToken = cookies.get('refresh_token');
	if (!refreshToken) return false;
	try {
		const res = await apiFetch('/api/v1/merchant/auth/refresh', {
			method: 'POST',
			headers: { Cookie: `refresh_token=${refreshToken}` },
			redirect: 'manual',
		});
		if (!res.ok) return false;
		// Forward new cookies from refresh response
		const setCookie = res.headers.getSetCookie?.() || res.headers.get('set-cookie');
		if (setCookie) {
			const cookiesArr = Array.isArray(setCookie) ? setCookie : [setCookie];
			for (const c of cookiesArr) {
				const nameMatch = c.match(/^([^=]+)=([^;]*)/);
				if (!nameMatch) continue;
				const [, name, value] = nameMatch;
				const httpOnly = c.includes('HttpOnly');
				const secure = c.includes('Secure');
				const sameSiteMatch = c.match(/SameSite=(\w+)/);
				const sameSite = (sameSiteMatch?.[1]?.toLowerCase() || 'strict') as 'strict' | 'lax' | 'none';
				const pathMatch = c.match(/Path=([^;]+)/);
				const path = pathMatch?.[1] || '/';
				const maxAgeMatch = c.match(/Max-Age=(\d+)/);
				const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : undefined;
				cookies.set(name, value, { httpOnly, secure, sameSite, path, maxAge });
			}
		}
		return true;
	} catch {
		return false;
	}
}

export const load: LayoutServerLoad = async ({ cookies }) => {
	let token = cookies.get('access_token');
	let payload = token ? safeDecodeJWT(token) : null;

	if (!token || !payload || isTokenExpired(payload)) {
		const refreshed = await tryRefresh(cookies);
		if (refreshed) {
			token = cookies.get('access_token');
			payload = token ? safeDecodeJWT(token) : null;
		}
	}

	if (!token || !payload || isTokenExpired(payload)) {
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

	let store = null;
	try {
		const storeRes = await apiFetch(`/api/v1/merchant/store`, { headers: { Cookie: cookie } });
		store = storeRes.ok ? await storeRes.json() : null;
	} catch {
		store = null;
	}

	return {
		user: {
			userId: merchant.userId,
			storeId: merchant.storeId,
			role: merchant.role,
		},
		billing,
		storeType: store?.store?.storeType || 'general',
	};
};

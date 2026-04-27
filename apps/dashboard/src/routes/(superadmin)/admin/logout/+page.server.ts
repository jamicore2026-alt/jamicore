import { redirect } from '@sveltejs/kit';
import { clearAuthCookies } from '@repo/shared-utils/cookies';
import { apiFetch } from '$lib/server/api';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ cookies, locals }) => {
		// Best-effort: notify backend to invalidate the token
		const token = cookies.get('refresh_token');
		if (token) {
			await apiFetch('/api/v1/admin/auth/logout', {
				method: 'POST',
				headers: {
					Cookie: `refresh_token=${token}`,
				},
			}, locals.csrfToken).catch(() => {
				// Swallow errors — we clear cookies either way
			});
		}

		clearAuthCookies(cookies as any);
		redirect(303, '/admin-login');
	},
};
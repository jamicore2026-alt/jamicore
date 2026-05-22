import type { PageServerLoad, Actions } from './$types';
import { superValidate, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';
import { verifyMfaSchema } from '@repo/shared-types';
import { forwardCookies } from '@repo/shared-utils/cookies';
import { apiFetch } from '$lib/server/api';

const verifyMfaAdapter = zod4(verifyMfaSchema as any) as any;

export const load: PageServerLoad = async ({ cookies }) => {
	const form = await superValidate(verifyMfaAdapter);
	const mfaToken = cookies.get('mfa_token');
	if (!mfaToken) {
		redirect(303, '/login');
	}
	return { form, mfaToken };
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		const form = await superValidate(request, verifyMfaAdapter);
		const mfaToken = cookies.get('mfa_token');

		if (!form.valid) {
			return fail(400, { form });
		}
		if (!mfaToken) {
			return setError(form, 'code', 'Session expired. Please log in again.');
		}

		const res = await apiFetch('/api/v1/merchant/auth/verify-mfa', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ mfaToken, code: form.data.code }),
		}, locals.csrfToken, request.headers.get('cookie') || undefined);

		const body = await res.json().catch(() => ({ message: 'Verification failed' }));

		if (!res.ok) {
			return setError(form, 'code', body.message || 'Invalid or expired verification code');
		}

		// Success: forward real auth cookies and clean up MFA token
		forwardCookies(res, cookies as any);
		cookies.delete('mfa_token', { path: '/' });

		if (body.store?.status === 'pending') {
			redirect(303, '/pending');
		}

		redirect(303, '/dashboard');
	},
};

import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';
import { resetPasswordSchema } from '@repo/shared-types';
import { apiFetch } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

// Cast adapter to any to work around superforms ZodObjectType narrowness
const resetPasswordAdapter = zod4(resetPasswordSchema as any) as any;

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		redirect(303, '/forgot-password');
	}

	// Pre-fill the token in the form so the hidden field carries it on submit
	const form = await superValidate({ token, password: '' }, resetPasswordAdapter);
	return { form };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await superValidate(request, resetPasswordAdapter);

		if (!form.valid) {
			return fail(400, { form });
		}

		const res = await apiFetch('/api/v1/merchant/auth/reset-password', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(form.data),
		}, locals.csrfToken);

		if (!res.ok) {
			const body = await res.json().catch(() => ({ message: 'Reset failed' }));
			return fail(res.status, { form, error: body.message || 'Failed to reset password. The link may have expired.' });
		}

		redirect(303, '/login');
	},
};
import { superValidate, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { forwardCookies } from '@repo/shared-utils/cookies';
import { apiFetch } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

const inviteAcceptSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	password: z
		.string()
		.min(8, 'Password must be at least 8 characters')
		.regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must contain uppercase, lowercase, and a digit'),
});

// Cast adapter to any to work around superforms ZodObjectType narrowness
const inviteAdapter = zod4(inviteAcceptSchema as any) as any;

export const load: PageServerLoad = async ({ params }) => {
	if (!params.token) {
		redirect(303, '/login');
	}

	const form = await superValidate(inviteAdapter);
	return { form, token: params.token };
};

export const actions: Actions = {
	default: async ({ request, cookies, params, locals }) => {
		const form = await superValidate(request, inviteAdapter);

		if (!form.valid) {
			return fail(400, { form });
		}

		const res = await apiFetch('/api/v1/merchant/staff/invite/accept', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				token: params.token,
				name: form.data.name,
				password: form.data.password,
			}),
		}, locals.csrfToken);

		if (!res.ok) {
			const body = await res.json().catch(() => ({ message: 'Invite acceptance failed' }));
			return setError(form, 'name', body.message || 'Invalid or expired invite');
		}

		forwardCookies(res, cookies as any);

		redirect(303, '/dashboard');
	},
};
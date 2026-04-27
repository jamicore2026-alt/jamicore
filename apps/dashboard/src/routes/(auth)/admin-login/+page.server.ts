import { superValidate, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';
import { loginSchema } from '@repo/shared-types';
import { forwardCookies } from '@repo/shared-utils/cookies';
import { apiFetch } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

// Cast adapter to any to work around superforms ZodObjectType narrowness
const adminLoginAdapter = zod4(loginSchema as any) as any;

export const load: PageServerLoad = async () => {
	const form = await superValidate(adminLoginAdapter);
	return { form };
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		const form = await superValidate(request, adminLoginAdapter);

		if (!form.valid) {
			return fail(400, { form });
		}

		const res = await apiFetch('/api/v1/admin/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(form.data),
		}, locals.csrfToken);

		if (!res.ok) {
			const body = await res.json().catch(() => ({ message: 'Login failed' }));
			return setError(form, 'email', body.message || 'Invalid email or password');
		}

		forwardCookies(res, cookies as any);

		redirect(303, '/admin');
	},
};
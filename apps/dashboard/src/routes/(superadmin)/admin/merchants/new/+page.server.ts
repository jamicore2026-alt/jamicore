import { superValidate, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';
import { merchantRegisterSchema } from '@repo/shared-types';
import { forwardCookies } from '@repo/shared-utils/cookies';
import { apiFetch } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

const adapter = zod4(merchantRegisterSchema as any) as any;

export const load: PageServerLoad = async () => {
	const form = await superValidate(adapter);
	return { form };
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		const form = await superValidate(request, adapter);

		if (!form.valid) {
			return fail(400, { form });
		}

		const res = await apiFetch('/api/v1/admin/merchants', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(form.data),
		}, locals.csrfToken);

		if (!res.ok) {
			const body = await res.json().catch(() => ({ message: 'Failed to create merchant' }));
			return setError(form, 'ownerEmail', body.message || 'Failed to create merchant');
		}

		forwardCookies(res, cookies as any);

		redirect(303, '/admin/merchants');
	},
};

import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { fail } from '@sveltejs/kit';
import { emailSchema } from '@repo/shared-types';
import { apiFetch } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

// Cast adapter to any to work around superforms ZodObjectType narrowness
const emailAdapter = zod4(emailSchema as any) as any;

export const load: PageServerLoad = async () => {
	const form = await superValidate(emailAdapter);
	return { form, success: false };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await superValidate(request, emailAdapter);

		if (!form.valid) {
			return fail(400, { form, success: false });
		}

		const _res = await apiFetch('/api/v1/merchant/auth/forgot-password', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(form.data),
		}, locals.csrfToken);

		// Always show success to avoid email enumeration
		return { form, success: true };
	},
};
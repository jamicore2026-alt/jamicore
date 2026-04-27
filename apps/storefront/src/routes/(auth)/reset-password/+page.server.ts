import type { PageServerLoad, Actions, RequestEvent } from './$types.js';
import { fail, redirect } from '@sveltejs/kit';
import { superValidate, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { resetPasswordSchema } from '@repo/shared-types';
import { apiFetch } from '$lib/server/api';

// Cast adapter to any to work around superforms ZodObjectType narrowness
const resetPasswordAdapter = zod4(resetPasswordSchema as any) as any;

export const load: PageServerLoad = async ({ url }) => {
  const token = url.searchParams.get('token') ?? '';
  const form = await superValidate(resetPasswordAdapter);

  return {
    form,
    token,
  };
};

export const actions: Actions = {
  default: async (event: RequestEvent) => {
    const { request, url } = event;
    const form = await superValidate(request, resetPasswordAdapter);

    if (!form.valid) {
      return fail(400, { form });
    }

    const host = url.hostname
      ? `${url.hostname}${url.port ? ':' + url.port : ''}`
      : undefined;

    const res = await apiFetch('/api/v1/customer/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.data),
    }, host, event.locals.csrfToken);

    if (!res.ok) {
      let message = 'Password reset failed. The link may have expired.';
      try {
        const body = await res.json();
        if (body.message) message = body.message;
      } catch {
        // response was not JSON
      }
      setError(form, 'password', message);
      return fail(400, { form });
    }

    redirect(303, '/login?message=Password+reset+successfully.+Please+sign+in.');
  },
};
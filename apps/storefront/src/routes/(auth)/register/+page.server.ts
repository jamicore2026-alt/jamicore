import type { PageServerLoad, Actions, RequestEvent } from './$types.js';
import { fail, redirect } from '@sveltejs/kit';
import { superValidate, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { customerRegisterSchema } from '@repo/shared-types';
import { forwardCookies } from '@repo/shared-utils/cookies';
import { apiFetch } from '$lib/server/api';

// Cast adapter to any to work around superforms ZodObjectType narrowness
const registerAdapter = zod4(customerRegisterSchema as any) as any;

export const load: PageServerLoad = async () => {
  const form = await superValidate(registerAdapter);
  return { form };
};

export const actions: Actions = {
  default: async (event: RequestEvent) => {
    const { request, cookies, url } = event;
    const form = await superValidate(request, registerAdapter);

    if (!form.valid) {
      return fail(400, { form });
    }

    const host = url.hostname
      ? `${url.hostname}${url.port ? ':' + url.port : ''}`
      : undefined;

    try {
      const res = await apiFetch('/api/v1/customer/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.data),
      }, host, event.locals.csrfToken);

      forwardCookies(res, cookies as any);

      if (!res.ok) {
        let message = 'Registration failed. Please try again.';
        try {
          const body = await res.json();
          if (body.message) message = body.message;
        } catch {
          // response was not JSON
        }
        return setError(form, 'email', message);
      }

      redirect(303, '/verify-email');
    } catch (err: any) {
      // Re-throw SvelteKit redirects
      if (err?.status && err?.location) throw err;
      console.error('[register action] error:', err);
      return setError(form, 'email', err?.message || 'An unexpected error occurred. Please try again.');
    }
  },
};
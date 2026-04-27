import type { PageServerLoad, Actions, RequestEvent } from './$types.js';
import { fail, redirect } from '@sveltejs/kit';
import { superValidate, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { loginSchema } from '@repo/shared-types';
import { forwardCookies } from '@repo/shared-utils/cookies';
import { apiFetch } from '$lib/server/api';

// Cast adapter to any to work around superforms ZodObjectType narrowness
// (superforms expects ZodType<Record<string, unknown>> but our schemas have specific output types)
const loginAdapter = zod4(loginSchema as any) as any;

export const load: PageServerLoad = async ({ url }) => {
  const form = await superValidate(loginAdapter);
  return {
    form,
    message: url.searchParams.get('message') ?? null,
  };
};

export const actions: Actions = {
  default: async (event: RequestEvent) => {
    const { request, cookies, url } = event;
    const form = await superValidate(request, loginAdapter);

    if (!form.valid) {
      return fail(400, { form });
    }

    const host = url.hostname
      ? `${url.hostname}${url.port ? ':' + url.port : ''}`
      : undefined;

    try {
      const res = await apiFetch('/api/v1/customer/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.data),
      }, host, event.locals.csrfToken);

      forwardCookies(res, cookies as any);

      if (!res.ok) {
        let message = 'Login failed. Please try again.';
        try {
          const body = await res.json();
          if (body.message) message = body.message;
        } catch {
          // response was not JSON
        }
        return setError(form, 'email', message);
      }

      redirect(303, '/account');
    } catch (err: any) {
      // Re-throw SvelteKit redirects (they throw to be caught by the framework)
      if (err?.status && err?.location) throw err;
      // Log and return a user-friendly error instead of 500
      console.error('[login action] error:', err);
      return setError(form, 'email', err?.message || 'An unexpected error occurred. Please try again.');
    }
  },
};
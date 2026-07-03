import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event, {
    // i18n: rewrite the static <html lang="en"> from app.html with the store's
    // configured language + direction (stashed on locals by +layout.server.ts).
    // Runs in the initial server HTML so crawlers and assistive tech see the
    // correct lang/dir without waiting for client-side hydration.
    transformPageChunk: ({ html }) => {
      const lang = event.locals.lang ?? 'en';
      const dir = event.locals.dir ?? 'ltr';
      return html.replace(/<html\s+lang="en"\s*>/, `<html lang="${lang}" dir="${dir}">`);
    },
  });

  // Security headers (defense-in-depth; this app had no hooks.server.ts before)
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera()');

  return response;
};
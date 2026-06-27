import type { LayoutServerLoad } from './$types.js';
import { safeDecodeJWT, getAuthScope } from '@repo/shared-utils/jwt';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const load: LayoutServerLoad = async ({ cookies, url, fetch, locals }) => {
  // Resolve store from host header (subdomain)
  const host = url.hostname;
  const subdomain = host.split('.')[0];
  const storeDomain = subdomain !== 'localhost' && subdomain !== '127'
    ? subdomain
    : undefined;

  let store = null;
  if (storeDomain) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/public/store`, {
        headers: { 'X-Store-Domain': storeDomain },
      });
      if (res.ok) {
        const data = await res.json();
        store = data.store ?? data;
      }
    } catch {
      // Store fetch failed — continue without store data
    }
  }

  // i18n: derive document language + direction from the store's configured
  // language (defaults to en / ltr when no store). Stashed on locals so the
  // hooks.server.ts transformPageChunk can rewrite <html lang="en"> in the
  // initial server HTML (SEO- and WCAG-correct; client-side mutation is too late).
  const lang = store?.language ?? 'en';
  locals.lang = lang;
  locals.dir = lang === 'ar' ? 'rtl' : 'ltr';

  // Check auth status
  const accessToken = cookies.get('access_token');
  const payload = safeDecodeJWT(accessToken);
  const scope = payload ? getAuthScope(payload) : null;
  const isLoggedIn = scope === 'customer';

  // Build theme overrides from store config
  const themeOverrides = store ? {
    primary: store.primaryColor ?? undefined,
    secondary: store.secondaryColor ?? undefined,
    accent: store.accentColor ?? undefined,
    fontFamily: store.fontFamily ?? undefined,
    borderRadius: store.borderRadius ?? undefined,
  } : undefined;

  return {
    store,
    themeType: store?.themeType ?? 'appliances',
    themeOverrides,
    isLoggedIn,
  };
};
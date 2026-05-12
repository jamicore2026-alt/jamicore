const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

/**
 * Server-side fetch wrapper for backend API calls.
 * Uses 'manual' redirect so Set-Cookie headers are preserved
 * and can be forwarded to the browser via forwardCookies().
 * Forwards CSRF token on mutating requests.
 */
export async function apiFetch(
	path: string,
	options: RequestInit = {},
	csrfToken?: string,
	cookie?: string,
): Promise<Response> {
	const headers = new Headers(options.headers as Record<string, string>);
	if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
	if (cookie) headers.set('Cookie', cookie);
	return fetch(`${API_BASE}${path}`, {
		...options,
		headers,
		redirect: 'manual',
	});
}
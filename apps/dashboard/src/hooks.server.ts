import type { Handle } from '@sveltejs/kit';
import { safeDecodeJWT, isTokenExpired, getAuthScope } from '@repo/shared-utils/jwt';
import { env } from '$lib/config/env.js';

const API_BASE = env.API_BASE_URL;

function getRefreshUrl(scope: 'merchant' | 'admin'): string {
	return scope === 'admin'
		? `${API_BASE}/api/v1/admin/auth/refresh`
		: `${API_BASE}/api/v1/merchant/auth/refresh`;
}

/**
 * Parse a Set-Cookie string and extract name, value, and key attributes.
 * Fastify cookie plugin may sign cookies (value can contain dots and .s:).
 */
function parseSetCookie(cookieStr: string): {
	name: string;
	value: string;
	path?: string;
	httpOnly?: boolean;
	secure?: boolean;
	sameSite?: 'strict' | 'lax' | 'none';
	maxAge?: number;
	expires?: Date;
} {
	const parts = cookieStr.split(';').map((p) => p.trim());
	const [nameValue] = parts;
	const eqIdx = nameValue.indexOf('=');
	const name = nameValue.substring(0, eqIdx).trim();
	const value = nameValue.substring(eqIdx + 1).trim();

	const attrs: Record<string, string> = {};
	for (let i = 1; i < parts.length; i++) {
		const part = parts[i];
		const attrEq = part.indexOf('=');
		if (attrEq === -1) {
			attrs[part.toLowerCase()] = 'true';
		} else {
			const attrName = part.substring(0, attrEq).trim().toLowerCase();
			const attrValue = part.substring(attrEq + 1).trim();
			attrs[attrName] = attrValue;
		}
	}

	let sameSite: 'strict' | 'lax' | 'none' | undefined;
	if (attrs.samesite === 'strict') sameSite = 'strict';
	else if (attrs.samesite === 'lax') sameSite = 'lax';
	else if (attrs.samesite === 'none') sameSite = 'none';

	let maxAge: number | undefined;
	if (attrs['max-age']) {
		const parsed = parseInt(attrs['max-age'], 10);
		if (!Number.isNaN(parsed)) maxAge = parsed;
	}

	let expires: Date | undefined;
	if (attrs.expires) {
		const d = new Date(attrs.expires);
		if (!Number.isNaN(d.getTime())) expires = d;
	}

	return {
		name,
		value,
		path: attrs.path || '/',
		httpOnly: 'httponly' in attrs,
		secure: 'secure' in attrs,
		sameSite,
		maxAge,
		expires,
	};
}

export const handle: Handle = async ({ event, resolve }) => {
	// Ensure CSRF cookie exists for all sessions
	let csrfToken = event.cookies.get('csrf_token');
	if (!csrfToken) {
		csrfToken = crypto.randomUUID();
		event.cookies.set('csrf_token', csrfToken, {
			path: '/',
			httpOnly: false,
			sameSite: 'strict',
			secure: env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 7,
		});
	}
	event.locals.csrfToken = csrfToken;

	const accessToken = event.cookies.get('access_token');

	if (accessToken) {
		// SECURITY WARNING: safeDecodeJWT does NOT verify the signature.
		// The decoded payload is advisory ONLY for UI state (e.g., showing logged-in user).
		// ALL authorization decisions MUST be made by the backend API.
		const payload = safeDecodeJWT(accessToken);

		if (payload && isTokenExpired(payload)) {
			const scope = getAuthScope(payload);
			if (scope === 'merchant' || scope === 'superadmin') {
				try {
					const refreshUrl = getRefreshUrl(scope === 'superadmin' ? 'admin' : 'merchant');
					const csrfToken = event.cookies.get('csrf_token');
					const refreshResponse = await fetch(refreshUrl, {
						method: 'POST',
						headers: {
							Cookie: `refresh_token=${event.cookies.get('refresh_token')}`,
							...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
						},
					});

					if (refreshResponse.ok) {
						const setCookies = refreshResponse.headers.getSetCookie();
						for (const cookieStr of setCookies) {
							const parsed = parseSetCookie(cookieStr);
							// Decode before re-setting to avoid double-encoding (same fix as forwardCookies)
							event.cookies.set(parsed.name, decodeURIComponent(parsed.value), {
								path: parsed.path || '/',
								httpOnly: parsed.httpOnly ?? true,
								sameSite: parsed.sameSite || 'strict',
								secure: parsed.secure ?? (env.NODE_ENV === 'production'),
								maxAge: parsed.maxAge,
								expires: parsed.expires,
							});
						}
					} else {
						event.cookies.delete('access_token', { path: '/' });
						event.cookies.delete('refresh_token', { path: '/' });
					}
				} catch {
					// Refresh failed — continue
				}
			}
		}

		if (payload) {
			const scope = getAuthScope(payload);
			if (scope === 'merchant' && 'userId' in payload) {
				event.locals.userId = payload.userId;
				event.locals.storeId = payload.storeId;
				event.locals.userRole = payload.role;
			} else if (scope === 'superadmin' && 'superAdminId' in payload) {
				event.locals.superAdminId = payload.superAdminId;
			}
		}
	}

	const response = await resolve(event);

	// Security headers
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera()');
	response.headers.set(
		'Content-Security-Policy',
		"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;"
	);
	if (env.NODE_ENV === 'production') {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
	}

	return response;
};

export const handleError = ({ error, event: _event }) => {
	const isDev = env.NODE_ENV !== 'production';
	if (isDev) {
		console.error('Server error:', error);
	} else {
		// In production, do NOT log error messages — they may contain PII,
		// tokens, or secrets from downstream API failures. Use Sentry/structured
		// logging with redaction instead of console.error.
		console.error('Server error occurred');
	}
	return {
		message: 'An unexpected error occurred',
	};
};

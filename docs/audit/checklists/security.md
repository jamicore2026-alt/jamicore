# Security Audit Checklist

## Authentication
- [ ] JWT signature verification uses strong secret (not default/dev)
- [ ] Token expiry is enforced (access token: 15m, refresh token: 7d)
- [ ] Refresh token rotation on use
- [ ] Invalidated tokens are rejected (blacklist check)
- [ ] Password reset tokens are single-use and time-bound
- [ ] Scope enforcement on every route (merchant/customer/superAdmin)
- [ ] Invite tokens are single-use and time-bound

## Authorization
- [ ] Every route has a preHandler or schema declaring required scope
- [ ] Merchant routes verify store ownership/membership
- [ ] Customer routes verify ownership of own data
- [ ] SuperAdmin routes are isolated and protected
- [ ] No privilege escalation via parameter tampering

## Injection
- [ ] All SQL queries use Drizzle ORM (no raw string interpolation)
- [ ] No `db.execute(sql\`...\`)` with untrusted input
- [ ] Zod validation runs before DB operations
- [ ] No command injection in file operations

## Secrets & Configuration
- [ ] No `.env` files in git history
- [ ] No hardcoded API keys, passwords, or secrets
- [ ] No sensitive data in logs or error responses
- [ ] Database connection string uses environment variables

## CSRF / XSS
- [ ] Dashboard POST/PUT/DELETE routes have CSRF protection
- [ ] No `\@html` directive with untrusted data in Svelte
- [ ] User-generated content is HTML-escaped in display

## Rate Limiting
- [ ] Auth endpoints have strict rate limits (login, register, forgot-password)
- [ ] Payment endpoints have rate limits
- [ ] Admin mutation endpoints have rate limits
- [ ] Public read endpoints have generous but present limits

## Data Exposure
- [ ] API responses don't include internal IDs, timestamps, or metadata beyond what's needed
- [ ] No endpoint returns full user records with passwords/hashes
- [ ] Error responses don't leak stack traces or DB details in production
- [ ] File upload responses don't expose server paths

## CORS
- [ ] CORS origin is restricted to known domains in production
- [ ] No `*` wildcard origin in production config
- [ ] Credentials are properly handled

## File Upload
- [ ] File extensions validated against allowlist
- [ ] MIME type checked independently of extension
- [ ] File size limits enforced
- [ ] Upload path sanitized (no `../` traversal)
- [ ] Uploaded files served from separate domain or with correct headers

## Session & Cookies
- [ ] Cookies use `HttpOnly`, `Secure`, `SameSite=Strict/Lax`
- [ ] Session IDs are cryptographically random
- [ ] Session expiry is enforced server-side

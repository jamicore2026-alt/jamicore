// P1-F regression: API keys are NOT owners — requirePermission must enforce the
// API_KEY_PERMISSIONS allowlist. Guards against re-introducing the old behavior
// where API-key auth set role='OWNER' / perms=['*'] (full owner powers).
import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { requirePermission, API_KEY_PERMISSIONS } from './merchant.js';

// Sensitive management permissions that must NEVER be granted to an API key.
const DENIED_FOR_API_KEYS = [
  'apiKeys:read',
  'apiKeys:write',
  'billing:write',
  'staff:write',
  'webhooks:write',
  'payments:config',
  'store:write',
  'theme:write',
];

function buildApp(role: string, perms: string[]) {
  const fastify = Fastify();
  fastify.addHook('onRequest', async (request) => {
    request.userRole = role;
    request.userPermissions = perms;
  });
  fastify.get('/guarded', { preHandler: requirePermission('apiKeys:write') }, async () => ({
    ok: true,
  }));
  fastify.get('/products', { preHandler: requirePermission('products:write') }, async () => ({
    ok: true,
  }));
  return fastify;
}

describe('requirePermission — API-key scoping (P1-F)', () => {
  it('API_KEY_PERMISSIONS excludes all sensitive management permissions', () => {
    expect(API_KEY_PERMISSIONS).not.toContain('*');
    for (const denied of DENIED_FOR_API_KEYS) {
      expect(API_KEY_PERMISSIONS).not.toContain(denied);
    }
  });

  it('API_KEY role is denied apiKeys:write (cannot create/manage other keys)', async () => {
    const app = buildApp('API_KEY', API_KEY_PERMISSIONS);
    const res = await app.inject({ method: 'GET', url: '/guarded' });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe('PERMISSION_DENIED');
    await app.close();
  });

  it('API_KEY role is allowed operational perms (products:write)', async () => {
    const app = buildApp('API_KEY', API_KEY_PERMISSIONS);
    const res = await app.inject({ method: 'GET', url: '/products' });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
    await app.close();
  });

  it('OWNER role short-circuits and is always allowed', async () => {
    const app = buildApp('OWNER', ['*']);
    const res = await app.inject({ method: 'GET', url: '/guarded' });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
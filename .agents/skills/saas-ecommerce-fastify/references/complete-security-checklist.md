# 🔒 Complete Security Checklist (Production-Ready)

## Pre-Deployment Security Audit

- [ ] **1. No console.log anywhere**
  ```typescript
  // ❌ WRONG
  console.log('Debug:', data);
  
  // ✅ CORRECT
  fastify.log.debug({ data }, 'Debug information');
  ```

- [ ] **2. No `any` type (TypeScript strict mode)**
  ```typescript
  // ❌ WRONG
  async function process(data: any): Promise<any> { }
  
  // ✅ CORRECT
  interface ProcessInput { /* ... */ }
  async function process(data: ProcessInput): Promise<Result> { }
  ```

- [ ] **3. No inline preHandler in route files**
  ```typescript
  // ❌ WRONG - Inline preHandler
  fastify.get('/', { preHandler: [auth] }, handler);
  
  // ✅ CORRECT - Hooks in scope only
  // scopes/merchant.ts
  fastify.addHook('onRequest', auth);
  ```

- [ ] **4. Zod strictObject() on ALL routes (Zod 4)**
  ```typescript
  const schema = z.strictObject({
    name: z.string()
  });  // ✅ Zod 4 - prevents additional properties
  ```

- [ ] **5. ownerEmail/ownerName/ownerPhone NEVER in public responses**
  ```typescript
  const { ownerEmail, ownerName, ownerPhone, ...publicStore } = store;
  return publicStore;  // ✅ Filtered
  ```

- [ ] **6. JWT ONLY in httpOnly cookie, NEVER in response body**
  ```typescript
  reply.setCookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  });
  return { success: true };  // ✅ No token in body
  ```

- [ ] **7. storeId ONLY from JWT (request.storeId), NEVER from body/query**
  ```typescript
  // ❌ WRONG
  const storeId = request.body.storeId;
  
  // ✅ CORRECT
  const storeId = request.storeId; // Set by scope hook from JWT
  ```

- [ ] **8. No require() - ESM imports only**
  ```typescript
  // ❌ WRONG
  const bcrypt = require('bcrypt');
  
  // ✅ CORRECT
  import bcrypt from 'bcrypt';
  ```

- [ ] **9. fastify.log.* for all logging**
  ```typescript
  fastify.log.info('Server started');
  fastify.log.error({ err }, 'Database error');
  ```

- [ ] **10. Redis for caching and queues (never in-memory)**
  ```typescript
  // ✅ Redis only
  const cached = await redis.get(key);
  await emailQueue.add('send', data);
  ```

- [ ] **11. Seed files check NODE_ENV !== 'production'**
  ```typescript
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seeding not allowed in production');
  }
  ```

- [ ] **12. All SQL parameterized (Drizzle ORM only)**
  ```typescript
  // ❌ WRONG - Raw SQL
  db.execute(`SELECT * FROM users WHERE id = ${id}`);
  
  // ✅ CORRECT
  db.select().from(users).where(eq(users.id, id));
  ```

- [ ] **13. Rate limiting enabled on all scopes**
  ```typescript
  // scopes/merchant.ts
  await fastify.register(import('@fastify/rate-limit'), {
    max: 100,
    timeWindow: '1 minute'
  });
  ```

- [ ] **14. Helmet security headers**
  ```typescript
  await fastify.register(import('@fastify/helmet'));
  ```

- [ ] **15. CORS properly configured**
  ```typescript
  await fastify.register(import('@fastify/cors'), {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || false,
    credentials: true
  });
  ```

- [ ] **16. Input sanitization on file uploads**
  ```typescript
  const fileType = await fileTypeFromBuffer(buffer);
  if (!allowedTypes.includes(fileType?.mime)) {
    throw new Error('Invalid file type');
  }
  ```

- [ ] **17. bcrypt for passwords (never plaintext)**
  ```typescript
  const hashed = await bcrypt.hash(password, 12);
  const valid = await bcrypt.compare(password, hashed);
  ```

- [ ] **18. Store status check on EVERY merchant route**
  ```typescript
  if (store.status === 'suspended') {
    return reply.status(403).send({ error: 'Store suspended' });
  }
  ```

- [ ] **19. Error responses NEVER expose stack traces**
  ```typescript
  reply.status(500).send({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An error occurred' 
      : error.message
  });
  ```

- [ ] **20. No sensitive data in logs**
  ```typescript
  // ❌ WRONG
  fastify.log.info({ user });
  
  // ✅ CORRECT
  fastify.log.info({ userId: user.id, email: user.email });
  ```

## Security Headers Check

Run this to verify headers:
```bash
curl -I http://localhost:3000/api/v1/public/health
```

Expected headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=...`
- `Content-Security-Policy: ...`

## Dependency Security Scan

```bash
# Scan for vulnerabilities
pnpm audit

# Update dependencies
pnpm update --interactive

# Check for outdated
pnpm outdated
```
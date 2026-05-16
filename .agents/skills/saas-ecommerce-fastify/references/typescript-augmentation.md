# TypeScript Request Type Augmentation

The scope hooks attach `storeId`, `userId`, `userRole` etc. to the request object. Without proper type declarations, TypeScript will error on every access. This file is **mandatory**.

```typescript
// types/fastify.d.ts
import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    // Set by merchant scope hook (from JWT)
    storeId: string;
    userId: string;
    userRole: string;

    // Set by customer scope hook (from JWT)
    customerId?: string;

    // Set by superAdmin scope hook (from JWT)
    superAdminId?: string;
    adminRole?: string;
  }
}
```

Ensure `tsconfig.json` includes this file:
```json
{
  "include": ["src/**/*"]
}
```

Since `types/fastify.d.ts` is under `src/`, it will be auto-included.

**Key Rule:** NEVER use `(request as any).storeId`. Always rely on the type declaration above.
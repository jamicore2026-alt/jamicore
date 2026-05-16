# Security Best Practices

## 1. Zod Validation on Every Route

```typescript
const schema = z.strictObject({
  email: z.email(),  // Zod 4 top-level validator
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
});  // strictObject() rejects unknown keys automatically
```

## 2. Never Trust Client Content-Type

```typescript
import { fileTypeFromBuffer } from 'file-type';

// Upload service - ALWAYS validate actual file content
async function validateUpload(buffer: Buffer, allowedTypes: string[]) {
  const fileType = await fileTypeFromBuffer(buffer);
  
  if (!fileType || !allowedTypes.includes(fileType.mime)) {
    throw new Error('Invalid file type');
  }
  
  return fileType;
}
```

## 3. JWT in httpOnly Cookies

```typescript
// CORRECT - Token in httpOnly cookie
async function login(request, reply) {
  const user = await authService.validateCredentials(request.body);
  const token = await reply.jwtSign({ 
    userId: user.id, 
    storeId: user.storeId,
    role: user.role 
  });
  
  reply.setCookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 // 7 days (in seconds)
  });
  
  return { success: true };  // NEVER return token in body
}

// INCORRECT - NEVER do this
return { token };  // ❌ Security vulnerability
```

## 4. Bcrypt Password Handling

```typescript
import bcrypt from 'bcrypt';

// CORRECT - Never pre-sanitize password
const isValid = await bcrypt.compare(password, user.password);

// INCORRECT
const sanitized = password.trim().toLowerCase();  // ❌ Never do this
await bcrypt.compare(sanitized, user.password);
```

## 5. Store Status Check

```typescript
// This is done in scope hooks, NEVER skip
if (store.status === 'suspended') {
  reply.status(403).send({ error: 'Forbidden', message: 'Store suspended' });
  return;
}
```

## 6. Never Expose Owner Information

```typescript
// INCORRECT - Never include in public API
return {
  ...store,
  ownerEmail: store.ownerEmail,  // ❌ Security leak
  ownerPhone: store.ownerPhone     // ❌ Security leak
};

// CORRECT - Filter sensitive fields
const { ownerEmail, ownerName, ownerPhone, ...publicStore } = store;
return publicStore;
```
# Environment Variable Validation

Validate ALL environment variables at startup using Zod. Fail fast if any required variable is missing.

```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // NOTE: Use z.object() here, NOT z.strictObject()
  // process.env contains many system vars (PATH, HOME, etc.)
  // strictObject() would reject them and crash at startup
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32),

  // Email (optional in dev)
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),

  // Storage
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // Payment
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Analytics
  MIXPANEL_TOKEN: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
}).transform((env) => {
  // Add computed values
  return {
    ...env,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    isTest: env.NODE_ENV === 'test',
  };
});

// Parse and validate
const env = envSchema.parse(process.env);

// Export typed env
export const config = {
  env,
  get isProduction() {
    return env.isProduction;
  },
  get isDevelopment() {
    return env.isDevelopment;
  },
  get isTest() {
    return env.isTest;
  }
};

// Re-export for convenience
export const {
  NODE_ENV,
  PORT,
  HOST,
  DATABASE_URL,
  REDIS_URL,
  JWT_SECRET,
  RESEND_API_KEY,
  FROM_EMAIL,
  S3_BUCKET,
  S3_REGION,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  MIXPANEL_TOKEN,
  LOG_LEVEL,
} = env;
```

## Usage in Application

```typescript
// src/index.ts
import Fastify from 'fastify';
import { config } from './config/env';  // Validates at import time

const fastify = Fastify({
  logger: { level: config.LOG_LEVEL }
});

// If any required env var is missing, the app crashes here with a clear error
```

## Testing Environment Variables

```typescript
// test/env.test.ts
import { test } from 'tap';
import { envSchema } from '../src/config/env';

test('validates required environment variables', async (t) => {
  // This should throw because DATABASE_URL is missing
  t.throws(() => {
    envSchema.parse({
      NODE_ENV: 'test',
      JWT_SECRET: '32characterminimumsecretkeyhere'
      // Missing DATABASE_URL
    });
  }, 'Should throw for missing DATABASE_URL');
});

test('allows optional variables to be missing', async (t) => {
  // This should work fine
  const result = envSchema.parse({
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: '32characterminimumsecretkeyhere'
    // Optional vars like RESEND_API_KEY can be missing
  });
  
  t.equal(result.RESEND_API_KEY, undefined);
});
```

## Environment-Specific Configuration

```typescript
// config/database.ts
import { config } from './env';

export const databaseConfig = {
  connection: config.DATABASE_URL,
  ssl: config.isProduction,
  pool: {
    min: config.isProduction ? 5 : 1,
    max: config.isProduction ? 20 : 10,
  },
  // Drizzle-specific settings
  drizzle: {
    logger: !config.isProduction,  // Log queries in dev only
  }
};
```

**Key Points:**
1. **Validation happens at startup** - fail fast if env vars are missing
2. **Use `z.object()` not `z.strictObject()`** - process.env has system vars
3. **Export individual constants** for convenient destructuring
4. **Add computed properties** like `isProduction` for cleaner conditionals
5. **Test your validation** to ensure it catches missing required vars
6. **Document optional vars** - make it clear which are required vs optional
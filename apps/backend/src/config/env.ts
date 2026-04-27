// Environment Variable Validation
// Validates ALL env vars at startup using Zod. Fail fast if any required var is missing.
// NOTE: Use z.object() here, NOT z.strictObject() — process.env has system vars (PATH, HOME, etc.)

import { z } from 'zod';

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  HOST: z.string().default('0.0.0.0'),

  // Database (PostgreSQL)
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // JWT (generate with: openssl rand -base64 48)
  JWT_SECRET: z.string().min(32),

  // Email (Resend) - optional in dev
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().optional(),

  // S3 Storage - optional in dev (local first)
  S3_BUCKET: z.string().optional(),
  S3_BACKUP_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // Payment (Stripe) - optional in dev
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Payment provider config encryption (AES-256-GCM, 64 hex chars = 32 bytes)
  PAYMENT_CONFIG_ENCRYPTION_KEY: z.string().length(64).optional(),

  // Analytics
  MIXPANEL_TOKEN: z.string().optional(),

  // Observability
  SENTRY_DSN: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // CORS - comma-separated list of allowed origins for production
  CORS_ORIGINS: z.string().optional(),

  // Storefront URL (for password reset links etc.)
  STOREFRONT_URL: z.string().default('http://localhost:5173'),

  // Health check API key (optional — if set, /health/detailed requires this key)
  HEALTH_CHECK_KEY: z.string().optional(),

  // Swagger Docs Auth (dev only)
  SWAGGER_USER: z.string().default('admin'),
  SWAGGER_PASSWORD: z.string().default('docs'),

  // Reverse proxy hops for accurate client IP (Cloudflare → ALB → app = 2)
  TRUST_PROXY_HOPS: z.coerce.number().min(1).max(5).optional(),
}).transform((env) => ({
  ...env,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
}));

// Parse and validate — throws on invalid config
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  throw new Error(`Missing or invalid environment variables:\n${issues.join('\n')}`);
}

export const env = parsed.data;

// Type-safe access
export type Env = z.infer<typeof envSchema>;
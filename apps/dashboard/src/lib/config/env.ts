import { z } from 'zod';

const envSchema = z.object({
  API_BASE_URL: z.string().url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  throw new Error(`Missing or invalid environment variables:\n${issues.join('\n')}`);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;

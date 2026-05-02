// Database connection using Drizzle ORM + postgres.js
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { env } from '../config/env.js';

// Create postgres.js client
const client = postgres(env.DATABASE_URL, {
  max: env.DB_POOL_SIZE ?? (env.isProduction ? 20 : 10),
  idle_timeout: env.DB_POOL_IDLE_TIMEOUT ?? 20,
  connect_timeout: 10,
  query_timeout: 30000,
  statement_timeout: 25000,
} as Parameters<typeof postgres>[1]);

// Create Drizzle instance with full schema
export const db = drizzle(client, { schema });

// Export client for graceful shutdown
export { client };

// Pool metrics using pg_stat_activity
export async function getPoolMetrics(): Promise<{ active: number; idle: number; waiting: number }> {
  try {
    const result = await client`
      SELECT
        count(*) FILTER (WHERE state = 'active')::int as active,
        count(*) FILTER (WHERE state = 'idle')::int as idle,
        count(*) FILTER (WHERE wait_event_type IS NOT NULL AND state = 'active')::int as waiting
      FROM pg_stat_activity
      WHERE datname = current_database() AND backend_type = 'client backend'
    `;
    return (result[0] as { active: number; idle: number; waiting: number } | undefined) ?? { active: 0, idle: 0, waiting: 0 };
  } catch {
    return { active: 0, idle: 0, waiting: 0 };
  }
}

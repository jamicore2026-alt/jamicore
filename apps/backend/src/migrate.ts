// Production database migration script
// Run this in Docker container after deployment

import 'dotenv/config';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, client } from './db/index.js';
import { env } from './config/env.js';

async function runMigrations() {
  // eslint-disable-next-line no-console
  console.log('[Migrate] Starting database migrations...');
  // eslint-disable-next-line no-console
  console.log('[Migrate] Database URL:', env.DATABASE_URL.replace(/:[^:@]+@/, ':***@'));

  try {
    await migrate(db, { migrationsFolder: './apps/backend/drizzle' });
    // eslint-disable-next-line no-console
    console.log('[Migrate] Migrations completed successfully.');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Migrate] Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();

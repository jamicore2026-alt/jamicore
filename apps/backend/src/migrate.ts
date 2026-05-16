/* eslint-disable no-console */
// Production database migration script
// Run this in Docker container after deployment

import 'dotenv/config';
import { runMigrations, client } from './db/index.js';
import { env } from './config/env.js';

async function main() {
  console.log('[Migrate] Starting database migrations...');
  console.log('[Migrate] Database URL:', env.DATABASE_URL.replace(/:[^:@]+@/, ':***@'));

  try {
    await runMigrations();
    console.log('[Migrate] Migrations completed successfully.');
  } catch (error) {
    console.error('[Migrate] Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

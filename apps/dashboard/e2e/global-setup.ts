import { execSync } from 'child_process';

/**
 * Global setup: seed the database before any tests run.
 */
export default async function globalSetup() {
  console.log('[Global Setup] Seeding database...');
  try {
    execSync('pnpm --filter backend db:seed', { stdio: 'inherit' });
  } catch {
    console.error('[Global Setup] Database seed failed. Ensure Postgres is running.');
    process.exit(1);
  }
  console.log('[Global Setup] Database seeded successfully.');
}

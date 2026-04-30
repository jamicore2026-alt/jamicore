import 'dotenv/config';

// Ensure required env vars exist for tests that load modules importing config/env.ts
process.env.DATABASE_URL ||= 'postgresql://saas_ecom:saas_ecom_dev_pass@localhost:5432/saas_ecom_dev';
process.env.REDIS_URL ||= 'redis://localhost:6379';
process.env.JWT_SECRET ||= 'test-secret-that-is-at-least-32-characters-long';

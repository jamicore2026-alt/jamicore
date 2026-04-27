/** Seeded test credentials for E2E tests */
export const TEST_CREDENTIALS = {
  superAdmin: {
    email: 'admin@saasplatform.com',
    password: 'Admin1234',
  },
  merchant: {
    email: 'owner@techgear.com',
    password: 'Merchant1234',
  },
  staff: {
    email: 'staff@techgear.com',
    password: 'Merchant1234',
  },
  customer: {
    email: 'john@example.com',
    password: 'Customer1234',
  },
  customer2: {
    email: 'fatima@example.com',
    password: 'Customer1234',
  },
} as const;

/** Default store domain for customer-facing tests */
export const DEFAULT_STORE_DOMAIN = 'techgear.localhost';
export const DEFAULT_STORE_ID = 'techgear';

/** Backend API base URL */
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

/** Frontend base URLs */
export const STOREFRONT_URL = process.env.STOREFRONT_URL || 'http://localhost:5173';
export const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:5174';

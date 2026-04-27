import { test as base, expect, type Page } from '@playwright/test';
import { loginViaApi, parseCookies, TEST_CREDENTIALS } from '@repo/e2e-utils';

export type AuthRole = 'customer' | 'merchant' | 'admin';

interface AuthFixture {
  /** A page pre-authenticated as a customer */
  customerPage: Page;
  /** A page pre-authenticated as a merchant */
  merchantPage: Page;
  /** A page pre-authenticated as a super admin */
  adminPage: Page;
  /** Programmatically log in and inject cookies into the given context */
  login: (role: AuthRole) => Promise<void>;
}

export const test = base.extend<AuthFixture>({
  login: async ({ context, baseURL }, use) => {
    await use(async (role: AuthRole) => {
      let email: string;
      let password: string;

      if (role === 'customer') {
        email = TEST_CREDENTIALS.customer.email;
        password = TEST_CREDENTIALS.customer.password;
      } else if (role === 'merchant') {
        email = TEST_CREDENTIALS.merchant.email;
        password = TEST_CREDENTIALS.merchant.password;
      } else {
        email = TEST_CREDENTIALS.superAdmin.email;
        password = TEST_CREDENTIALS.superAdmin.password;
      }

      const setCookieHeaders = await loginViaApi(role, email, password);
      const cookies = parseCookies(setCookieHeaders, baseURL);
      await context.addCookies(cookies);
    });
  },

  customerPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    const setCookieHeaders = await loginViaApi('customer', TEST_CREDENTIALS.customer.email, TEST_CREDENTIALS.customer.password);
    const cookies = parseCookies(setCookieHeaders, baseURL);
    await context.addCookies(cookies);
    await use(page);
    await context.close();
  },

  merchantPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    const setCookieHeaders = await loginViaApi('merchant', TEST_CREDENTIALS.merchant.email, TEST_CREDENTIALS.merchant.password);
    const cookies = parseCookies(setCookieHeaders, baseURL);
    await context.addCookies(cookies);
    await use(page);
    await context.close();
  },

  adminPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    const setCookieHeaders = await loginViaApi('admin', TEST_CREDENTIALS.superAdmin.email, TEST_CREDENTIALS.superAdmin.password);
    const cookies = parseCookies(setCookieHeaders, baseURL);
    await context.addCookies(cookies);
    await use(page);
    await context.close();
  },
});

export { expect };

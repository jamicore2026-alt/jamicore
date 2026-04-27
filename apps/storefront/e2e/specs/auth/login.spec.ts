import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Storefront Auth', () => {
  test.describe('Login', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
    });

    test('page has correct title and form elements', async ({ page }) => {
      await expect(page).toHaveTitle(/Sign In|Login/i);
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      await expect(page.locator('text=Don\'t have an account?')).toBeVisible();
      await expect(page.locator('a[href="/register"]')).toBeVisible();
      await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
    });

    test('valid customer login redirects to account', async ({ page }) => {
      await page.fill('input[name="email"]', 'john@example.com');
      await page.fill('input[name="password"]', 'Customer1234');
      await page.click('button[type="submit"]');
      await page.waitForURL('/account');
      await expect(page).toHaveURL('/account');
    });

    test('invalid password shows error message', async ({ page }) => {
      await page.fill('input[name="email"]', 'john@example.com');
      await page.fill('input[name="password"]', 'WrongPassword123');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Invalid credentials')).toBeVisible();
    });

    test('empty form shows validation errors', async ({ page }) => {
      await page.click('button[type="submit"]');
      // Superforms + Zod validation should show field errors after enhance
      await expect(page.locator('input[name="email"][aria-invalid="true"]')).toBeVisible();
      await expect(page.locator('input[name="password"][aria-invalid="true"]')).toBeVisible();
    });

    test('login link from register page works', async ({ page }) => {
      await page.goto('/register');
      await page.click('a[href="/login"]');
      await page.waitForURL('/login');
      await expect(page).toHaveURL('/login');
    });
  });
});

import { test, expect } from '@playwright/test';

test.describe('Storefront Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('page has correct title and form elements', async ({ page }) => {
    await expect(page).toHaveTitle(/Sign Up|Register/i);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('main a[href="/login"]', { hasText: /Sign in/i })).toBeVisible();
  });

  test('successful registration redirects to verify email', async ({ page }) => {
    const uniqueEmail = `test-${Date.now()}@example.com`;
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', 'TestPass123');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.click('button[type="submit"]');
    await page.waitForURL('/verify-email');
    await expect(page).toHaveURL(/\/verify-email/);
  });

  test('duplicate email shows error', async ({ page }) => {
    await page.fill('input[name="email"]', 'john@example.com');
    await page.fill('input[name="password"]', 'TestPass123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=already exists')).toBeVisible();
  });

  test('weak password shows validation error', async ({ page }) => {
    await page.fill('input[name="email"]', 'weak@example.com');
    await page.fill('input[name="password"]', '123');
    await page.click('button[type="submit"]');
    await expect(page.locator('input[name="password"][aria-invalid="true"]')).toBeVisible();
  });
});

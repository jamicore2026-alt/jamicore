import { test, expect } from '@playwright/test';

test.describe('Storefront Forgot Password', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password');
  });

  test('page has email input and submit button', async ({ page }) => {
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('valid email shows success message', async ({ page }) => {
    await page.fill('input[name="email"]', 'john@example.com');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=check your email')).toBeVisible();
  });

  test('invalid email format shows validation error', async ({ page }) => {
    await page.fill('input[name="email"]', 'not-an-email');
    await page.click('button[type="submit"]');
    // Browser native validation or superforms should show an error
    await expect(page.locator('text=Invalid email').or(page.locator('input[name="email"]:invalid'))).toBeVisible();
  });
});

test.describe('Dashboard Forgot Password', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password');
  });

  test('valid email shows success message', async ({ page }) => {
    await page.fill('input[name="email"]', 'owner@techgear.com');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=check your email')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Allow Svelte hydration to complete before interacting
    await page.waitForTimeout(1000);
  });

  test('loads successfully with store name', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'TechGear Pro' })).toBeVisible();
  });

  test('has navigation links', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.locator('header nav a[href="/products"]')).toBeVisible();
  });

  test('has search and cart buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cart', exact: true })).toBeVisible();
  });

  test('has sign in button when not logged in', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
  });

  test('search opens search bar', async ({ page }) => {
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.locator('input[name="q"]')).toBeVisible();
  });
});

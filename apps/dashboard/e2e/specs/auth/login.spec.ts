import { test, expect } from '@playwright/test';

test.describe('Dashboard Auth', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('page has correct title and form elements', async ({ page }) => {
    await expect(page).toHaveTitle(/Sign In|Login/i);
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
  });

  test('valid merchant login redirects to dashboard', async ({ page }) => {
    await page.fill('input#email', 'owner@techgear.com');
    await page.fill('input#password', 'Merchant1234');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('valid staff login redirects to dashboard', async ({ page }) => {
    await page.fill('input#email', 'staff@techgear.com');
    await page.fill('input#password', 'Merchant1234');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('invalid password shows error message', async ({ page }) => {
    await page.fill('input#email', 'owner@techgear.com');
    await page.fill('input#password', 'WrongPassword123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Login failed')).toBeVisible();
  });

  test('empty form shows validation errors', async ({ page }) => {
    await page.click('button[type="submit"]');
    await expect(page.locator('input#email[aria-invalid="true"]')).toBeVisible();
    await expect(page.locator('input#password[aria-invalid="true"]')).toBeVisible();
  });
});

test.describe('Admin Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin-login');
  });

  test('valid super admin login redirects to admin dashboard', async ({ page }) => {
    await page.fill('input#email', 'admin@saasplatform.com');
    await page.fill('input#password', 'Admin1234');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('invalid admin credentials show error', async ({ page }) => {
    await page.fill('input#email', 'admin@saasplatform.com');
    await page.fill('input#password', 'WrongPassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Login failed')).toBeVisible();
  });
});

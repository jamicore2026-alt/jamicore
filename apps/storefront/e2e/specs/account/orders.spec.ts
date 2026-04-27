import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Account Orders', () => {
  test.beforeEach(async ({ customerPage }) => {
    await customerPage.goto('/account/orders');
  });

  test('page loads with order history', async ({ customerPage }) => {
    await expect(customerPage).toHaveTitle(/Orders/);
    await expect(customerPage.locator('text=Order History')).toBeVisible();
    // Seeded orders should be visible
    await expect(customerPage.locator('text=#ORD-001')).toBeVisible();
  });

  test('can filter orders by status', async ({ customerPage }) => {
    await expect(customerPage.locator('button', { hasText: 'Delivered' })).toBeVisible();
    await customerPage.click('button:has-text("Delivered")');
    // Should show delivered orders only
    await expect(customerPage.locator('text=delivered').first()).toBeVisible();
  });

  test('clicking order navigates to detail', async ({ customerPage }) => {
    await customerPage.locator('text=#ORD-001').first().click();
    await customerPage.waitForURL(/\/account\/orders\//);
    await expect(customerPage).toHaveURL(/\/account\/orders\//);
  });
});

import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Orders Management', () => {
  test.beforeEach(async ({ merchantPage }) => {
    await merchantPage.goto('/dashboard/orders');
  });

  test('page loads with orders table', async ({ merchantPage }) => {
    await expect(merchantPage).toHaveTitle(/Orders/);
    await expect(merchantPage.locator('text=Manage and fulfill customer orders')).toBeVisible();
    // Seeded orders should be visible
    await expect(merchantPage.locator('text=#ORD-001')).toBeVisible();
  });

  test('can filter by status', async ({ merchantPage }) => {
    await merchantPage.getByRole('button', { name: 'Delivered' }).click();
    await expect(merchantPage.locator('text=delivered').first()).toBeVisible();
  });

  test('clicking order navigates to detail', async ({ merchantPage }) => {
    await merchantPage.locator('text=#ORD-001').first().click();
    await merchantPage.waitForURL(/\/dashboard\/orders\//);
    await expect(merchantPage).toHaveURL(/\/dashboard\/orders\//);
  });
});

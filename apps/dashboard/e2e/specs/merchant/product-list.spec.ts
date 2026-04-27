import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Product List', () => {
  test.beforeEach(async ({ merchantPage }) => {
    await merchantPage.goto('/dashboard/products');
  });

  test('page loads with product table', async ({ merchantPage }) => {
    await expect(merchantPage).toHaveTitle(/Products/);
    await expect(merchantPage.locator('text=Manage your product catalog')).toBeVisible();
    await expect(merchantPage.locator('text=Add Product')).toBeVisible();
  });

  test('seeded products are visible', async ({ merchantPage }) => {
    await expect(merchantPage.locator('text=Premium Silicone Case')).toBeVisible();
    await expect(merchantPage.locator('text=Noise Cancelling Headphones')).toBeVisible();
  });

  test('search filters products', async ({ merchantPage }) => {
    await merchantPage.fill('input[placeholder="Search products..."]', 'Case');
    await merchantPage.getByRole('button', { name: 'Search' }).click();
    await expect(merchantPage.locator('text=Premium Silicone Case')).toBeVisible();
  });

  test('clicking add product navigates to form', async ({ merchantPage }) => {
    await merchantPage.getByRole('link', { name: 'Add Product' }).click();
    await merchantPage.waitForURL(/\/dashboard\/products\/new/);
    await expect(merchantPage).toHaveURL(/\/dashboard\/products\/new/);
  });
});

import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Add Product', () => {
  test.beforeEach(async ({ merchantPage }) => {
    await merchantPage.goto('/dashboard/products/new');
  });

  test('page has all form sections', async ({ merchantPage }) => {
    await expect(merchantPage).toHaveTitle(/Create Product/);
    await expect(merchantPage.locator('text=Basic Information')).toBeVisible();
    await expect(merchantPage.locator('text=Pricing & Inventory')).toBeVisible();
    await expect(merchantPage.locator('text=Additional Settings')).toBeVisible();
  });

  test('can create a new product', async ({ merchantPage }) => {
    const uniqueName = `E2E Test Product ${Date.now()}`;
    await merchantPage.fill('input#titleEn', uniqueName);
    await merchantPage.fill('input#salePrice', '99.99');
    await merchantPage.fill('input#quantity', '50');

    // Select category (first option)
    await merchantPage.click('text=Select a category');
    await merchantPage.locator('[role="option"]').first().click();

    await merchantPage.getByRole('button', { name: 'Create Product' }).click();

    // Should redirect to product detail/edit page
    await merchantPage.waitForURL(/\/dashboard\/products\//);
    await expect(merchantPage).toHaveURL(/\/dashboard\/products\//);
    await expect(merchantPage.locator('text=Product created successfully')).toBeVisible();
  });

  test('shows error for missing required fields', async ({ merchantPage }) => {
    await merchantPage.getByRole('button', { name: 'Create Product' }).click();
    await expect(merchantPage.locator('text=Please fill in required fields')).toBeVisible();
  });
});

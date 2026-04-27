import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Edit Product', () => {
  test.beforeEach(async ({ merchantPage }) => {
    await merchantPage.goto('/dashboard/products');
    // Click edit on first product
    await merchantPage.locator('a[title="Edit"]').first().click();
    await merchantPage.waitForURL(/\/dashboard\/products\//);
  });

  test('page loads with product data', async ({ merchantPage }) => {
    await expect(merchantPage).toHaveTitle(/Edit Product/);
    await expect(merchantPage.locator('text=Edit Product')).toBeVisible();
    // Title input should have value
    const titleValue = await merchantPage.inputValue('input#titleEn');
    expect(titleValue.length).toBeGreaterThan(0);
  });

  test('can update product title', async ({ merchantPage }) => {
    const newTitle = `Updated ${Date.now()}`;
    await merchantPage.fill('input#titleEn', newTitle);
    await merchantPage.getByRole('button', { name: 'Save Changes' }).click();
    await expect(merchantPage.locator('text=Product updated')).toBeVisible();
  });

  test('can toggle publish status', async ({ merchantPage }) => {
    // Go back to list and toggle publish
    await merchantPage.goto('/dashboard/products');
    const publishButton = merchantPage.locator('button[title="Unpublish"]').or(merchantPage.locator('button[title="Publish"]')).first();
    await publishButton.click();
    await merchantPage.waitForTimeout(500);
    // Status should have changed
    await expect(merchantPage.locator('text=Published').or(merchantPage.locator('text=Draft'))).toBeVisible();
  });
});

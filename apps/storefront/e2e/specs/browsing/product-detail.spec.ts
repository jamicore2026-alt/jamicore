import { test, expect } from '@playwright/test';

test.describe('Product Detail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products');
    // Allow Svelte hydration to complete
    await page.waitForTimeout(1500);
    // Click first product
    await page.locator('[role="listitem"]').first().locator('a').click();
    await page.waitForURL(/\/products\//);
    // Allow product detail page to hydrate
    await page.waitForTimeout(1500);
  });

  test('page loads with product title', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    const title = await page.locator('h1').textContent();
    expect(title?.length).toBeGreaterThan(0);
  });

  test('price is visible', async ({ page }) => {
    const mainPrice = page.locator('main').locator('text=/\\$\\d+\\.\\d{2}/').first();
    await expect(mainPrice).toBeVisible();
  });

  test('stock status is visible', async ({ page }) => {
    await expect(page.locator('text=/\\d+ in stock|Out of stock/')).toBeVisible();
  });

  test('Add to Cart button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Add to Cart/i })).toBeVisible();
  });

  test('can increase and decrease quantity', async ({ page }) => {
    const decrease = page.getByRole('button', { name: 'Decrease quantity' }).first();
    const increase = page.getByRole('button', { name: 'Increase quantity' }).first();
    const quantity = page.getByText('1', { exact: true }).first();

    await expect(quantity).toBeVisible();
    await increase.click();
    // After clicking increase, quantity should be 2
    await expect(page.getByText('2', { exact: true }).first()).toBeVisible();
    await decrease.click();
    await expect(quantity).toBeVisible();
  });

  test('adds product to cart', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /Add to Cart/i }).first();
    await addButton.click();
    // Cart drawer should open automatically and show item count
    await expect(page.getByRole('dialog', { name: 'Shopping cart' })).toBeVisible();
  });

  test('has reviews section', async ({ page }) => {
    const reviewsHeading = page.locator('main').getByRole('heading', { name: 'Reviews' });
    await expect(reviewsHeading).toBeVisible();
  });
});

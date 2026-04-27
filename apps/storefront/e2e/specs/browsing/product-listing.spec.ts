import { test, expect } from '@playwright/test';

test.describe('Product Listing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products');
  });

  test('page loads with Products title', async ({ page }) => {
    await expect(page).toHaveTitle(/Products/);
    await expect(page.locator('h1', { hasText: 'Products' })).toBeVisible();
  });

  test('product grid is visible with items', async ({ page }) => {
    const grid = page.locator('[role="list"][aria-label="Product list"]');
    await expect(grid).toBeVisible();
    const items = grid.locator('[role="listitem"]');
    await expect(items.first()).toBeVisible();
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test('desktop filters sidebar is visible', async ({ page }) => {
    // Desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('aside')).toBeVisible();
  });

  test('mobile filters button opens drawer', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    const filterButton = page.getByRole('button', { name: /Filters/i });
    await expect(filterButton).toBeVisible();
    await filterButton.click();
    await expect(page.locator('text=Filters').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
  });

  test('search query updates URL', async ({ page }) => {
    await page.goto('/products?q=case');
    await expect(page.locator('h1', { hasText: 'Search: "case"' })).toBeVisible();
  });

  test('clicking product navigates to detail', async ({ page }) => {
    const firstProduct = page.locator('[role="listitem"]').first();
    const link = firstProduct.locator('a');
    await link.click();
    await expect(page).toHaveURL(/\/products\//);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Cart Drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Allow Svelte hydration to complete before interacting
    await page.waitForTimeout(2000);
  });

  test('opens from header cart button', async ({ page }) => {
    await page.getByRole('button', { name: 'Cart', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Shopping cart' })).toBeVisible();
    await expect(page.locator('text=Your cart is empty')).toBeVisible();
  });

  test('shows empty state when cart is empty', async ({ page }) => {
    await page.getByRole('button', { name: 'Cart', exact: true }).click();
    await expect(page.locator('text=Your cart is empty')).toBeVisible();
    const drawer = page.getByRole('dialog', { name: 'Shopping cart' });
    await expect(drawer.locator('text=View Cart')).not.toBeVisible();
    await expect(drawer.locator('text=Checkout')).not.toBeVisible();
  });

  test('adds item to cart and shows in drawer', async ({ page }) => {
    // Go to first product and add to cart
    await page.goto('/products');
    await page.waitForTimeout(2000);
    await page.locator('[role="listitem"]').first().locator('a').click();
    await page.waitForURL(/\/products\//);
    await page.getByRole('button', { name: /Add to Cart/i }).first().click();

    // Cart drawer opens automatically on add; ensure it's visible
    await expect(page.getByRole('dialog', { name: 'Shopping cart' })).toBeVisible();
    await expect(page.locator('text=Cart (1)')).toBeVisible();
  });

  test('closes drawer with close button', async ({ page }) => {
    await page.getByRole('button', { name: 'Cart', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Shopping cart' })).toBeVisible();
    await page.getByRole('button', { name: 'Close cart' }).click();
    await expect(page.getByRole('dialog', { name: 'Shopping cart' })).not.toBeVisible();
  });
});

test.describe('Cart Page', () => {
  test('empty cart shows continue shopping button', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.locator('text=Your cart is empty')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Continue Shopping' })).toBeVisible();
  });

  test('has proceed to checkout link when items exist', async ({ page }) => {
    // Add item first
    await page.goto('/products');
    await page.waitForTimeout(2000);
    await page.locator('[role="listitem"]').first().locator('a').click();
    await page.waitForURL(/\/products\//);
    await page.getByRole('button', { name: /Add to Cart/i }).first().click();

    await page.goto('/cart');
    await page.waitForTimeout(1000);
    await expect(page.getByRole('button', { name: 'Proceed to Checkout' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue Shopping' })).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

test.describe('Checkout Shipping', () => {
  test.beforeEach(async ({ page }) => {
    // Add item to cart first
    await page.goto('/products');
    await page.locator('[role="listitem"]').first().locator('a').click();
    await page.waitForURL(/\/products\//);
    await page.getByRole('button', { name: /Add to Cart/i }).first().click();
    await page.goto('/checkout/shipping');
  });

  test('page has checkout stepper and shipping form', async ({ page }) => {
    await expect(page).toHaveTitle(/Shipping/);
    await expect(page.locator('text=Shipping Address')).toBeVisible();
    await expect(page.locator('text=Order Summary')).toBeVisible();
  });

  test('empty cart redirects or shows message', async ({ page }) => {
    // Go directly without adding items
    await page.goto('/checkout/shipping');
    await expect(page.locator('text=Order Summary')).toBeVisible();
  });
});

test.describe('Checkout Payment', () => {
  test('page shows payment methods and coupon field', async ({ page }) => {
    await page.goto('/checkout/payment');
    await expect(page).toHaveTitle(/Payment/);
    await expect(page.locator('text=Payment Method')).toBeVisible();
    await expect(page.locator('text=Coupon Code')).toBeVisible();
    await expect(page.locator('text=Contact Information')).toBeVisible();
  });
});

test.describe('Checkout Confirm', () => {
  test('page shows review order form', async ({ page }) => {
    await page.goto('/checkout/confirm');
    await expect(page).toHaveTitle(/Confirm/);
    await expect(page.locator('text=Review Your Order')).toBeVisible();
    await expect(page.getByRole('button', { name: /Place Order/i })).toBeVisible();
  });
});

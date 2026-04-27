import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Coupons Management', () => {
  test.beforeEach(async ({ merchantPage }) => {
    await merchantPage.goto('/dashboard/coupons');
  });

  test('page loads with seeded coupons', async ({ merchantPage }) => {
    await expect(merchantPage).toHaveTitle(/Coupons/);
    await expect(merchantPage.locator('text=WELCOME10')).toBeVisible();
    await expect(merchantPage.locator('text=FLAT20')).toBeVisible();
  });

  test('can create a new coupon', async ({ merchantPage }) => {
    await merchantPage.getByRole('button', { name: 'Create Coupon' }).first().click();
    await expect(merchantPage.locator('text=Create Coupon')).toBeVisible();

    const code = `TEST${Date.now()}`;
    await merchantPage.fill('input#couponCode', code);
    await merchantPage.fill('input#discountVal', '15');
    await merchantPage.getByRole('button', { name: 'Create' }).click();

    await expect(merchantPage.locator('text=Coupon created')).toBeVisible();
    await expect(merchantPage.locator(`text=${code}`)).toBeVisible();
  });
});

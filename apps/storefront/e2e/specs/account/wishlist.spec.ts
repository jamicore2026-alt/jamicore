import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Account Wishlist', () => {
  test.beforeEach(async ({ customerPage }) => {
    await customerPage.goto('/account/wishlist');
  });

  test('page loads', async ({ customerPage }) => {
    await expect(customerPage).toHaveTitle(/Wishlist/);
    await expect(customerPage.getByRole('heading', { name: 'Wishlist' })).toBeVisible();
  });
});

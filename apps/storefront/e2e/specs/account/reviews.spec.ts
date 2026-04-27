import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Account Reviews', () => {
  test.beforeEach(async ({ customerPage }) => {
    await customerPage.goto('/account/reviews');
  });

  test('page loads', async ({ customerPage }) => {
    await expect(customerPage).toHaveTitle(/Reviews/);
    await expect(customerPage.getByRole('heading', { name: 'My Reviews' })).toBeVisible();
  });
});

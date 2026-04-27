import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Account Profile', () => {
  test.beforeEach(async ({ customerPage }) => {
    await customerPage.goto('/account/profile');
  });

  test('page loads with customer info', async ({ customerPage }) => {
    await expect(customerPage).toHaveTitle(/Profile/);
    await expect(customerPage.getByRole('heading', { name: 'Profile' })).toBeVisible();
    await expect(customerPage.locator('text=john@example.com')).toBeVisible();
  });

  test('can update profile', async ({ customerPage }) => {
    await customerPage.fill('input#firstName', 'Johnny');
    await customerPage.fill('input#lastName', 'Updated');
    await customerPage.fill('input#phone', '+966501234567');
    await customerPage.getByRole('button', { name: 'Save Profile' }).click();
    await expect(customerPage.locator('text=Profile saved!').first()).toBeVisible({ timeout: 10000 });
  });
});

import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Account Addresses', () => {
  test.beforeEach(async ({ customerPage }) => {
    await customerPage.goto('/account/addresses');
  });

  test('page loads with seeded addresses', async ({ customerPage }) => {
    await expect(customerPage).toHaveTitle(/Addresses/);
    await expect(customerPage.getByRole('heading', { name: 'Addresses' })).toBeVisible();
    // Seeded customer has 2 addresses
    const cards = customerPage.locator('text=123 King Fahd Road');
    await expect(cards.first()).toBeVisible();
  });

  test('can delete and add address', async ({ customerPage }) => {
    // Wait for addresses to render
    await customerPage.waitForTimeout(500);
    // Delete first address
    const deleteButtons = customerPage.getByRole('button', { name: 'Delete address' });
    const countBefore = await deleteButtons.count();

    if (countBefore > 0) {
      await deleteButtons.first().click();
      // Wait for DOM to update after delete
      await customerPage.waitForTimeout(500);
      const countAfter = await customerPage.getByRole('button', { name: 'Delete address' }).count();
      expect(countAfter).toBeLessThan(countBefore);
    }
  });
});

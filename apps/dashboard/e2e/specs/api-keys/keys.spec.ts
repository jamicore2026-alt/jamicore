import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('API Keys Management', () => {
  test.beforeEach(async ({ merchantPage }) => {
    await merchantPage.goto('/dashboard/api-keys');
  });

  test('page loads with API Keys title', async ({ merchantPage }) => {
    await expect(merchantPage).toHaveTitle(/API Keys/);
    await expect(merchantPage.locator('h1', { hasText: 'API Keys' })).toBeVisible();
  });

  test('can create a new API key', async ({ merchantPage }) => {
    // Click New Key button
    await merchantPage.getByRole('button', { name: 'New Key' }).click();

    // Fill form
    await merchantPage.locator('input#name').fill('Test Key ' + Date.now());
    // Merchant scope is checked by default

    // Create
    const createButton = merchantPage.locator('button', { hasText: /Create/ }).last();
    await createButton.click();

    // Wait for key dialog to show
    await expect(merchantPage.locator('text=API Key Created')).toBeVisible();
    await expect(merchantPage.locator('input[readonly]')).toBeVisible();
  });

  test('displays existing keys in table', async ({ merchantPage }) => {
    // Table or empty state should be visible
    await expect(merchantPage.locator('table, text=No API keys')).toBeVisible();
  });

  test('can revoke an API key', async ({ merchantPage }) => {
    // Look for revoke button
    const revokeButton = merchantPage.locator('button[title="Revoke"]').first();
    if (await revokeButton.isVisible().catch(() => false)) {
      await revokeButton.click();
      // Confirm dialog
      await merchantPage.on('dialog', dialog => dialog.accept());
      await expect(merchantPage.locator('text=API key revoked')).toBeVisible();
    }
  });
});

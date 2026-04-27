import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Staff Management', () => {
  test.beforeEach(async ({ merchantPage }) => {
    await merchantPage.goto('/dashboard/settings/staff');
  });

  test('page loads with staff table', async ({ merchantPage }) => {
    await expect(merchantPage.locator('text=Manage who has access to your dashboard')).toBeVisible();
    await expect(merchantPage.locator('text=Invite')).toBeVisible();
  });

  test('can open invite dialog', async ({ merchantPage }) => {
    await merchantPage.getByRole('button', { name: 'Invite' }).click();
    await expect(merchantPage.locator('text=Invite Staff Member')).toBeVisible();
    await expect(merchantPage.locator('input#inviteEmail')).toBeVisible();
  });
});

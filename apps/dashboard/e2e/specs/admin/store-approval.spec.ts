import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Admin Store Approval', () => {
  test('admin can view pending stores', async ({ adminPage }) => {
    await adminPage.goto('/admin/stores');
    await expect(adminPage).toHaveTitle(/Stores/);
    await expect(adminPage.locator('text=Organic Market')).toBeVisible();
  });
});

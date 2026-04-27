import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Cross-App: Merchant Publish to Storefront', () => {
  test('merchant adds product and it appears in storefront', async ({ browser }) => {
    // Step 1: Merchant creates a product in dashboard
    const merchantContext = await browser.newContext({ baseURL: 'http://localhost:5174' });
    const merchantPage = await merchantContext.newPage();

    // Login as merchant
    await merchantPage.goto('/login');
    await merchantPage.fill('input#email', 'owner@techgear.com');
    await merchantPage.fill('input#password', 'Merchant1234');
    await merchantPage.click('button[type="submit"]');
    await merchantPage.waitForURL('**/dashboard');

    // Create product
    await merchantPage.goto('/dashboard/products/new');
    const uniqueName = `Cross-App Product ${Date.now()}`;
    await merchantPage.fill('input#titleEn', uniqueName);
    await merchantPage.fill('input#salePrice', '199.99');
    await merchantPage.fill('input#quantity', '10');
    await merchantPage.click('text=Select a category');
    await merchantPage.locator('[role="option"]').first().click();
    await merchantPage.getByRole('button', { name: 'Create Product' }).click();
    await merchantPage.waitForURL(/\/dashboard\/products\//);

    await merchantContext.close();

    // Step 2: Customer sees product in storefront
    const customerContext = await browser.newContext({ baseURL: 'http://techgear.localhost:5173' });
    const customerPage = await customerContext.newPage();

    await customerPage.goto('/products');
    await expect(customerPage.locator(`text=${uniqueName}`).first()).toBeVisible();

    await customerContext.close();
  });
});

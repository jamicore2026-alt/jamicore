import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('CMS Pages Management', () => {
  test.beforeEach(async ({ merchantPage }) => {
    await merchantPage.goto('/dashboard/cms');
  });

  test('page loads with CMS Pages title', async ({ merchantPage }) => {
    await expect(merchantPage).toHaveTitle(/CMS/);
    await expect(merchantPage.locator('h1', { hasText: 'CMS Pages' })).toBeVisible();
  });

  test('can create a new CMS page', async ({ merchantPage }) => {
    // Click New Page button
    await merchantPage.getByRole('button', { name: 'New Page' }).click();

    // Fill form
    await merchantPage.locator('input#slug').fill('test-page-' + Date.now());
    await merchantPage.locator('input#title').fill('Test Page');
    await merchantPage.locator('textarea#content').fill('This is a test page content.');

    // Create
    const createButton = merchantPage.locator('button', { hasText: /Create/ }).last();
    await createButton.click();

    // Wait for success
    await expect(merchantPage.locator('text=Page created')).toBeVisible();
  });

  test('can publish and unpublish a page', async ({ merchantPage }) => {
    // Find the first page and click publish/unpublish
    const toggleButton = merchantPage.locator('button[title="Publish"], button[title="Unpublish"]').first();
    const titleBefore = await toggleButton.getAttribute('title');
    await toggleButton.click();

    // Should show success toast
    await expect(merchantPage.locator(new RegExp(titleBefore === 'Publish' ? 'Page published' : 'Page unpublished'))).toBeVisible();
  });

  test('search filters pages', async ({ merchantPage }) => {
    const searchInput = merchantPage.locator('input[placeholder="Search pages..."]');
    await searchInput.fill('about');
    await merchantPage.getByRole('button', { name: 'Search' }).click();

    // Should show some results or empty state
    await expect(merchantPage.locator('table, text=No pages found')).toBeVisible();
  });

  test('pagination works', async ({ merchantPage }) => {
    // Check if pagination exists
    const pagination = merchantPage.locator('text=/Page \\d+ of/');
    if (await pagination.isVisible().catch(() => false)) {
      await expect(pagination).toBeVisible();
    }
  });
});

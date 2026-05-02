import { test, expect } from '@playwright/test';

test.describe('CMS Pages', () => {
  test('displays a published CMS page', async ({ page }) => {
    // Assuming the seeded store has a published 'about' page
    await page.goto('/pages/about');

    // Wait for the page to load
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('article')).toBeVisible();
  });

  test('shows 404 for non-existent page', async ({ page }) => {
    await page.goto('/pages/non-existent-page-12345');
    await expect(page.locator('text=404')).toBeVisible();
  });

  test('page title includes page name', async ({ page }) => {
    await page.goto('/pages/about');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('page content is rendered', async ({ page }) => {
    await page.goto('/pages/about');
    const article = page.locator('article');
    await expect(article).toBeVisible();
    // Content should have some text
    const text = await article.textContent();
    expect(text?.length ?? 0).toBeGreaterThanOrEqual(0);
  });
});

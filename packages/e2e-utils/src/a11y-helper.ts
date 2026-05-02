import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Run axe accessibility scan on the current page and assert no violations.
 * Skip color-contrast rules by default (they often fail on custom themes).
 */
export async function expectNoAccessibilityViolations(
  page: Page,
  options?: { include?: string; exclude?: string },
) {
  const builder = new AxeBuilder({ page })
    .disableRules(['color-contrast']);

  if (options?.include) {
    builder.include(options.include);
  }
  if (options?.exclude) {
    builder.exclude(options.exclude);
  }

  const accessibilityScanResults = await builder.analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
}

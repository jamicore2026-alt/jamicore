# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browsing\homepage.spec.ts >> Homepage >> search opens search bar
- Location: e2e\specs\browsing\homepage.spec.ts:26:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input[name="q"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('input[name="q"]')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - banner [ref=e5]:
      - generic [ref=e7]:
        - link "TechGear Pro" [ref=e8] [cursor=pointer]:
          - /url: /
          - generic [ref=e9]: TechGear Pro
        - navigation [ref=e10]:
          - link "Home" [ref=e11] [cursor=pointer]:
            - /url: /
          - link "Products" [ref=e12] [cursor=pointer]:
            - /url: /products
          - link "About" [ref=e13] [cursor=pointer]:
            - /url: /about
        - generic [ref=e14]:
          - button "Search" [active] [ref=e15]:
            - img
          - button "Cart" [ref=e16]:
            - img [ref=e18]
          - link "Sign In" [ref=e22] [cursor=pointer]:
            - /url: /login
            - button "Sign In" [ref=e23]
    - main [ref=e24]:
      - generic [ref=e27]:
        - generic [ref=e28]:
          - img [ref=e30]
          - generic [ref=e35]:
            - paragraph [ref=e36]: Free Shipping
            - paragraph [ref=e37]: On orders over $50
        - generic [ref=e38]:
          - img [ref=e40]
          - generic [ref=e43]:
            - paragraph [ref=e44]: Easy Returns
            - paragraph [ref=e45]: 30-day return policy
        - generic [ref=e46]:
          - img [ref=e48]
          - generic [ref=e50]:
            - paragraph [ref=e51]: Secure Payment
            - paragraph [ref=e52]: SSL encrypted checkout
        - generic [ref=e53]:
          - img [ref=e55]
          - generic [ref=e58]:
            - paragraph [ref=e59]: 24/7 Support
            - paragraph [ref=e60]: Always here to help
    - contentinfo [ref=e61]:
      - generic [ref=e62]:
        - generic [ref=e63]:
          - heading "TechGear Pro" [level=3] [ref=e65]
          - generic [ref=e66]:
            - heading "Quick Links" [level=3] [ref=e67]
            - list [ref=e68]:
              - listitem [ref=e69]:
                - link "Products" [ref=e70] [cursor=pointer]:
                  - /url: /products
              - listitem [ref=e71]:
                - link "About Us" [ref=e72] [cursor=pointer]:
                  - /url: /about
              - listitem [ref=e73]:
                - link "Cart" [ref=e74] [cursor=pointer]:
                  - /url: /cart
          - heading "Connect" [level=3] [ref=e76]
        - generic [ref=e77]:
          - paragraph [ref=e78]: © 2026 TechGear Pro. All rights reserved.
          - generic [ref=e79]:
            - generic [ref=e80]: Visa
            - generic [ref=e81]: Mastercard
            - generic [ref=e82]: Apple Pay
  - region "Notifications alt+T"
  - dialog "Cookie consent" [ref=e83]:
    - generic [ref=e85]:
      - generic [ref=e86]:
        - heading "Cookie Settings" [level=3] [ref=e87]
        - paragraph [ref=e88]: We use cookies to improve your experience. Essential cookies are always enabled.
        - generic [ref=e89]:
          - generic [ref=e90]:
            - checkbox "Essential" [checked] [disabled] [ref=e91]
            - text: Essential
          - generic [ref=e92]:
            - checkbox "Analytics" [ref=e93]
            - text: Analytics
          - generic [ref=e94]:
            - checkbox "Marketing" [ref=e95]
            - text: Marketing
      - generic [ref=e96]:
        - button "Reject All" [ref=e97]
        - button "Accept Selected" [ref=e98]
        - button "Accept All" [ref=e99]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Homepage', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/');
  6  |   });
  7  | 
  8  |   test('loads successfully with store name', async ({ page }) => {
  9  |     await expect(page.getByRole('link', { name: 'TechGear Pro' })).toBeVisible();
  10 |   });
  11 | 
  12 |   test('has navigation links', async ({ page }) => {
  13 |     await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
  14 |     await expect(page.locator('header nav a[href="/products"]')).toBeVisible();
  15 |   });
  16 | 
  17 |   test('has search and cart buttons', async ({ page }) => {
  18 |     await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeVisible();
  19 |     await expect(page.getByRole('button', { name: 'Cart', exact: true })).toBeVisible();
  20 |   });
  21 | 
  22 |   test('has sign in button when not logged in', async ({ page }) => {
  23 |     await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
  24 |   });
  25 | 
  26 |   test('search opens search bar', async ({ page }) => {
  27 |     await page.getByRole('button', { name: 'Search', exact: true }).click();
> 28 |     await expect(page.locator('input[name="q"]')).toBeVisible();
     |                                                   ^ Error: expect(locator).toBeVisible() failed
  29 |   });
  30 | });
  31 | 
```
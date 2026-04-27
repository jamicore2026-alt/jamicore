# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: merchant\product-list.spec.ts >> Product List >> seeded products are visible
- Location: e2e\specs\merchant\product-list.spec.ts:14:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Premium Silicone Case')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Premium Silicone Case')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - banner [ref=e5]:
      - generic [ref=e7]:
        - link "Store" [ref=e8] [cursor=pointer]:
          - /url: /
          - generic [ref=e9]: Store
        - navigation [ref=e10]:
          - link "Home" [ref=e11] [cursor=pointer]:
            - /url: /
          - link "Products" [ref=e12] [cursor=pointer]:
            - /url: /products
          - link "About" [ref=e13] [cursor=pointer]:
            - /url: /about
        - generic [ref=e14]:
          - button "Search" [ref=e15]:
            - img
          - button "Cart" [ref=e16]:
            - img [ref=e18]
          - link "Sign In" [ref=e22] [cursor=pointer]:
            - /url: /login
            - button "Sign In" [ref=e23]
    - main [ref=e24]:
      - heading "404" [level=1] [ref=e25]
      - paragraph [ref=e26]: Not Found
    - contentinfo [ref=e27]:
      - generic [ref=e28]:
        - generic [ref=e29]:
          - heading "Store" [level=3] [ref=e31]
          - generic [ref=e32]:
            - heading "Quick Links" [level=3] [ref=e33]
            - list [ref=e34]:
              - listitem [ref=e35]:
                - link "Products" [ref=e36] [cursor=pointer]:
                  - /url: /products
              - listitem [ref=e37]:
                - link "About Us" [ref=e38] [cursor=pointer]:
                  - /url: /about
              - listitem [ref=e39]:
                - link "Cart" [ref=e40] [cursor=pointer]:
                  - /url: /cart
          - heading "Connect" [level=3] [ref=e42]
        - generic [ref=e43]:
          - paragraph [ref=e44]: © 2026 Store. All rights reserved.
          - generic [ref=e45]:
            - generic [ref=e46]: Visa
            - generic [ref=e47]: Mastercard
            - generic [ref=e48]: Apple Pay
  - region "Notifications alt+T"
  - dialog "Cookie consent" [ref=e49]:
    - generic [ref=e51]:
      - generic [ref=e52]:
        - heading "Cookie Settings" [level=3] [ref=e53]
        - paragraph [ref=e54]: We use cookies to improve your experience. Essential cookies are always enabled.
        - generic [ref=e55]:
          - generic [ref=e56]:
            - checkbox "Essential" [checked] [disabled] [ref=e57]
            - text: Essential
          - generic [ref=e58]:
            - checkbox "Analytics" [ref=e59]
            - text: Analytics
          - generic [ref=e60]:
            - checkbox "Marketing" [ref=e61]
            - text: Marketing
      - generic [ref=e62]:
        - button "Reject All" [ref=e63]
        - button "Accept Selected" [ref=e64]
        - button "Accept All" [ref=e65]
```

# Test source

```ts
  1  | import { test, expect } from '../../fixtures/auth.fixture.js';
  2  | 
  3  | test.describe('Product List', () => {
  4  |   test.beforeEach(async ({ merchantPage }) => {
  5  |     await merchantPage.goto('/dashboard/products');
  6  |   });
  7  | 
  8  |   test('page loads with product table', async ({ merchantPage }) => {
  9  |     await expect(merchantPage).toHaveTitle(/Products/);
  10 |     await expect(merchantPage.locator('text=Manage your product catalog')).toBeVisible();
  11 |     await expect(merchantPage.locator('text=Add Product')).toBeVisible();
  12 |   });
  13 | 
  14 |   test('seeded products are visible', async ({ merchantPage }) => {
> 15 |     await expect(merchantPage.locator('text=Premium Silicone Case')).toBeVisible();
     |                                                                      ^ Error: expect(locator).toBeVisible() failed
  16 |     await expect(merchantPage.locator('text=Noise Cancelling Headphones')).toBeVisible();
  17 |   });
  18 | 
  19 |   test('search filters products', async ({ merchantPage }) => {
  20 |     await merchantPage.fill('input[placeholder="Search products..."]', 'Case');
  21 |     await merchantPage.getByRole('button', { name: 'Search' }).click();
  22 |     await expect(merchantPage.locator('text=Premium Silicone Case')).toBeVisible();
  23 |   });
  24 | 
  25 |   test('clicking add product navigates to form', async ({ merchantPage }) => {
  26 |     await merchantPage.getByRole('link', { name: 'Add Product' }).click();
  27 |     await merchantPage.waitForURL(/\/dashboard\/products\/new/);
  28 |     await expect(merchantPage).toHaveURL(/\/dashboard\/products\/new/);
  29 |   });
  30 | });
  31 | 
```
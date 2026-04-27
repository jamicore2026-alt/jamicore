# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: merchant\product-edit.spec.ts >> Edit Product >> can update product title
- Location: e2e\specs\merchant\product-edit.spec.ts:19:3

# Error details

```
TimeoutError: locator.click: Timeout 5000ms exceeded.
Call log:
  - waiting for locator('a[title="Edit"]').first()

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
  3  | test.describe('Edit Product', () => {
  4  |   test.beforeEach(async ({ merchantPage }) => {
  5  |     await merchantPage.goto('/dashboard/products');
  6  |     // Click edit on first product
> 7  |     await merchantPage.locator('a[title="Edit"]').first().click();
     |                                                           ^ TimeoutError: locator.click: Timeout 5000ms exceeded.
  8  |     await merchantPage.waitForURL(/\/dashboard\/products\//);
  9  |   });
  10 | 
  11 |   test('page loads with product data', async ({ merchantPage }) => {
  12 |     await expect(merchantPage).toHaveTitle(/Edit Product/);
  13 |     await expect(merchantPage.locator('text=Edit Product')).toBeVisible();
  14 |     // Title input should have value
  15 |     const titleValue = await merchantPage.inputValue('input#titleEn');
  16 |     expect(titleValue.length).toBeGreaterThan(0);
  17 |   });
  18 | 
  19 |   test('can update product title', async ({ merchantPage }) => {
  20 |     const newTitle = `Updated ${Date.now()}`;
  21 |     await merchantPage.fill('input#titleEn', newTitle);
  22 |     await merchantPage.getByRole('button', { name: 'Save Changes' }).click();
  23 |     await expect(merchantPage.locator('text=Product updated')).toBeVisible();
  24 |   });
  25 | 
  26 |   test('can toggle publish status', async ({ merchantPage }) => {
  27 |     // Go back to list and toggle publish
  28 |     await merchantPage.goto('/dashboard/products');
  29 |     const publishButton = merchantPage.locator('button[title="Unpublish"]').or(merchantPage.locator('button[title="Publish"]')).first();
  30 |     await publishButton.click();
  31 |     await merchantPage.waitForTimeout(500);
  32 |     // Status should have changed
  33 |     await expect(merchantPage.locator('text=Published').or(merchantPage.locator('text=Draft'))).toBeVisible();
  34 |   });
  35 | });
  36 | 
```
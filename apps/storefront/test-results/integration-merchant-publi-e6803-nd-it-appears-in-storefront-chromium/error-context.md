# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: integration\merchant-publish-to-storefront.spec.ts >> Cross-App: Merchant Publish to Storefront >> merchant adds product and it appears in storefront
- Location: e2e\specs\integration\merchant-publish-to-storefront.spec.ts:4:3

# Error details

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/dashboard" until "load"
  navigated to "http://localhost:5174/login"
  navigated to "http://localhost:5174/login"
============================================================
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
      - heading "500" [level=1] [ref=e25]
      - paragraph [ref=e26]: Internal Error
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
  3  | test.describe('Cross-App: Merchant Publish to Storefront', () => {
  4  |   test('merchant adds product and it appears in storefront', async ({ browser }) => {
  5  |     // Step 1: Merchant creates a product in dashboard
  6  |     const merchantContext = await browser.newContext({ baseURL: 'http://localhost:5174' });
  7  |     const merchantPage = await merchantContext.newPage();
  8  | 
  9  |     // Login as merchant
  10 |     await merchantPage.goto('/login');
  11 |     await merchantPage.fill('input#email', 'owner@techgear.com');
  12 |     await merchantPage.fill('input#password', 'Merchant1234');
  13 |     await merchantPage.click('button[type="submit"]');
> 14 |     await merchantPage.waitForURL('**/dashboard');
     |                        ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  15 | 
  16 |     // Create product
  17 |     await merchantPage.goto('/dashboard/products/new');
  18 |     const uniqueName = `Cross-App Product ${Date.now()}`;
  19 |     await merchantPage.fill('input#titleEn', uniqueName);
  20 |     await merchantPage.fill('input#salePrice', '199.99');
  21 |     await merchantPage.fill('input#quantity', '10');
  22 |     await merchantPage.click('text=Select a category');
  23 |     await merchantPage.locator('[role="option"]').first().click();
  24 |     await merchantPage.getByRole('button', { name: 'Create Product' }).click();
  25 |     await merchantPage.waitForURL(/\/dashboard\/products\//);
  26 | 
  27 |     await merchantContext.close();
  28 | 
  29 |     // Step 2: Customer sees product in storefront
  30 |     const customerContext = await browser.newContext({ baseURL: 'http://techgear.localhost:5173' });
  31 |     const customerPage = await customerContext.newPage();
  32 | 
  33 |     await customerPage.goto('/products');
  34 |     await expect(customerPage.locator(`text=${uniqueName}`).first()).toBeVisible();
  35 | 
  36 |     await customerContext.close();
  37 |   });
  38 | });
  39 | 
```
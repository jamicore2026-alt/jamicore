# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: merchant\orders.spec.ts >> Orders Management >> page loads with orders table
- Location: e2e\specs\merchant\orders.spec.ts:8:3

# Error details

```
Error: expect(page).toHaveTitle(expected) failed

Expected pattern: /Orders/
Received string:  ""
Timeout: 5000ms

Call log:
  - Expect "toHaveTitle" with timeout 5000ms
    9 × unexpected value ""

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
  3  | test.describe('Orders Management', () => {
  4  |   test.beforeEach(async ({ merchantPage }) => {
  5  |     await merchantPage.goto('/dashboard/orders');
  6  |   });
  7  | 
  8  |   test('page loads with orders table', async ({ merchantPage }) => {
> 9  |     await expect(merchantPage).toHaveTitle(/Orders/);
     |                                ^ Error: expect(page).toHaveTitle(expected) failed
  10 |     await expect(merchantPage.locator('text=Manage and fulfill customer orders')).toBeVisible();
  11 |     // Seeded orders should be visible
  12 |     await expect(merchantPage.locator('text=#ORD-001')).toBeVisible();
  13 |   });
  14 | 
  15 |   test('can filter by status', async ({ merchantPage }) => {
  16 |     await merchantPage.getByRole('button', { name: 'Delivered' }).click();
  17 |     await expect(merchantPage.locator('text=delivered').first()).toBeVisible();
  18 |   });
  19 | 
  20 |   test('clicking order navigates to detail', async ({ merchantPage }) => {
  21 |     await merchantPage.locator('text=#ORD-001').first().click();
  22 |     await merchantPage.waitForURL(/\/dashboard\/orders\//);
  23 |     await expect(merchantPage).toHaveURL(/\/dashboard\/orders\//);
  24 |   });
  25 | });
  26 | 
```
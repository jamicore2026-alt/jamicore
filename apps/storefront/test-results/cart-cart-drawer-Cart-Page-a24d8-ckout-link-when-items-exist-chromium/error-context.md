# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cart\cart-drawer.spec.ts >> Cart Page >> has proceed to checkout link when items exist
- Location: e2e\specs\cart\cart-drawer.spec.ts:51:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('link', { name: 'Proceed to Checkout' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('link', { name: 'Proceed to Checkout' })

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
          - button "Search" [ref=e15]:
            - img
          - button "Cart" [ref=e16]:
            - generic [ref=e17]:
              - img [ref=e18]
              - generic [ref=e22]: "1"
          - link "Sign In" [ref=e23] [cursor=pointer]:
            - /url: /login
            - button "Sign In" [ref=e24]
    - main [ref=e25]:
      - generic [ref=e26]:
        - heading "Shopping Cart" [level=1] [ref=e27]
        - generic [ref=e28]:
          - img [ref=e29]
          - paragraph [ref=e33]: Your cart is empty
          - link "Continue Shopping" [ref=e34] [cursor=pointer]:
            - /url: /products
            - button "Continue Shopping" [ref=e35]
    - contentinfo [ref=e36]:
      - generic [ref=e37]:
        - generic [ref=e38]:
          - heading "TechGear Pro" [level=3] [ref=e40]
          - generic [ref=e41]:
            - heading "Quick Links" [level=3] [ref=e42]
            - list [ref=e43]:
              - listitem [ref=e44]:
                - link "Products" [ref=e45] [cursor=pointer]:
                  - /url: /products
              - listitem [ref=e46]:
                - link "About Us" [ref=e47] [cursor=pointer]:
                  - /url: /about
              - listitem [ref=e48]:
                - link "Cart" [ref=e49] [cursor=pointer]:
                  - /url: /cart
          - heading "Connect" [level=3] [ref=e51]
        - generic [ref=e52]:
          - paragraph [ref=e53]: © 2026 TechGear Pro. All rights reserved.
          - generic [ref=e54]:
            - generic [ref=e55]: Visa
            - generic [ref=e56]: Mastercard
            - generic [ref=e57]: Apple Pay
  - region "Notifications alt+T"
  - dialog "Cookie consent" [ref=e58]:
    - generic [ref=e60]:
      - generic [ref=e61]:
        - heading "Cookie Settings" [level=3] [ref=e62]
        - paragraph [ref=e63]: We use cookies to improve your experience. Essential cookies are always enabled.
        - generic [ref=e64]:
          - generic [ref=e65]:
            - checkbox "Essential" [checked] [disabled] [ref=e66]
            - text: Essential
          - generic [ref=e67]:
            - checkbox "Analytics" [ref=e68]
            - text: Analytics
          - generic [ref=e69]:
            - checkbox "Marketing" [ref=e70]
            - text: Marketing
      - generic [ref=e71]:
        - button "Reject All" [ref=e72]
        - button "Accept Selected" [ref=e73]
        - button "Accept All" [ref=e74]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Cart Drawer', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/');
  6  |     // Allow Svelte hydration to complete before interacting
  7  |     await page.waitForTimeout(2000);
  8  |   });
  9  | 
  10 |   test('opens from header cart button', async ({ page }) => {
  11 |     await page.getByRole('button', { name: 'Cart', exact: true }).click();
  12 |     await expect(page.getByRole('dialog', { name: 'Shopping cart' })).toBeVisible();
  13 |     await expect(page.locator('text=Your cart is empty')).toBeVisible();
  14 |   });
  15 | 
  16 |   test('shows empty state when cart is empty', async ({ page }) => {
  17 |     await page.getByRole('button', { name: 'Cart', exact: true }).click();
  18 |     await expect(page.locator('text=Your cart is empty')).toBeVisible();
  19 |     await expect(page.locator('text=View Cart')).not.toBeVisible();
  20 |     await expect(page.locator('text=Checkout')).not.toBeVisible();
  21 |   });
  22 | 
  23 |   test('adds item to cart and shows in drawer', async ({ page }) => {
  24 |     // Go to first product and add to cart
  25 |     await page.goto('/products');
  26 |     await page.waitForTimeout(2000);
  27 |     await page.locator('[role="listitem"]').first().locator('a').click();
  28 |     await page.waitForURL(/\/products\//);
  29 |     await page.getByRole('button', { name: /Add to Cart/i }).first().click();
  30 | 
  31 |     // Cart drawer opens automatically on add; ensure it's visible
  32 |     await expect(page.getByRole('dialog', { name: 'Shopping cart' })).toBeVisible();
  33 |     await expect(page.locator('text=Cart (1)')).toBeVisible();
  34 |   });
  35 | 
  36 |   test('closes drawer with close button', async ({ page }) => {
  37 |     await page.getByRole('button', { name: 'Cart', exact: true }).click();
  38 |     await expect(page.getByRole('dialog', { name: 'Shopping cart' })).toBeVisible();
  39 |     await page.getByRole('button', { name: 'Close cart' }).click();
  40 |     await expect(page.getByRole('dialog', { name: 'Shopping cart' })).not.toBeVisible();
  41 |   });
  42 | });
  43 | 
  44 | test.describe('Cart Page', () => {
  45 |   test('empty cart shows continue shopping button', async ({ page }) => {
  46 |     await page.goto('/cart');
  47 |     await expect(page.locator('text=Your cart is empty')).toBeVisible();
  48 |     await expect(page.getByRole('link', { name: 'Continue Shopping' })).toBeVisible();
  49 |   });
  50 | 
  51 |   test('has proceed to checkout link when items exist', async ({ page }) => {
  52 |     // Add item first
  53 |     await page.goto('/products');
  54 |     await page.waitForTimeout(2000);
  55 |     await page.locator('[role="listitem"]').first().locator('a').click();
  56 |     await page.waitForURL(/\/products\//);
  57 |     await page.getByRole('button', { name: /Add to Cart/i }).first().click();
  58 | 
  59 |     await page.goto('/cart');
> 60 |     await expect(page.getByRole('link', { name: 'Proceed to Checkout' })).toBeVisible();
     |                                                                           ^ Error: expect(locator).toBeVisible() failed
  61 |     await expect(page.getByRole('link', { name: 'Continue Shopping' })).toBeVisible();
  62 |   });
  63 | });
  64 | 
```
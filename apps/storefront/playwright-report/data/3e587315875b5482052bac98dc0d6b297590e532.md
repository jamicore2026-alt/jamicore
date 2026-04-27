# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cart\cart-drawer.spec.ts >> Cart Drawer >> shows empty state when cart is empty
- Location: e2e\specs\cart\cart-drawer.spec.ts:16:3

# Error details

```
Error: expect(locator).not.toBeVisible() failed

Locator:  locator('text=Checkout')
Expected: not visible
Received: visible
Timeout:  5000ms

Call log:
  - Expect "not toBeVisible" with timeout 5000ms
  - waiting for locator('text=Checkout')
    9 × locator resolved to <p class="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-0.5">SSL encrypted checkout</p>
      - unexpected value "visible"

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
          - button "Cart" [active] [ref=e16]:
            - img [ref=e18]
          - link "Sign In" [ref=e22] [cursor=pointer]:
            - /url: /login
            - button "Sign In" [ref=e23]
    - dialog "Shopping cart" [ref=e24]:
      - generic [ref=e25]:
        - heading "Cart (0)" [level=2] [ref=e26]
        - button "Close cart" [ref=e27]:
          - img
      - generic [ref=e29]:
        - img [ref=e30]
        - paragraph [ref=e31]: Your cart is empty
        - paragraph [ref=e32]: Add some items to get started
        - button "Continue Shopping" [ref=e33]
    - main [ref=e34]:
      - generic [ref=e37]:
        - generic [ref=e38]:
          - img [ref=e40]
          - generic [ref=e45]:
            - paragraph [ref=e46]: Free Shipping
            - paragraph [ref=e47]: On orders over $50
        - generic [ref=e48]:
          - img [ref=e50]
          - generic [ref=e53]:
            - paragraph [ref=e54]: Easy Returns
            - paragraph [ref=e55]: 30-day return policy
        - generic [ref=e56]:
          - img [ref=e58]
          - generic [ref=e60]:
            - paragraph [ref=e61]: Secure Payment
            - paragraph [ref=e62]: SSL encrypted checkout
        - generic [ref=e63]:
          - img [ref=e65]
          - generic [ref=e68]:
            - paragraph [ref=e69]: 24/7 Support
            - paragraph [ref=e70]: Always here to help
    - contentinfo [ref=e71]:
      - generic [ref=e72]:
        - generic [ref=e73]:
          - heading "TechGear Pro" [level=3] [ref=e75]
          - generic [ref=e76]:
            - heading "Quick Links" [level=3] [ref=e77]
            - list [ref=e78]:
              - listitem [ref=e79]:
                - link "Products" [ref=e80] [cursor=pointer]:
                  - /url: /products
              - listitem [ref=e81]:
                - link "About Us" [ref=e82] [cursor=pointer]:
                  - /url: /about
              - listitem [ref=e83]:
                - link "Cart" [ref=e84] [cursor=pointer]:
                  - /url: /cart
          - heading "Connect" [level=3] [ref=e86]
        - generic [ref=e87]:
          - paragraph [ref=e88]: © 2026 TechGear Pro. All rights reserved.
          - generic [ref=e89]:
            - generic [ref=e90]: Visa
            - generic [ref=e91]: Mastercard
            - generic [ref=e92]: Apple Pay
  - region "Notifications alt+T"
  - dialog "Cookie consent" [ref=e93]:
    - generic [ref=e95]:
      - generic [ref=e96]:
        - heading "Cookie Settings" [level=3] [ref=e97]
        - paragraph [ref=e98]: We use cookies to improve your experience. Essential cookies are always enabled.
        - generic [ref=e99]:
          - generic [ref=e100]:
            - checkbox "Essential" [checked] [disabled] [ref=e101]
            - text: Essential
          - generic [ref=e102]:
            - checkbox "Analytics" [ref=e103]
            - text: Analytics
          - generic [ref=e104]:
            - checkbox "Marketing" [ref=e105]
            - text: Marketing
      - generic [ref=e106]:
        - button "Reject All" [ref=e107]
        - button "Accept Selected" [ref=e108]
        - button "Accept All" [ref=e109]
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
> 20 |     await expect(page.locator('text=Checkout')).not.toBeVisible();
     |                                                     ^ Error: expect(locator).not.toBeVisible() failed
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
  60 |     await expect(page.getByRole('link', { name: 'Proceed to Checkout' })).toBeVisible();
  61 |     await expect(page.getByRole('link', { name: 'Continue Shopping' })).toBeVisible();
  62 |   });
  63 | });
  64 | 
```
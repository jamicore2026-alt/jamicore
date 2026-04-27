# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cart\cart-drawer.spec.ts >> Cart Drawer >> adds item to cart and shows in drawer
- Location: e2e\specs\cart\cart-drawer.spec.ts:23:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog', { name: 'Shopping cart' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Shopping cart' })

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
        - generic [ref=e27]:
          - generic [ref=e30]: No image
          - generic [ref=e31]:
            - generic [ref=e33]:
              - link "Phones & Accessories" [ref=e34] [cursor=pointer]:
                - /url: /categories/ad3438ff-b1e7-42dc-8bc2-410e88ef40fd
              - heading "Fast Wireless Charger" [level=1] [ref=e35]
            - generic [ref=e37]: $49.99
            - generic [ref=e39]:
              - img [ref=e40]
              - text: 80 in stock
            - generic [ref=e41]: 15W fast wireless charging pad
            - generic [ref=e43]:
              - generic [ref=e44]:
                - button "Decrease quantity" [ref=e45]:
                  - img [ref=e46]
                - generic [ref=e47]: "1"
                - button "Increase quantity" [ref=e48]:
                  - img [ref=e49]
              - button "Add to Cart" [ref=e50]:
                - img
                - text: Add to Cart
        - generic [ref=e52]:
          - generic [ref=e54]:
            - heading "Reviews" [level=2] [ref=e55]
            - generic [ref=e56]:
              - generic [ref=e57]:
                - img [ref=e58]
                - img [ref=e59]
                - img [ref=e60]
                - img [ref=e61]
                - img [ref=e62]
              - generic [ref=e63]: 0.0 out of 5 (0 reviews)
          - paragraph [ref=e64]: No reviews yet. Be the first to review!
        - generic [ref=e65]:
          - heading "You May Also Like" [level=2] [ref=e66]
          - list "Product list" [ref=e67]:
            - listitem [ref=e68]:
              - link "View Premium Silicone Case" [ref=e69] [cursor=pointer]:
                - /url: /products/412cdb91-e975-4e6a-845b-8e3e115f11e7
                - generic [ref=e72]: No image
                - generic [ref=e73]:
                  - paragraph [ref=e74]: Phones & Accessories
                  - heading "Premium Silicone Case" [level=3] [ref=e75]
                  - generic [ref=e77]: $29.99
            - listitem [ref=e78]:
              - link "View USB-C Cable Bundle" [ref=e79] [cursor=pointer]:
                - /url: /products/59b9240b-220e-44fb-a5d3-07410c9d8bb3
                - generic [ref=e82]: No image
                - generic [ref=e83]:
                  - paragraph [ref=e84]: Phones & Accessories
                  - heading "USB-C Cable Bundle" [level=3] [ref=e85]
                  - generic [ref=e87]: $19.99
    - contentinfo [ref=e88]:
      - generic [ref=e89]:
        - generic [ref=e90]:
          - heading "TechGear Pro" [level=3] [ref=e92]
          - generic [ref=e93]:
            - heading "Quick Links" [level=3] [ref=e94]
            - list [ref=e95]:
              - listitem [ref=e96]:
                - link "Products" [ref=e97] [cursor=pointer]:
                  - /url: /products
              - listitem [ref=e98]:
                - link "About Us" [ref=e99] [cursor=pointer]:
                  - /url: /about
              - listitem [ref=e100]:
                - link "Cart" [ref=e101] [cursor=pointer]:
                  - /url: /cart
          - heading "Connect" [level=3] [ref=e103]
        - generic [ref=e104]:
          - paragraph [ref=e105]: © 2026 TechGear Pro. All rights reserved.
          - generic [ref=e106]:
            - generic [ref=e107]: Visa
            - generic [ref=e108]: Mastercard
            - generic [ref=e109]: Apple Pay
  - region "Notifications alt+T"
  - dialog "Cookie consent" [ref=e110]:
    - generic [ref=e112]:
      - generic [ref=e113]:
        - heading "Cookie Settings" [level=3] [ref=e114]
        - paragraph [ref=e115]: We use cookies to improve your experience. Essential cookies are always enabled.
        - generic [ref=e116]:
          - generic [ref=e117]:
            - checkbox "Essential" [checked] [disabled] [ref=e118]
            - text: Essential
          - generic [ref=e119]:
            - checkbox "Analytics" [ref=e120]
            - text: Analytics
          - generic [ref=e121]:
            - checkbox "Marketing" [ref=e122]
            - text: Marketing
      - generic [ref=e123]:
        - button "Reject All" [ref=e124]
        - button "Accept Selected" [ref=e125]
        - button "Accept All" [ref=e126]
  - generic [ref=e127]: Fast Wireless Charger | TechGear Pro
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
> 32 |     await expect(page.getByRole('dialog', { name: 'Shopping cart' })).toBeVisible();
     |                                                                       ^ Error: expect(locator).toBeVisible() failed
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
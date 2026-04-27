# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browsing\product-detail.spec.ts >> Product Detail >> can increase and decrease quantity
- Location: e2e\specs\browsing\product-detail.spec.ts:30:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('2', { exact: true }).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('2', { exact: true }).first()

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
            - img [ref=e18]
          - link "Sign In" [ref=e22] [cursor=pointer]:
            - /url: /login
            - button "Sign In" [ref=e23]
    - main [ref=e24]:
      - generic [ref=e25]:
        - generic [ref=e26]:
          - generic [ref=e29]: No image
          - generic [ref=e30]:
            - generic [ref=e32]:
              - link "Phones & Accessories" [ref=e33] [cursor=pointer]:
                - /url: /categories/ad3438ff-b1e7-42dc-8bc2-410e88ef40fd
              - heading "Fast Wireless Charger" [level=1] [ref=e34]
            - generic [ref=e36]: $49.99
            - generic [ref=e38]:
              - img [ref=e39]
              - text: 80 in stock
            - generic [ref=e43]: 15W fast wireless charging pad
            - generic [ref=e45]:
              - generic [ref=e46]:
                - button "Decrease quantity" [ref=e47]:
                  - img [ref=e48]
                - generic [ref=e49]: "1"
                - button "Increase quantity" [active] [ref=e50]:
                  - img [ref=e51]
              - button "Add to Cart" [ref=e52]:
                - img
                - text: Add to Cart
        - generic [ref=e54]:
          - generic [ref=e56]:
            - heading "Reviews" [level=2] [ref=e57]
            - generic [ref=e58]:
              - generic [ref=e59]:
                - img [ref=e60]
                - img [ref=e62]
                - img [ref=e64]
                - img [ref=e66]
                - img [ref=e68]
              - generic [ref=e70]: 0.0 out of 5 (0 reviews)
          - paragraph [ref=e71]: No reviews yet. Be the first to review!
        - generic [ref=e72]:
          - heading "You May Also Like" [level=2] [ref=e73]
          - list "Product list" [ref=e74]:
            - listitem [ref=e75]:
              - link "View Premium Silicone Case" [ref=e76] [cursor=pointer]:
                - /url: /products/412cdb91-e975-4e6a-845b-8e3e115f11e7
                - generic [ref=e79]: No image
                - generic [ref=e80]:
                  - paragraph [ref=e81]: Phones & Accessories
                  - heading "Premium Silicone Case" [level=3] [ref=e82]
                  - generic [ref=e84]: $29.99
            - listitem [ref=e85]:
              - link "View USB-C Cable Bundle" [ref=e86] [cursor=pointer]:
                - /url: /products/59b9240b-220e-44fb-a5d3-07410c9d8bb3
                - generic [ref=e89]: No image
                - generic [ref=e90]:
                  - paragraph [ref=e91]: Phones & Accessories
                  - heading "USB-C Cable Bundle" [level=3] [ref=e92]
                  - generic [ref=e94]: $19.99
    - contentinfo [ref=e95]:
      - generic [ref=e96]:
        - generic [ref=e97]:
          - heading "TechGear Pro" [level=3] [ref=e99]
          - generic [ref=e100]:
            - heading "Quick Links" [level=3] [ref=e101]
            - list [ref=e102]:
              - listitem [ref=e103]:
                - link "Products" [ref=e104] [cursor=pointer]:
                  - /url: /products
              - listitem [ref=e105]:
                - link "About Us" [ref=e106] [cursor=pointer]:
                  - /url: /about
              - listitem [ref=e107]:
                - link "Cart" [ref=e108] [cursor=pointer]:
                  - /url: /cart
          - heading "Connect" [level=3] [ref=e110]
        - generic [ref=e111]:
          - paragraph [ref=e112]: © 2026 TechGear Pro. All rights reserved.
          - generic [ref=e113]:
            - generic [ref=e114]: Visa
            - generic [ref=e115]: Mastercard
            - generic [ref=e116]: Apple Pay
  - region "Notifications alt+T"
  - dialog "Cookie consent" [ref=e117]:
    - generic [ref=e119]:
      - generic [ref=e120]:
        - heading "Cookie Settings" [level=3] [ref=e121]
        - paragraph [ref=e122]: We use cookies to improve your experience. Essential cookies are always enabled.
        - generic [ref=e123]:
          - generic [ref=e124]:
            - checkbox "Essential" [checked] [disabled] [ref=e125]
            - text: Essential
          - generic [ref=e126]:
            - checkbox "Analytics" [ref=e127]
            - text: Analytics
          - generic [ref=e128]:
            - checkbox "Marketing" [ref=e129]
            - text: Marketing
      - generic [ref=e130]:
        - button "Reject All" [ref=e131]
        - button "Accept Selected" [ref=e132]
        - button "Accept All" [ref=e133]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Product Detail', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/products');
  6  |     // Click first product
  7  |     await page.locator('[role="listitem"]').first().locator('a').click();
  8  |     await page.waitForURL(/\/products\//);
  9  |   });
  10 | 
  11 |   test('page loads with product title', async ({ page }) => {
  12 |     await expect(page.locator('h1')).toBeVisible();
  13 |     const title = await page.locator('h1').textContent();
  14 |     expect(title?.length).toBeGreaterThan(0);
  15 |   });
  16 | 
  17 |   test('price is visible', async ({ page }) => {
  18 |     const mainPrice = page.locator('main').locator('text=/\\$\\d+\\.\\d{2}/').first();
  19 |     await expect(mainPrice).toBeVisible();
  20 |   });
  21 | 
  22 |   test('stock status is visible', async ({ page }) => {
  23 |     await expect(page.locator('text=/\\d+ in stock|Out of stock/')).toBeVisible();
  24 |   });
  25 | 
  26 |   test('Add to Cart button is visible', async ({ page }) => {
  27 |     await expect(page.getByRole('button', { name: /Add to Cart/i })).toBeVisible();
  28 |   });
  29 | 
  30 |   test('can increase and decrease quantity', async ({ page }) => {
  31 |     const decrease = page.getByRole('button', { name: 'Decrease quantity' }).first();
  32 |     const increase = page.getByRole('button', { name: 'Increase quantity' }).first();
  33 |     const quantity = page.getByText('1', { exact: true }).first();
  34 | 
  35 |     await expect(quantity).toBeVisible();
  36 |     await increase.click();
  37 |     // After clicking increase, quantity should be 2
> 38 |     await expect(page.getByText('2', { exact: true }).first()).toBeVisible();
     |                                                                ^ Error: expect(locator).toBeVisible() failed
  39 |     await decrease.click();
  40 |     await expect(quantity).toBeVisible();
  41 |   });
  42 | 
  43 |   test('adds product to cart', async ({ page }) => {
  44 |     const addButton = page.getByRole('button', { name: /Add to Cart/i }).first();
  45 |     await addButton.click();
  46 |     // Cart drawer should open automatically and show item count
  47 |     await expect(page.getByRole('dialog', { name: 'Shopping cart' })).toBeVisible();
  48 |   });
  49 | 
  50 |   test('has reviews section', async ({ page }) => {
  51 |     const reviewsHeading = page.locator('main').getByRole('heading', { name: 'Reviews' });
  52 |     await expect(reviewsHeading).toBeVisible();
  53 |   });
  54 | });
  55 | 
```
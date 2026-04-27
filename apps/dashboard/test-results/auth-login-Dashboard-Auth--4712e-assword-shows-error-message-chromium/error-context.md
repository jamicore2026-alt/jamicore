# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth\login.spec.ts >> Dashboard Auth >> invalid password shows error message
- Location: e2e\specs\auth\login.spec.ts:32:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Login failed')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Login failed')

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
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Dashboard Auth', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/login');
  6  |   });
  7  | 
  8  |   test('page has correct title and form elements', async ({ page }) => {
  9  |     await expect(page).toHaveTitle(/Sign In|Login/i);
  10 |     await expect(page.locator('input#email')).toBeVisible();
  11 |     await expect(page.locator('input#password')).toBeVisible();
  12 |     await expect(page.locator('button[type="submit"]')).toBeVisible();
  13 |     await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
  14 |   });
  15 | 
  16 |   test('valid merchant login redirects to dashboard', async ({ page }) => {
  17 |     await page.fill('input#email', 'owner@techgear.com');
  18 |     await page.fill('input#password', 'Merchant1234');
  19 |     await page.click('button[type="submit"]');
  20 |     await page.waitForURL('**/dashboard');
  21 |     await expect(page).toHaveURL(/\/dashboard/);
  22 |   });
  23 | 
  24 |   test('valid staff login redirects to dashboard', async ({ page }) => {
  25 |     await page.fill('input#email', 'staff@techgear.com');
  26 |     await page.fill('input#password', 'Merchant1234');
  27 |     await page.click('button[type="submit"]');
  28 |     await page.waitForURL('**/dashboard');
  29 |     await expect(page).toHaveURL(/\/dashboard/);
  30 |   });
  31 | 
  32 |   test('invalid password shows error message', async ({ page }) => {
  33 |     await page.fill('input#email', 'owner@techgear.com');
  34 |     await page.fill('input#password', 'WrongPassword123');
  35 |     await page.click('button[type="submit"]');
> 36 |     await expect(page.locator('text=Login failed')).toBeVisible();
     |                                                     ^ Error: expect(locator).toBeVisible() failed
  37 |   });
  38 | 
  39 |   test('empty form shows validation errors', async ({ page }) => {
  40 |     await page.click('button[type="submit"]');
  41 |     await expect(page.locator('input#email[aria-invalid="true"]')).toBeVisible();
  42 |     await expect(page.locator('input#password[aria-invalid="true"]')).toBeVisible();
  43 |   });
  44 | });
  45 | 
  46 | test.describe('Admin Login', () => {
  47 |   test.beforeEach(async ({ page }) => {
  48 |     await page.goto('/admin-login');
  49 |   });
  50 | 
  51 |   test('valid super admin login redirects to admin dashboard', async ({ page }) => {
  52 |     await page.fill('input#email', 'admin@saasplatform.com');
  53 |     await page.fill('input#password', 'Admin1234');
  54 |     await page.click('button[type="submit"]');
  55 |     await page.waitForURL('**/admin');
  56 |     await expect(page).toHaveURL(/\/admin/);
  57 |   });
  58 | 
  59 |   test('invalid admin credentials show error', async ({ page }) => {
  60 |     await page.fill('input#email', 'admin@saasplatform.com');
  61 |     await page.fill('input#password', 'WrongPassword');
  62 |     await page.click('button[type="submit"]');
  63 |     await expect(page.locator('text=Login failed')).toBeVisible();
  64 |   });
  65 | });
  66 | 
```
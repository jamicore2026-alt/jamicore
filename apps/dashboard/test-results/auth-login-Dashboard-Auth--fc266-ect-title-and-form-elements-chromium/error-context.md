# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth\login.spec.ts >> Dashboard Auth >> page has correct title and form elements
- Location: e2e\specs\auth\login.spec.ts:8:3

# Error details

```
Error: expect(page).toHaveTitle(expected) failed

Expected pattern: /Sign In|Login/i
Received string:  ""
Timeout: 5000ms

Call log:
  - Expect "toHaveTitle" with timeout 5000ms
    8 × unexpected value ""

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
      - generic [ref=e27]:
        - generic [ref=e28]:
          - generic [ref=e29]: Sign In
          - paragraph [ref=e30]: Enter your credentials to access your account
        - generic [ref=e32]:
          - generic [ref=e33]:
            - text: Email
            - textbox "Email" [ref=e34]:
              - /placeholder: you@example.com
          - generic [ref=e35]:
            - text: Password
            - textbox "Password" [ref=e36]:
              - /placeholder: Enter your password
          - button "Sign In" [ref=e37]
        - generic [ref=e38]:
          - paragraph [ref=e39]:
            - text: Don't have an account?
            - link "Sign up" [ref=e40] [cursor=pointer]:
              - /url: /register
          - link "Forgot your password?" [ref=e41] [cursor=pointer]:
            - /url: /forgot-password
    - contentinfo [ref=e42]:
      - generic [ref=e43]:
        - generic [ref=e44]:
          - heading "Store" [level=3] [ref=e46]
          - generic [ref=e47]:
            - heading "Quick Links" [level=3] [ref=e48]
            - list [ref=e49]:
              - listitem [ref=e50]:
                - link "Products" [ref=e51] [cursor=pointer]:
                  - /url: /products
              - listitem [ref=e52]:
                - link "About Us" [ref=e53] [cursor=pointer]:
                  - /url: /about
              - listitem [ref=e54]:
                - link "Cart" [ref=e55] [cursor=pointer]:
                  - /url: /cart
          - heading "Connect" [level=3] [ref=e57]
        - generic [ref=e58]:
          - paragraph [ref=e59]: © 2026 Store. All rights reserved.
          - generic [ref=e60]:
            - generic [ref=e61]: Visa
            - generic [ref=e62]: Mastercard
            - generic [ref=e63]: Apple Pay
  - region "Notifications alt+T"
  - dialog "Cookie consent" [ref=e64]:
    - generic [ref=e66]:
      - generic [ref=e67]:
        - heading "Cookie Settings" [level=3] [ref=e68]
        - paragraph [ref=e69]: We use cookies to improve your experience. Essential cookies are always enabled.
        - generic [ref=e70]:
          - generic [ref=e71]:
            - checkbox "Essential" [checked] [disabled] [ref=e72]
            - text: Essential
          - generic [ref=e73]:
            - checkbox "Analytics" [ref=e74]
            - text: Analytics
          - generic [ref=e75]:
            - checkbox "Marketing" [ref=e76]
            - text: Marketing
      - generic [ref=e77]:
        - button "Reject All" [ref=e78]
        - button "Accept Selected" [ref=e79]
        - button "Accept All" [ref=e80]
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
> 9  |     await expect(page).toHaveTitle(/Sign In|Login/i);
     |                        ^ Error: expect(page).toHaveTitle(expected) failed
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
  36 |     await expect(page.locator('text=Login failed')).toBeVisible();
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
# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth\register.spec.ts >> Storefront Registration >> page has correct title and form elements
- Location: e2e\specs\auth\register.spec.ts:8:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('a[href="/login"]').filter({ hasText: /Sign in/i })
Expected: visible
Error: strict mode violation: locator('a[href="/login"]').filter({ hasText: /Sign in/i }) resolved to 2 elements:
    1) <a href="/login">…</a> aka getByRole('link', { name: 'Sign In', exact: true })
    2) <a href="/login" class="font-medium text-primary hover:underline">Sign in</a> aka getByRole('link', { name: 'Sign in', exact: true })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('a[href="/login"]').filter({ hasText: /Sign in/i })

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
      - generic [ref=e27]:
        - generic [ref=e28]:
          - generic [ref=e29]: Create Account
          - paragraph [ref=e30]: Enter your details to get started
        - generic [ref=e32]:
          - generic [ref=e33]:
            - generic [ref=e34]:
              - text: First Name
              - textbox "First Name" [ref=e35]:
                - /placeholder: John
            - generic [ref=e36]:
              - text: Last Name
              - textbox "Last Name" [ref=e37]:
                - /placeholder: Doe
          - generic [ref=e38]:
            - text: Email
            - textbox "Email" [ref=e39]:
              - /placeholder: you@example.com
          - generic [ref=e40]:
            - text: Phone
            - textbox "Phone" [ref=e41]:
              - /placeholder: +1 (555) 000-0000
          - generic [ref=e42]:
            - text: Password
            - textbox "Password" [ref=e43]:
              - /placeholder: Create a password
          - button "Create Account" [ref=e44]
        - paragraph [ref=e46]:
          - text: Already have an account?
          - link "Sign in" [ref=e47] [cursor=pointer]:
            - /url: /login
    - contentinfo [ref=e48]:
      - generic [ref=e49]:
        - generic [ref=e50]:
          - heading "TechGear Pro" [level=3] [ref=e52]
          - generic [ref=e53]:
            - heading "Quick Links" [level=3] [ref=e54]
            - list [ref=e55]:
              - listitem [ref=e56]:
                - link "Products" [ref=e57] [cursor=pointer]:
                  - /url: /products
              - listitem [ref=e58]:
                - link "About Us" [ref=e59] [cursor=pointer]:
                  - /url: /about
              - listitem [ref=e60]:
                - link "Cart" [ref=e61] [cursor=pointer]:
                  - /url: /cart
          - heading "Connect" [level=3] [ref=e63]
        - generic [ref=e64]:
          - paragraph [ref=e65]: © 2026 TechGear Pro. All rights reserved.
          - generic [ref=e66]:
            - generic [ref=e67]: Visa
            - generic [ref=e68]: Mastercard
            - generic [ref=e69]: Apple Pay
  - region "Notifications alt+T"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Storefront Registration', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/register');
  6  |   });
  7  | 
  8  |   test('page has correct title and form elements', async ({ page }) => {
  9  |     await expect(page).toHaveTitle(/Sign Up|Register/i);
  10 |     await expect(page.locator('input[name="email"]')).toBeVisible();
  11 |     await expect(page.locator('input[name="password"]')).toBeVisible();
  12 |     await expect(page.locator('button[type="submit"]')).toBeVisible();
> 13 |     await expect(page.locator('a[href="/login"]', { hasText: /Sign in/i })).toBeVisible();
     |                                                                             ^ Error: expect(locator).toBeVisible() failed
  14 |   });
  15 | 
  16 |   test('successful registration redirects to verify email', async ({ page }) => {
  17 |     const uniqueEmail = `test-${Date.now()}@example.com`;
  18 |     await page.fill('input[name="email"]', uniqueEmail);
  19 |     await page.fill('input[name="password"]', 'TestPass123');
  20 |     await page.fill('input[name="firstName"]', 'Test');
  21 |     await page.fill('input[name="lastName"]', 'User');
  22 |     await page.click('button[type="submit"]');
  23 |     await page.waitForURL('/verify-email');
  24 |     await expect(page).toHaveURL(/\/verify-email/);
  25 |   });
  26 | 
  27 |   test('duplicate email shows error', async ({ page }) => {
  28 |     await page.fill('input[name="email"]', 'john@example.com');
  29 |     await page.fill('input[name="password"]', 'TestPass123');
  30 |     await page.click('button[type="submit"]');
  31 |     await expect(page.locator('text=already exists')).toBeVisible();
  32 |   });
  33 | 
  34 |   test('weak password shows validation error', async ({ page }) => {
  35 |     await page.fill('input[name="email"]', 'weak@example.com');
  36 |     await page.fill('input[name="password"]', '123');
  37 |     await page.click('button[type="submit"]');
  38 |     await expect(page.locator('input[name="password"][aria-invalid="true"]')).toBeVisible();
  39 |   });
  40 | });
  41 | 
```
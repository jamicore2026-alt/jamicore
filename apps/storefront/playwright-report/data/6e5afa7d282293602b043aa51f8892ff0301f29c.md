# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: account\profile.spec.ts >> Account Profile >> can update profile
- Location: e2e\specs\account\profile.spec.ts:14:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Profile saved!')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('text=Profile saved!')

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
          - link "Wishlist" [ref=e16] [cursor=pointer]:
            - /url: /account/wishlist
            - button [ref=e17]:
              - img
          - button "Cart" [ref=e18]:
            - img [ref=e20]
          - link "Account" [ref=e24] [cursor=pointer]:
            - /url: /account
            - button "Account" [ref=e25]:
              - img
    - main [ref=e26]:
      - generic [ref=e27]:
        - navigation [ref=e28]:
          - link "Account" [ref=e29] [cursor=pointer]:
            - /url: /account
          - link "Orders" [ref=e30] [cursor=pointer]:
            - /url: /account/orders
          - link "Profile" [ref=e31] [cursor=pointer]:
            - /url: /account/profile
          - link "Addresses" [ref=e32] [cursor=pointer]:
            - /url: /account/addresses
          - link "Wishlist" [ref=e33] [cursor=pointer]:
            - /url: /account/wishlist
          - link "Reviews" [ref=e34] [cursor=pointer]:
            - /url: /account/reviews
          - button "Sign out" [ref=e36]
        - generic [ref=e37]:
          - heading "Profile" [level=1] [ref=e38]
          - generic [ref=e40]:
            - generic [ref=e41]:
              - generic [ref=e42]:
                - generic [ref=e43]: First Name
                - textbox "First Name" [ref=e44]: Johnny
              - generic [ref=e45]:
                - generic [ref=e46]: Last Name
                - textbox "Last Name" [ref=e47]: Updated
            - generic [ref=e48]:
              - generic [ref=e49]: Email
              - paragraph [ref=e50]: john@example.com
            - generic [ref=e51]:
              - generic [ref=e52]: Phone
              - textbox "Phone" [ref=e53]: "+966501234567"
            - generic [ref=e54]:
              - generic [ref=e55]: Marketing Emails
              - switch "Marketing Emails" [checked] [ref=e56]
            - button "Save Profile" [active] [ref=e57]
    - contentinfo [ref=e58]:
      - generic [ref=e59]:
        - generic [ref=e60]:
          - heading "TechGear Pro" [level=3] [ref=e62]
          - generic [ref=e63]:
            - heading "Quick Links" [level=3] [ref=e64]
            - list [ref=e65]:
              - listitem [ref=e66]:
                - link "Products" [ref=e67] [cursor=pointer]:
                  - /url: /products
              - listitem [ref=e68]:
                - link "About Us" [ref=e69] [cursor=pointer]:
                  - /url: /about
              - listitem [ref=e70]:
                - link "Cart" [ref=e71] [cursor=pointer]:
                  - /url: /cart
          - heading "Connect" [level=3] [ref=e73]
        - generic [ref=e74]:
          - paragraph [ref=e75]: © 2026 TechGear Pro. All rights reserved.
          - generic [ref=e76]:
            - generic [ref=e77]: Visa
            - generic [ref=e78]: Mastercard
            - generic [ref=e79]: Apple Pay
  - region "Notifications alt+T"
  - dialog "Cookie consent" [ref=e80]:
    - generic [ref=e82]:
      - generic [ref=e83]:
        - heading "Cookie Settings" [level=3] [ref=e84]
        - paragraph [ref=e85]: We use cookies to improve your experience. Essential cookies are always enabled.
        - generic [ref=e86]:
          - generic [ref=e87]:
            - checkbox "Essential" [checked] [disabled] [ref=e88]
            - text: Essential
          - generic [ref=e89]:
            - checkbox "Analytics" [ref=e90]
            - text: Analytics
          - generic [ref=e91]:
            - checkbox "Marketing" [ref=e92]
            - text: Marketing
      - generic [ref=e93]:
        - button "Reject All" [ref=e94]
        - button "Accept Selected" [ref=e95]
        - button "Accept All" [ref=e96]
```

# Test source

```ts
  1  | import { test, expect } from '../../fixtures/auth.fixture.js';
  2  | 
  3  | test.describe('Account Profile', () => {
  4  |   test.beforeEach(async ({ customerPage }) => {
  5  |     await customerPage.goto('/account/profile');
  6  |   });
  7  | 
  8  |   test('page loads with customer info', async ({ customerPage }) => {
  9  |     await expect(customerPage).toHaveTitle(/Profile/);
  10 |     await expect(customerPage.getByRole('heading', { name: 'Profile' })).toBeVisible();
  11 |     await expect(customerPage.locator('text=john@example.com')).toBeVisible();
  12 |   });
  13 | 
  14 |   test('can update profile', async ({ customerPage }) => {
  15 |     await customerPage.fill('input#firstName', 'Johnny');
  16 |     await customerPage.fill('input#lastName', 'Updated');
  17 |     await customerPage.fill('input#phone', '+966501234567');
  18 |     await customerPage.getByRole('button', { name: 'Save Profile' }).click();
> 19 |     await expect(customerPage.locator('text=Profile saved!')).toBeVisible({ timeout: 10000 });
     |                                                               ^ Error: expect(locator).toBeVisible() failed
  20 |   });
  21 | });
  22 | 
```
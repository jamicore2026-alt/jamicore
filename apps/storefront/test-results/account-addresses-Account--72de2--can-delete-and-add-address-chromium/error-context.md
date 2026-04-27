# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: account\addresses.spec.ts >> Account Addresses >> can delete and add address
- Location: e2e\specs\account\addresses.spec.ts:16:3

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 3
Received:   3
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
          - generic [ref=e38]:
            - heading "Addresses" [level=1] [ref=e39]
            - button "Add Address" [ref=e40]:
              - img
              - text: Add Address
          - generic [ref=e41]:
            - generic [ref=e42]:
              - generic [ref=e43]:
                - paragraph [ref=e45]: John Doe
                - generic [ref=e46]:
                  - button "Set as default" [ref=e47]:
                    - img [ref=e48]
                  - button "Delete address" [active] [ref=e50]:
                    - img [ref=e51]
              - paragraph [ref=e54]:
                - text: 123 King Fahd Road
                - text: Apt 4B
                - text: Riyadh, Riyadh Province 12211
                - text: Saudi Arabia
            - generic [ref=e55]:
              - generic [ref=e56]:
                - paragraph [ref=e58]: John Doe
                - generic [ref=e59]:
                  - button "Set as default" [ref=e60]:
                    - img [ref=e61]
                  - button "Delete address" [ref=e63]:
                    - img [ref=e64]
              - paragraph [ref=e67]:
                - text: 456 Olaya Street
                - text: Riyadh, Riyadh Province 12241
                - text: Saudi Arabia
            - generic [ref=e68]:
              - generic [ref=e69]:
                - paragraph [ref=e71]: John Doe
                - generic [ref=e72]:
                  - button "Set as default" [ref=e73]:
                    - img [ref=e74]
                  - button "Delete address" [ref=e76]:
                    - img [ref=e77]
              - paragraph [ref=e80]:
                - text: 123 Main St
                - text: San Francisco, CA 94102
                - text: US
    - contentinfo [ref=e81]:
      - generic [ref=e82]:
        - generic [ref=e83]:
          - heading "TechGear Pro" [level=3] [ref=e85]
          - generic [ref=e86]:
            - heading "Quick Links" [level=3] [ref=e87]
            - list [ref=e88]:
              - listitem [ref=e89]:
                - link "Products" [ref=e90] [cursor=pointer]:
                  - /url: /products
              - listitem [ref=e91]:
                - link "About Us" [ref=e92] [cursor=pointer]:
                  - /url: /about
              - listitem [ref=e93]:
                - link "Cart" [ref=e94] [cursor=pointer]:
                  - /url: /cart
          - heading "Connect" [level=3] [ref=e96]
        - generic [ref=e97]:
          - paragraph [ref=e98]: © 2026 TechGear Pro. All rights reserved.
          - generic [ref=e99]:
            - generic [ref=e100]: Visa
            - generic [ref=e101]: Mastercard
            - generic [ref=e102]: Apple Pay
  - region "Notifications alt+T"
```

# Test source

```ts
  1  | import { test, expect } from '../../fixtures/auth.fixture.js';
  2  | 
  3  | test.describe('Account Addresses', () => {
  4  |   test.beforeEach(async ({ customerPage }) => {
  5  |     await customerPage.goto('/account/addresses');
  6  |   });
  7  | 
  8  |   test('page loads with seeded addresses', async ({ customerPage }) => {
  9  |     await expect(customerPage).toHaveTitle(/Addresses/);
  10 |     await expect(customerPage.getByRole('heading', { name: 'Addresses' })).toBeVisible();
  11 |     // Seeded customer has 2 addresses
  12 |     const cards = customerPage.locator('text=123 King Fahd Road');
  13 |     await expect(cards.first()).toBeVisible();
  14 |   });
  15 | 
  16 |   test('can delete and add address', async ({ customerPage }) => {
  17 |     // Delete first address
  18 |     const deleteButtons = customerPage.getByRole('button', { name: 'Delete address' });
  19 |     const countBefore = await deleteButtons.count();
  20 | 
  21 |     if (countBefore > 0) {
  22 |       await deleteButtons.first().click();
  23 |       await customerPage.waitForTimeout(500);
  24 |       const countAfter = await deleteButtons.count();
> 25 |       expect(countAfter).toBeLessThan(countBefore);
     |                          ^ Error: expect(received).toBeLessThan(expected)
  26 |     }
  27 |   });
  28 | });
  29 | 
```
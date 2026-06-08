# Landing Page Complete — Design Spec

**Date:** 2026-05-22
**Scope:** All missing landing page features from audit
**Constraint:** Zero copyrighted content (original text, fictional names, no real logos)

---

## 1. New Pages

### 1.1 Login (`/login`)
- Email + password inputs with Lucide icons
- "Remember me" checkbox (stored in localStorage)
- Links: "Forgot password?", "Create account"
- Submit → POST `/api/v1/merchant/auth/login`
- On success: redirect to dashboard (read `redirectTo` from query param)
- On MFA required (`mfaRequired: true`): redirect to `/login?mfa=1` with email prefilled
- Error handling with inline alert box

### 1.2 Forgot Password (`/forgot-password`)
- Email input only
- Submit → POST `/api/v1/merchant/auth/forgot-password`
- Success state: "Check your email" message
- Link back to login

### 1.3 Reset Password (`/reset-password`)
- Read `token` from query parameter
- New password + confirm password
- Submit → POST `/api/v1/merchant/auth/reset-password` with token
- Success → redirect to `/login`

### 1.4 Privacy Policy (`/privacy`)
- Sections: Introduction, Data We Collect, How We Use Data, Cookies, Your Rights (GDPR), Data Retention, Contact
- All text original, generic SaaS privacy policy
- Footer link updated to `/privacy`

### 1.5 Terms of Service (`/terms`)
- Sections: Agreement, Use of Service, Account Terms, Payment, Termination, Limitation of Liability, Changes, Contact
- All text original
- Footer link updated to `/terms`

### 1.6 Contact (`/contact`)
- Name, email, subject, message form
- Frontend-only (no backend endpoint for contact yet)
- Success state: "Message sent" (simulated, stored in localStorage or just UI)
- Alternative: mailto fallback with pre-filled subject

---

## 2. Home Page Enhancements

### 2.1 Testimonials Section
- 3 fictional merchant cards between Pricing and FAQ
- Names: fictional businesses (Brio Cafe, Desert Bloom Trading, Al-Manara Electronics)
- Quotes: generic positive statements about the platform
- Star rating (5 stars, Lucide icons)
- No photos — initial letters in colored circles

### 2.2 Trusted By Section
- Between Hero and Features
- 6 text-only company descriptor pills (e.g., "Fashion Retailer", "F&B Chain", "Electronics Store")
- No logos — just text in bordered pills with subtle styling
- Labels clearly fictional/generic

### 2.3 JSON-LD Structured Data
- `<script type="application/ld+json">` in `+page.svelte` `<svelte:head>`
- SoftwareApplication schema (name, description, applicationCategory, offers)
- Organization schema (name, url, email, address)

---

## 3. Global Enhancements

### 3.1 Open Graph / Twitter Meta Tags
- Update `app.html` with base OG tags
- Each page adds specific `og:title`, `og:description`, `og:url`
- `og:image` points to `/og-image.png` (placeholder, no actual image needed now)
- Twitter card tags (`twitter:card`, `twitter:title`, etc.)

### 3.2 Cookie Consent Banner
- Component: `lib/components/CookieConsent.svelte`
- Shown until user clicks "Accept"
- Persist choice in localStorage
- Simple text: "We use cookies to enhance your experience. By continuing, you agree to our use of cookies."
- Link to Privacy Policy
- Position: fixed bottom, full width

### 3.3 Dark Mode Toggle
- Update `app.css`: define dark theme colors in `@theme`
- Update `Navbar.svelte`: add sun/moon toggle button
- Persist preference in localStorage
- Toggle class `dark` on `<html>` element
- Default: light mode

### 3.4 Error Page (`+error.svelte`)
- 404: "Page not found" with link to home
- 500: "Something went wrong" with link to home
- Uses existing navy/emerald styling

### 3.5 Navbar Improvements
- Add "Sign In" link next to "Start Free Trial"
- Keep existing active state logic
- Mobile menu includes Sign In

---

## 4. Register Page Improvements

### 4.1 Terms Acceptance Checkbox
- Required checkbox: "I agree to the Terms of Service and Privacy Policy"
- Links to `/terms` and `/privacy`
- Form validation prevents submit if unchecked

### 4.2 Password Strength Indicator
- Visual bar below password input
- Colors: red (weak) → yellow (medium) → green (strong)
- Criteria: length, uppercase, lowercase, number, special char

### 4.3 MFA Handling
- After register success, check for `mfaRequired` in response
- If MFA required: redirect to `/login?mfa=1&email=`

---

## Implementation Order

1. **Global infra**: OG meta, error page, cookie consent, dark mode
2. **Auth pages**: Login, forgot password, reset password
3. **Legal pages**: Privacy, Terms
4. **Contact page**
5. **Home enhancements**: Testimonials, Trusted By, JSON-LD
6. **Register improvements**: Terms checkbox, password strength, MFA
7. **Navbar + Footer links**
8. **Verification**: TypeScript check, no console.log

---

## Content Policy (No Copyright)

| Element | Approach |
|---|---|
| Testimonials | Fictional business names, generic praise text |
| Trusted By | Text descriptors only, no logos, no real brands |
| OG Image | Reference `/og-image.png` (placeholder) |
| Legal text | Original, generic SaaS policy language |
| Quotes | Written from scratch, no copying from other sites |

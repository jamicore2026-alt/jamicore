# Brio Theme for Food Storefront — Design Spec

> Date: 2026-05-14
> Feature: Brio Theme (Ready-to-Eat Food Storefront)
> Scope: Frontend + Backend + Dashboard

---

## 1. Overview

Recreate the Brio Cafe website (briocafekw.com) as a configurable theme inside our existing `apps/storefront-food` SvelteKit app. Merchants with `store_type = 'food'` can switch between "Classic" (existing orange theme) and "Brio" (green/white) from the dashboard.

The Brio theme includes 7 pages: Homepage, Explore Menu, Category, Product Detail, Cart, Checkout, Contact Us.

## 2. Architecture

### 2.1 Theme System

```
apps/storefront-food/
├── src/lib/themes/
│   ├── classic/          # existing orange theme (moved here)
│   └── brio/             # new Brio theme
├── src/lib/shared/       # API, types, cart logic (extracted)
```

### 2.2 Route Resolution

- `/store/{slug}` — checks `store_theme_settings.theme_name`, redirects to `/store/{slug}/brio` if theme is "brio"
- `/store/{slug}/brio` — renders Brio homepage
- `/store/{slug}/brio/menu` — category grid
- `/store/{slug}/brio/menu/{slug}` — category page
- `/store/{slug}/brio/product/{slug}` — product detail
- `/store/{slug}/brio/cart` — cart
- `/store/{slug}/brio/checkout` — checkout
- `/store/{slug}/brio/contact` — contact

### 2.3 Shared vs Theme-Specific

| Shared | Theme-Specific |
|---|---|
| API calls, types, cart logic | Page layouts, components, styling |
| Auth, checkout flow | Colors, typography, spacing |
| Product data, categories | Homepage content, hero, story |

## 3. Pages & Components

### 3.1 Homepage (/brio)

- **Header** — logo, nav (Home | Explore Menu | Contact Us), cart icon with count
- **Hero** — full-width image, headline, subtitle, CTA button
- **Story Section** — merchant-editable text block
- **Featured Items** — 4 product cards (merchant-selected)
- **Location / Hours** — address, phone, hours
- **Footer** — copyright, social links

**Components:** `Header`, `Hero`, `StorySection`, `ProductGrid`, `LocationInfo`, `Footer`

### 3.2 Explore Menu (/brio/menu)

- Category grid — image + name + product count per card

**Components:** `CategoryCard`

### 3.3 Category Page (/brio/menu/[slug])

- Product grid — image, name, price per card
- Click navigates to product detail

**Components:** `ProductCard`, `ProductGrid`

### 3.4 Product Detail (/brio/product/[slug])

- Product image (left)
- Name, price, description (right)
- Modifiers: Size selector (Small/Regular/Large), Spice Level (Mild/Medium/Hot), Add-ons (checkboxes)
- Add to Cart button

**Components:** `ProductImage`, `SizeSelector`, `SpiceSelector`, `AddonSelector`, `AddToCart`

### 3.5 Cart (/brio/cart)

- Line items: product name, selected modifiers, quantity adjust, remove button, line total
- Subtotal
- Proceed to Checkout button

**Components:** `CartItem`, `CartSummary`

### 3.6 Checkout (/brio/checkout)

- Customer form: name, phone, email
- Delivery type: Delivery / Dine-in toggle
- Address / Table number field
- Delivery time picker
- Payment: Stripe Card Element or COD
- Order summary sidebar

**Components:** `CustomerForm`, `DeliveryTypeSelector`, `PaymentForm`, `OrderSummary`

### 3.7 Contact Us (/brio/contact)

- Contact form: name, email, subject, message
- Cafe info: address, phone, hours
- Google Maps embed

**Components:** `ContactForm`, `CafeInfo`, `MapEmbed`

## 4. Dashboard CMS

### 4.1 New Settings Page

Route: `/dashboard/settings/theme`

Available only for `store_type = 'food'`.

Fields:
- **Theme Selection** — dropdown (Classic / Brio)
- **Hero Section**
  - Headline (text)
  - Subtitle (text)
  - Button text (text)
  - Hero image upload
- **Our Story** — textarea
- **Featured Items** — multi-select product picker (max 4)
- **Contact Info**
  - Phone
  - Address
  - Hours
  - Google Maps embed URL

### 4.2 Database Schema

```sql
create table store_theme_settings (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  theme_name text not null default 'classic',

  hero_headline text,
  hero_subtitle text,
  hero_button_text text,
  hero_image_url text,

  story_text text,

  featured_product_ids uuid[],

  contact_phone text,
  contact_address text,
  contact_hours text,
  google_maps_url text,

  created_at timestamp default now(),
  updated_at timestamp default now(),

  unique(store_id)
);
```

### 4.3 API Endpoints

| Endpoint | Scope | Purpose |
|---|---|---|
| `GET /api/v1/public/stores/:slug/theme` | public | Read theme settings (Redis cached) |
| `PUT /api/v1/merchant/theme` | merchant | Update theme settings |

## 5. Data Flow

1. **Merchant edits theme** → `PUT /api/v1/merchant/theme`
2. **Backend saves to DB** + invalidates Redis cache
3. **Customer visits storefront** → `GET /api/v1/public/stores/{slug}/theme`
4. **Storefront renders** with theme data + products API

**Caching:**
- Redis key: `theme:{storeId}`
- TTL: 5 minutes
- Invalidation: delete on merchant PUT

## 6. Design Tokens (Brio Theme)

| Token | Value |
|---|---|
| Primary | `#1a4d2e` (dark green) |
| Primary Light | `#e8f5e9` |
| Background | `#ffffff` |
| Text | `#1a1a1a` |
| Text Muted | `#666666` |
| Border | `#e5e5e5` |
| Font | Inter or system sans-serif |
| Border Radius | 4px |
| Shadows | none (flat design) |

## 7. Implementation Phases

### Phase 1: Database + Backend API (~2h)
- Migration `0020_brio_theme.sql`
- Add `storeThemeSettings` to Drizzle schema
- Public GET endpoint with Redis cache
- Merchant PUT endpoint with validation

### Phase 2: Dashboard Theme Settings Page (~2h)
- New route `/dashboard/settings/theme/+page.svelte`
- Add "Theme" tab to settings layout
- Form with all fields + image upload
- Featured product picker (search + select)

### Phase 3: Brio Storefront Theme (~4h)
- Create `src/lib/themes/brio/` folder
- Build all components (Header, Hero, ProductCard, etc.)
- Build all routes (+layout, home, menu, category, product, cart, checkout, contact)
- Extract shared layer to `src/lib/shared/`
- Move existing classic theme to `src/lib/themes/classic/`

### Phase 4: Routing + Integration (~1h)
- Theme detection on `/store/{slug}`
- Redirect logic
- Update Dockerfile, docker-compose if needed

### Phase 5: Verification (~1h)
- `pnpm typecheck` — 0 errors
- `pnpm build` — passes
- Manual testing: theme switch, add to cart, checkout, contact

## 8. Risks

1. Moving classic theme into subfolder may break existing imports → careful refactoring
2. Shared cart logic extraction needs testing → verify cart state persists across themes
3. Featured product picker needs product search API → use existing `/api/v1/public/products`

## 9. Success Criteria

- [ ] Merchant can switch theme in dashboard
- [ ] Brio homepage renders with merchant's hero, story, featured items
- [ ] All 7 pages work end-to-end
- [ ] Add to cart → checkout flow completes with Stripe/COD
- [ ] TypeScript 0 errors
- [ ] No console.log in backend

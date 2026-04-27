# Merchant Admin — Complete Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the merchant admin dashboard by filling gaps across 22 modules, phased by business priority.

**Architecture:** SvelteKit 2 frontend (`apps/dashboard`) + Fastify backend (`apps/backend`) with Drizzle ORM. Merchant routes under `/merchant/*` REST API and `/dashboard/*` UI. Role-based access control via `staff` module.

**Tech Stack:** Svelte 5, Tailwind, shadcn-svelte, Fastify, Drizzle ORM, Zod 4, PostgreSQL.

---

## Existing State (Already Built)

| Module | Status | Notes |
|--------|--------|-------|
| Dashboard | 80% | KPIs, recent orders, quick actions. Missing: low-stock alerts, conversion rate, top-products list |
| Products | 85% | CRUD, search, pagination, publish toggle. Missing: variants, SKU, compare-price, SEO fields, tags |
| Categories | 60% | List exists. Missing: tree view, nested reorder, featured toggle |
| Orders | 80% | List, filters, detail. Missing: refund trigger, status-flow logic (packed→shipped→delivered), manual verification |
| Customers | 60% | List, detail. Missing: LTV, repeat-customer flag, block action |
| Coupons | 90% | Full CRUD. Missing: customer-specific coupon |
| Reviews | 85% | Moderation, respond. Missing: spam detection |
| Settings | 70% | General, branding, storefront, shipping, tax, staff. Missing: return policy, business-info completeness |
| Staff & Roles | 70% | Invite, list, roles (OWNER/MANAGER/CASHIER). Missing: fine-grained permissions (product-edit, order-manage, finance-access, settings-access) |
| Modifiers | 50% | List exists |
| Backend merchant routes | Good | Products, orders, payments, shipping, tax, analytics, upload, staff, reviews, coupons, store |

---

## Phase 1 — Must-Have Gaps (Revenue-Critical)

### Task 1: Inventory Module (New Page)
**Files:**
- Create: `apps/backend/src/modules/inventory/inventory.route.merchant.ts`
- Create: `apps/backend/src/modules/inventory/inventory.service.ts`
- Create: `apps/backend/src/modules/inventory/inventory.schema.ts`
- Create: `apps/dashboard/src/routes/(merchant)/dashboard/inventory/+page.server.ts`
- Create: `apps/dashboard/src/routes/(merchant)/dashboard/inventory/+page.svelte`
- Modify: `apps/dashboard/src/lib/components/layout/AdminSidebar.svelte` — add nav link

**Requirements:**
- Stock quantity per product/variant
- Low-stock threshold configuration
- Reserved stock (linked to pending orders)
- Low-stock alerts banner on dashboard
- Inventory history log (who changed what, when)
- Race-condition safe updates via atomic SQL

- [ ] **Step 1:** Add `inventoryHistory` table to schema (productId, variantId, changeQty, reason, userId, createdAt)
- [ ] **Step 2:** Backend route `GET /merchant/inventory` with filters (lowStock, outOfStock, productSearch)
- [ ] **Step 3:** Backend route `PATCH /merchant/inventory/:productId` atomic update
- [ ] **Step 4:** Backend route `GET /merchant/inventory/history/:productId`
- [ ] **Step 5:** Frontend list page with stock badges, inline editing, history drawer
- [ ] **Step 6:** Add low-stock alert to dashboard KPIs
- [ ] **Step 7:** Commit

---

### Task 2: Payments Module (New Page)
**Files:**
- Create: `apps/dashboard/src/routes/(merchant)/dashboard/payments/+page.server.ts`
- Create: `apps/dashboard/src/routes/(merchant)/dashboard/payments/+page.svelte`
- Create: `apps/dashboard/src/routes/(merchant)/dashboard/payments/[id]/+page.server.ts`
- Create: `apps/dashboard/src/routes/(merchant)/dashboard/payments/[id]/+page.svelte`
- Modify: `apps/backend/src/modules/payment/payment.route.merchant.ts` — add refund, dispute, log endpoints
- Modify: `apps/dashboard/src/lib/components/layout/AdminSidebar.svelte`

**Requirements:**
- Payment status list (success, failed, pending)
- Refund trigger (full + partial)
- COD log entries
- Payment dispute flagging
- Link payments to orders

- [ ] **Step 1:** Extend backend payment merchant routes with `POST /merchant/payments/:id/refund`, `GET /merchant/payments/disputes`
- [ ] **Step 2:** Frontend payments list with status filters, order link
- [ ] **Step 3:** Frontend payment detail with refund action + amount input
- [ ] **Step 4:** Commit

---

### Task 3: Order Status Flow & Refund Integration
**Files:**
- Modify: `apps/backend/src/modules/order/order.service.ts` — enforce status transition rules
- Modify: `apps/backend/src/modules/order/order.route.merchant.ts` — add refund trigger endpoint
- Modify: `apps/dashboard/src/routes/(merchant)/dashboard/orders/[id]/+page.svelte`

**Requirements:**
- Status flow: pending → paid → packed → shipped → delivered → cancelled | refunded
- Only allow valid transitions
- Refund triggers payment module
- Manual verification flag

- [ ] **Step 1:** Implement status transition validator in order service
- [ ] **Step 2:** Add `POST /merchant/orders/:id/refund` endpoint
- [ ] **Step 3:** Update order detail UI with status timeline + action buttons
- [ ] **Step 4:** Commit

---

### Task 4: Staff Role Permissions (RBAC)
**Files:**
- Modify: `apps/backend/src/modules/staff/staff.schema.ts` — expand roles/permissions
- Modify: `apps/backend/src/modules/staff/staff.service.ts`
- Modify: `apps/backend/src/scopes/public.ts` or merchant scope — add permission checks
- Modify: `apps/dashboard/src/routes/(merchant)/dashboard/settings/staff/+page.svelte`

**Requirements:**
- OWNER: full access
- MANAGER: products, orders, customers, coupons, reviews, analytics
- STAFF: orders (view + update status), products (view)
- SUPPORT: customers (view), orders (view)
- Permissions stored as JSONB/bitmask per staff record
- Frontend hides/disables actions based on permissions

- [ ] **Step 1:** Design permission schema (enum or bitmask: productEdit, orderManage, financeAccess, settingsAccess)
- [ ] **Step 2:** Update staff table migration
- [ ] **Step 3:** Add preHandler hooks to merchant routes for permission checks
- [ ] **Step 4:** Update invite flow to allow permission selection
- [ ] **Step 5:** Frontend: conditionally render actions based on user permissions
- [ ] **Step 6:** Commit

---

## Phase 2 — Growth Features

### Task 5: Analytics Module (New Page)
**Files:**
- Create: `apps/dashboard/src/routes/(merchant)/dashboard/analytics/+page.server.ts`
- Create: `apps/dashboard/src/routes/(merchant)/dashboard/analytics/+page.svelte`
- Modify: `apps/backend/src/modules/analytics/analytics.route.merchant.ts`

**Requirements:**
- Revenue charts (daily/weekly/monthly)
- Order trends
- Best sellers list
- Customer retention rate
- Conversion funnel (visit → cart → checkout → paid)

- [ ] **Step 1:** Extend analytics backend with time-series aggregations
- [ ] **Step 2:** Frontend charts using lightweight chart lib (e.g., chart.js or custom SVG)
- [ ] **Step 3:** Commit

---

### Task 6: Customers Enhancements
**Files:**
- Modify: `apps/backend/src/modules/customer/customer.service.ts`
- Modify: `apps/dashboard/src/routes/(merchant)/dashboard/customers/+page.svelte`
- Modify: `apps/dashboard/src/routes/(merchant)/dashboard/customers/[id]/+page.svelte`

**Requirements:**
- LTV calculation
- Repeat customer badge
- Block/unblock customer action
- Order history in customer detail

- [ ] **Step 1:** Backend: add LTV aggregation, block endpoint
- [ ] **Step 2:** Frontend: add LTV column, block action, order history tab
- [ ] **Step 3:** Commit

---

### Task 7: Reports & Exports
**Files:**
- Create: `apps/backend/src/modules/report/report.route.merchant.ts`
- Create: `apps/backend/src/modules/report/report.service.ts`
- Create: `apps/dashboard/src/routes/(merchant)/dashboard/reports/+page.server.ts`
- Create: `apps/dashboard/src/routes/(merchant)/dashboard/reports/+page.svelte`

**Requirements:**
- Sales export (CSV)
- Customer export
- Inventory export
- Tax report export

- [ ] **Step 1:** Backend CSV generation endpoints
- [ ] **Step 2:** Frontend report builder UI (date range, type selection)
- [ ] **Step 3:** Commit

---

### Task 8: Marketing (Banners)
**Files:**
- Create: `apps/backend/src/modules/marketing/marketing.route.merchant.ts`
- Create: `apps/backend/src/modules/marketing/marketing.schema.ts`
- Create: `apps/dashboard/src/routes/(merchant)/dashboard/marketing/+page.svelte`

**Requirements:**
- Banner upload + link
- Homepage section ordering
- Upsell/cross-sell rules (later)

- [ ] **Step 1:** Backend CRUD for banners
- [ ] **Step 2:** Frontend banner manager
- [ ] **Step 3:** Commit

---

## Phase 3 — Polish & Infrastructure

### Task 9: Store Design (Sections)
**Files:**
- Modify: `apps/dashboard/src/routes/(merchant)/dashboard/settings/storefront/+page.svelte`

**Requirements:**
- Homepage block reordering
- Section visibility toggles
- Theme color preview

- [ ] **Step 1:** Extend storefront settings with section config
- [ ] **Step 2:** UI for drag-drop section ordering
- [ ] **Step 3:** Commit

---

### Task 10: Notifications Center
**Files:**
- Create: `apps/backend/src/modules/notification/notification.route.merchant.ts`
- Create: `apps/backend/src/modules/notification/notification.schema.ts`
- Create: `apps/dashboard/src/routes/(merchant)/dashboard/notifications/+page.svelte`
- Modify: `apps/dashboard/src/lib/components/layout/AdminTopbar.svelte` — add bell icon

**Requirements:**
- Order alerts
- Low-stock alerts
- Payment failure alerts
- Mark as read

- [ ] **Step 1:** Notifications table + backend CRUD
- [ ] **Step 2:** Frontend notifications page + topbar badge
- [ ] **Step 3:** Commit

---

### Task 11: Audit Logs
**Files:**
- Create: `apps/backend/src/modules/audit/audit.route.merchant.ts`
- Create: `apps/backend/src/modules/audit/audit.service.ts`
- Create: `apps/dashboard/src/routes/(merchant)/dashboard/audit-logs/+page.svelte`

**Requirements:**
- Who changed what + when
- Refund logs
- Order status override logs
- Inventory adjustment logs

- [ ] **Step 1:** Central audit log service (reused by inventory, orders, staff)
- [ ] **Step 2:** Frontend audit log viewer with filters
- [ ] **Step 3:** Commit

---

### Task 12: Domain Settings
**Files:**
- Create: `apps/dashboard/src/routes/(merchant)/dashboard/settings/domain/+page.svelte`
- Modify: `apps/backend/src/modules/store/store.route.merchant.ts`

**Requirements:**
- Subdomain display
- Custom domain input
- DNS verification instructions
- SSL status display

- [ ] **Step 1:** Backend: store custom domain + verification status
- [ ] **Step 2:** Frontend domain settings page
- [ ] **Step 3:** Commit

---

### Task 13: Integrations Hub
**Files:**
- Create: `apps/dashboard/src/routes/(merchant)/dashboard/integrations/+page.svelte`
- Modify: `apps/backend/src/modules/store/store.route.merchant.ts` — add integration config

**Requirements:**
- Razorpay/Stripe connection status
- WhatsApp Business API config
- Shiprocket API key
- Google Analytics ID
- Meta Pixel ID

- [ ] **Step 1:** Backend: integrations JSONB config on store
- [ ] **Step 2:** Frontend integrations grid with toggle + input
- [ ] **Step 3:** Commit

---

### Task 14: Support Tickets
**Files:**
- Create: `apps/backend/src/modules/support/support.route.merchant.ts`
- Create: `apps/dashboard/src/routes/(merchant)/dashboard/support/+page.svelte`

**Requirements:**
- Merchant can raise support tickets to platform
- View ticket status

- [ ] **Step 1:** Backend support ticket CRUD
- [ ] **Step 2:** Frontend support form + list
- [ ] **Step 3:** Commit

---

## Self-Review

**1. Spec coverage:**
- All 22 modules from user spec are covered or noted as already built
- Phase 1 focuses on gaps in already-existing modules (inventory, payments, orders flow, staff RBAC)
- Phase 2 adds new high-value modules (analytics, reports, marketing, customer enhancements)
- Phase 3 adds infrastructure/polish (store design, notifications, audit, domain, integrations, support)

**2. Placeholder scan:**
- No "TBD" or "implement later" placeholders
- Each task has specific file paths and concrete requirements
- Code steps are outlined at step level (exact code to be written during execution)

**3. Type consistency:**
- Uses existing patterns: `apiFetch`, `$state`, `$derived`, `$props`
- Follows existing merchant route pattern `/merchant/*`
- Uses existing shadcn-svelte components

---

## Execution Handoff

**Plan saved to:** `docs/superpowers/plans/2026-04-25-merchant-admin-complete.md`

**Two execution options:**

1. **Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Recommended:** Start with Phase 1 Task 1 (Inventory) since it is the largest gap and most business-critical. Use subagent-driven development for parallel workstreams (e.g., Inventory + Payments can be built in parallel after schema decisions).

// Complete Database Schema for SaaS E-commerce Platform
// Using Drizzle ORM with PostgreSQL
// Copy exactly from skill reference - no changes

import { pgTable, text, timestamp, uuid, integer, decimal, boolean, json, unique, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const superAdmins = pgTable("super_admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const merchantPlans = pgTable("merchant_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price").default("0"),
  currency: text("currency").default("USD"),
  interval: text("interval").default("month"),
  features: json("features").$type<string[]>(),
  maxProducts: integer("max_products").default(100),
  maxStorage: integer("max_storage").default(1024),
  maxStaff: integer("max_staff").default(3),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stores = pgTable("stores", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  domain: text("domain").notNull().unique(),
  status: text("status").default("pending").notNull(),
  isApproved: boolean("is_approved").default(false),
  approvedAt: timestamp("approved_at"),
  approvedBy: uuid("approved_by").references(() => superAdmins.id),
  planId: uuid("plan_id").references(() => merchantPlans.id),
  planExpiresAt: timestamp("plan_expires_at"),
  ownerEmail: text("owner_email").notNull().unique(),
  ownerName: text("owner_name"),
  ownerPhone: text("owner_phone"),
  totalOrders: integer("total_orders").default(0),
  totalRevenue: decimal("total_revenue").default("0"),
  totalCustomers: integer("total_customers").default(0),
  primaryColor: text("primary_color").default("#0ea5e9"),
  secondaryColor: text("secondary_color").default("#6366f1"),
  accentColor: text("accent_color").default("#8b5cf6"),
  backgroundColor: text("background_color").default("#0f172a"),
  surfaceColor: text("surface_color").default("#1e293b"),
  textColor: text("text_color").default("#f8fafc"),
  textSecondaryColor: text("text_secondary_color").default("#94a3b8"),
  borderColor: text("border_color").default("rgba(255,255,255,0.1)"),
  borderRadius: text("border_radius").default("12px"),
  fontFamily: text("font_family").default("Inter, sans-serif"),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  activeTheme: text("active_theme").default("default"),
  currency: text("currency").default("USD"),
  language: text("language").default("en"),
  heroImage: text("hero_image"),
  heroTitle: text("hero_title").default("Welcome to Our Store"),
  heroSubtitle: text("hero_subtitle").default("Discover amazing products at great prices"),
  heroCtaText: text("hero_cta_text").default("Explore Collection"),
  heroCtaLink: text("hero_cta_link").default("#products"),
  heroEnabled: boolean("hero_enabled").default(true),
  customDomain: text("custom_domain").unique(),
  customDomainVerified: boolean("custom_domain_verified").default(false),
  customDomainVerifiedAt: timestamp("custom_domain_verified_at"),
  trialStartedAt: timestamp("trial_started_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  usedStorage: integer("used_storage").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("OWNER").notNull(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subcategories = pgTable("subcategories", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => categories.id).notNull(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  categoryId: uuid("category_id").references(() => categories.id).notNull(),
  subcategoryId: uuid("subcategory_id").references(() => subcategories.id),
  titleEn: text("title_en").notNull(),
  titleAr: text("title_ar"),
  sortOrder: integer("sort_order").default(0),
  preparationTime: integer("preparation_time"),
  tags: json("tags").$type<string[]>().default([]),
  images: json("images").$type<string[]>().default([]),
  youtubeVideoLinkId: text("youtube_video_link_id"),
  descriptionEn: text("description_en"),
  descriptionAr: text("description_ar"),
  salePrice: decimal("sale_price").notNull(),
  purchasePrice: decimal("purchase_price"),
  purchaseLimit: integer("purchase_limit"),
  barcode: text("barcode"),
  discountType: text("discount_type").default("Percent"),
  discount: decimal("discount").default("0"),
  souqDealDiscount: decimal("souq_deal_discount"),
  currentQuantity: integer("current_quantity").default(0),
  inventoryAlertThreshold: integer("inventory_alert_threshold").default(0),
  isPublished: boolean("is_published").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("products_store_id_is_published_idx").on(table.storeId, table.isPublished),
]);

export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const productVariantOptions = pgTable("product_variant_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "cascade" }).notNull(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar"),
  priceAdjustment: decimal("price_adjustment").default("0"),
  sku: text("sku"),
  stockQuantity: integer("stock_quantity"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").default(0),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const productVariantCombinations = pgTable("product_variant_combinations", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  sku: text("sku").notNull(),
  combinationKey: text("combination_key").notNull(),
  priceAdjustment: decimal("price_adjustment").default("0"),
  stockQuantity: integer("stock_quantity").default(0),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Product Bundles ───

export const productBundles = pgTable("product_bundles", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const productBundleItems = pgTable("product_bundle_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  bundleId: uuid("bundle_id").notNull().references(() => productBundles.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").default(1).notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const modifierGroups = pgTable("modifier_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  productId: uuid("product_id").references(() => products.id),
  categoryId: uuid("category_id").references(() => categories.id),
  applyTo: text("apply_to").notNull().default("product"),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  isRequired: boolean("is_required").default(false),
  minSelections: integer("min_selections").default(1),
  maxSelections: integer("max_selections").default(1),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const modifierOptions = pgTable("modifier_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  modifierGroupId: uuid("modifier_group_id").references(() => modifierGroups.id, { onDelete: "cascade" }).notNull(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar"),
  priceAdjustment: decimal("price_adjustment").default("0"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").default(0),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  isVerified: boolean("is_verified").default(false),
  marketingEmails: boolean("marketing_emails").default(true),
  lastLoginAt: timestamp("last_login_at"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  emailStoreUnique: unique().on(table.email, table.storeId),
  storeIdEmailIdx: index("customers_store_id_email_idx").on(table.storeId, table.email),
}));

export const customerAddresses = pgTable("customer_addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  name: text("name").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  addressLine1: text("address_line_1").notNull(),
  addressLine2: text("address_line_2"),
  city: text("city").notNull(),
  state: text("state"),
  country: text("country").notNull(),
  postalCode: text("postal_code").notNull(),
  phone: text("phone"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  code: text("code").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  value: decimal("value").notNull(),
  minOrderAmount: decimal("min_order_amount"),
  maxDiscountAmount: decimal("max_discount_amount"),
  freeShipping: boolean("free_shipping").default(false),
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").default(0),
  usageLimitPerCustomer: integer("usage_limit_per_customer").default(1),
  isActive: boolean("is_active").default(true),
  startsAt: timestamp("starts_at"),
  expiresAt: timestamp("expires_at"),
  appliesTo: text("applies_to").default("all"),
  productIds: text("product_ids"),
  categoryIds: text("category_ids"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("coupons_store_id_code_idx").on(table.storeId, table.code),
]);

export const couponUsages = pgTable("coupon_usages", {
  id: uuid("id").primaryKey().defaultRandom(),
  couponId: uuid("coupon_id").references(() => coupons.id).notNull(),
  customerId: uuid("customer_id").references(() => customers.id).notNull(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  usedAt: timestamp("used_at").defaultNow().notNull(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
}, (table) => [
  index("coupon_usages_coupon_customer_idx").on(table.couponId, table.customerId),
  index("coupon_usages_store_id_idx").on(table.storeId),
]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  customerId: uuid("customer_id").references(() => customers.id),
  orderNumber: text("order_number").notNull().unique(),
  status: text("status").default("pending").notNull(),
  paymentStatus: text("payment_status").default("pending").notNull(),
  fulfillmentStatus: text("fulfillment_status").default("unfulfilled").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  currency: text("currency").notNull(),
  subtotal: decimal("subtotal").notNull(),
  tax: decimal("tax").default("0"),
  shipping: decimal("shipping").default("0"),
  discount: decimal("discount").default("0"),
  total: decimal("total").notNull(),
  billingName: text("billing_name"),
  billingFirstName: text("billing_first_name"),
  billingLastName: text("billing_last_name"),
  billingAddressLine1: text("billing_address_line_1"),
  billingAddressLine2: text("billing_address_line_2"),
  billingCity: text("billing_city"),
  billingState: text("billing_state"),
  billingCountry: text("billing_country"),
  billingPostalCode: text("billing_postal_code"),
  shippingName: text("shipping_name"),
  shippingFirstName: text("shipping_first_name"),
  shippingLastName: text("shipping_last_name"),
  shippingAddressLine1: text("shipping_address_line_1"),
  shippingAddressLine2: text("shipping_address_line_2"),
  shippingCity: text("shipping_city"),
  shippingState: text("shipping_state"),
  shippingCountry: text("shipping_country"),
  shippingPostalCode: text("shipping_postal_code"),
  paymentMethod: text("payment_method"),
  paymentIntentId: text("payment_intent_id"),
  shippingMethod: text("shipping_method"),
  shippingCarrier: text("shipping_carrier"),
  trackingNumber: text("tracking_number"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  couponCode: text("coupon_code"),
  couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: 'set null' }),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("orders_store_id_status_created_at_idx").on(table.storeId, table.status, table.createdAt),
  index("orders_store_id_customer_id_idx").on(table.storeId, table.customerId),
]);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  productId: uuid("product_id").references(() => products.id),
  productTitle: text("product_title").notNull(),
  productImage: text("product_image"),
  variantName: text("variant_name"),
  quantity: integer("quantity").notNull(),
  price: decimal("price").notNull(),
  total: decimal("total").notNull(),
  modifiers: json("modifiers"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").references(() => orders.id),
  rating: integer("rating").notNull(),
  title: text("title"),
  content: text("content").notNull(),
  images: json("images").$type<string[]>().default([]),
  isVerified: boolean("is_verified").default(false),
  isApproved: boolean("is_approved").default(true),
  helpfulCount: integer("helpful_count").default(0),
  response: text("response"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("reviews_store_id_product_id_is_approved_idx").on(table.storeId, table.productId, table.isApproved),
]);

export const wishlists = pgTable("wishlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  couponCode: text("coupon_code"),
  couponDiscount: decimal("coupon_discount").default("0"),
  subtotal: decimal("subtotal").default("0"),
  total: decimal("total").default("0"),
  itemCount: integer("item_count").default(0),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  cartId: uuid("cart_id").references(() => carts.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  bundleId: uuid("bundle_id").references(() => productBundles.id, { onDelete: "set null" }),
  quantity: integer("quantity").notNull().default(1),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  modifiers: json("modifiers"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  userId: uuid("user_id"),
  customerId: uuid("customer_id"),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  metadata: json("metadata"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const storeAnalytics = pgTable("store_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  date: timestamp("date").notNull(),
  visitors: integer("visitors").default(0),
  pageViews: integer("page_views").default(0),
  orders: integer("orders").default(0),
  revenue: decimal("revenue").default("0"),
  averageOrderValue: decimal("average_order_value").default("0"),
  conversionRate: decimal("conversion_rate").default("0"),
  productsViewed: integer("products_viewed").default(0),
  addToCarts: integer("add_to_carts").default(0),
  checkoutsStarted: integer("checkouts_started").default(0),
  checkoutsCompleted: integer("checkouts_completed").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// Relations
// ==========================================

export const storesRelations = relations(stores, ({ many, one }) => ({
  plan: one(merchantPlans, {
    fields: [stores.planId],
    references: [merchantPlans.id],
  }),
  users: many(users),
  categories: many(categories),
  products: many(products),
  customers: many(customers),
  orders: many(orders),
  coupons: many(coupons),
  bundles: many(productBundles),
  analytics: many(storeAnalytics),
  paymentProviders: many(paymentProviders),
  payments: many(payments),
  webhooks: many(webhooks),
  merchantNotifications: many(merchantNotifications),
}));

export const categoriesRelations = relations(categories, ({ many, one }) => ({
  store: one(stores, {
    fields: [categories.storeId],
    references: [stores.id],
  }),
  subcategories: many(subcategories),
  products: many(products),
  modifierGroups: many(modifierGroups),
}));

export const subcategoriesRelations = relations(subcategories, ({ one, many }) => ({
  category: one(categories, {
    fields: [subcategories.categoryId],
    references: [categories.id],
  }),
  store: one(stores, {
    fields: [subcategories.storeId],
    references: [stores.id],
  }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  store: one(stores, {
    fields: [products.storeId],
    references: [stores.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  subcategory: one(subcategories, {
    fields: [products.subcategoryId],
    references: [subcategories.id],
  }),
  variants: many(productVariants),
  modifierGroups: many(modifierGroups),
  reviews: many(reviews),
  orderItems: many(orderItems),
  wishlistItems: many(wishlists),
  bundleItems: many(productBundleItems),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  store: one(stores, {
    fields: [productVariants.storeId],
    references: [stores.id],
  }),
  options: many(productVariantOptions),
}));

export const productVariantOptionsRelations = relations(productVariantOptions, ({ one }) => ({
  variant: one(productVariants, {
    fields: [productVariantOptions.variantId],
    references: [productVariants.id],
  }),
  store: one(stores, {
    fields: [productVariantOptions.storeId],
    references: [stores.id],
  }),
}));

export const productVariantCombinationsRelations = relations(productVariantCombinations, ({ one }) => ({
  product: one(products, {
    fields: [productVariantCombinations.productId],
    references: [products.id],
  }),
  store: one(stores, {
    fields: [productVariantCombinations.storeId],
    references: [stores.id],
  }),
}));

export const productBundlesRelations = relations(productBundles, ({ one, many }) => ({
  store: one(stores, {
    fields: [productBundles.storeId],
    references: [stores.id],
  }),
  items: many(productBundleItems),
}));

export const productBundleItemsRelations = relations(productBundleItems, ({ one }) => ({
  bundle: one(productBundles, {
    fields: [productBundleItems.bundleId],
    references: [productBundles.id],
  }),
  product: one(products, {
    fields: [productBundleItems.productId],
    references: [products.id],
  }),
}));

export const modifierGroupsRelations = relations(modifierGroups, ({ one, many }) => ({
  product: one(products, {
    fields: [modifierGroups.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [modifierGroups.categoryId],
    references: [categories.id],
  }),
  store: one(stores, {
    fields: [modifierGroups.storeId],
    references: [stores.id],
  }),
  options: many(modifierOptions),
}));

export const modifierOptionsRelations = relations(modifierOptions, ({ one }) => ({
  modifierGroup: one(modifierGroups, {
    fields: [modifierOptions.modifierGroupId],
    references: [modifierGroups.id],
  }),
  store: one(stores, {
    fields: [modifierOptions.storeId],
    references: [stores.id],
  }),
}));

export const customersRelations = relations(customers, ({ many, one }) => ({
  store: one(stores, {
    fields: [customers.storeId],
    references: [stores.id],
  }),
  addresses: many(customerAddresses),
  orders: many(orders),
  reviews: many(reviews),
  wishlist: many(wishlists),
  cart: one(carts),
  couponUsages: many(couponUsages),
}));

export const customerAddressesRelations = relations(customerAddresses, ({ one }) => ({
  customer: one(customers, {
    fields: [customerAddresses.customerId],
    references: [customers.id],
  }),
  store: one(stores, {
    fields: [customerAddresses.storeId],
    references: [stores.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  store: one(stores, {
    fields: [orders.storeId],
    references: [stores.id],
  }),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
  coupon: one(coupons, {
    fields: [orders.couponId],
    references: [coupons.id],
  }),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  store: one(stores, {
    fields: [orderItems.storeId],
    references: [stores.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  store: one(stores, {
    fields: [reviews.storeId],
    references: [stores.id],
  }),
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
  customer: one(customers, {
    fields: [reviews.customerId],
    references: [customers.id],
  }),
  order: one(orders, {
    fields: [reviews.orderId],
    references: [orders.id],
  }),
}));

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  store: one(stores, {
    fields: [wishlists.storeId],
    references: [stores.id],
  }),
  customer: one(customers, {
    fields: [wishlists.customerId],
    references: [customers.id],
  }),
  product: one(products, {
    fields: [wishlists.productId],
    references: [products.id],
  }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  store: one(stores, {
    fields: [carts.storeId],
    references: [stores.id],
  }),
  customer: one(customers, {
    fields: [carts.customerId],
    references: [customers.id],
  }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
  bundle: one(productBundles, {
    fields: [cartItems.bundleId],
    references: [productBundles.id],
  }),
}));

export const couponsRelations = relations(coupons, ({ one, many }) => ({
  store: one(stores, {
    fields: [coupons.storeId],
    references: [stores.id],
  }),
  orders: many(orders),
  usages: many(couponUsages),
}));

export const couponUsagesRelations = relations(couponUsages, ({ one }) => ({
  store: one(stores, {
    fields: [couponUsages.storeId],
    references: [stores.id],
  }),
  coupon: one(coupons, {
    fields: [couponUsages.couponId],
    references: [coupons.id],
  }),
  customer: one(customers, {
    fields: [couponUsages.customerId],
    references: [customers.id],
  }),
  order: one(orders, {
    fields: [couponUsages.orderId],
    references: [orders.id],
  }),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  store: one(stores, {
    fields: [emailTemplates.storeId],
    references: [stores.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  store: one(stores, {
    fields: [activityLogs.storeId],
    references: [stores.id],
  }),
}));

export const storeAnalyticsRelations = relations(storeAnalytics, ({ one }) => ({
  store: one(stores, {
    fields: [storeAnalytics.storeId],
    references: [stores.id],
  }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  store: one(stores, {
    fields: [users.storeId],
    references: [stores.id],
  }),
}));

export const superAdminsRelations = relations(superAdmins, ({ many }) => ({
  approvedStores: many(stores),
}));

export const merchantPlansRelations = relations(merchantPlans, ({ many }) => ({
  stores: many(stores),
}));

// ─── Phase 1: Auth Reset/Verify + Staff Roles ───

export const verificationTokens = pgTable("verification_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  type: text("type").notNull(), // 'email_verification' | 'password_reset'
  userType: text("user_type").notNull(), // 'customer' | 'merchant'
  storeId: uuid("store_id").references(() => stores.id, { onDelete: 'cascade' }), // nullable for merchant-level (no store context yet)
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const staffInvitations = pgTable("staff_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(), // 'MANAGER' | 'CASHIER'
  invitedBy: uuid("invited_by").references(() => users.id, { onDelete: 'set null' }),
  token: text("token").notNull().unique(),
  status: text("status").default("pending"), // 'pending' | 'accepted' | 'rejected' | 'expired'
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  userId: uuid("user_id"), // set when invitation accepted
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rolePermissions = pgTable("role_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull(),
  role: text("role").notNull(), // 'OWNER' | 'MANAGER' | 'CASHIER'
  permissions: json("permissions").$type<string[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Phase 1 Relations ───

export const verificationTokensRelations = relations(verificationTokens, ({ one }) => ({
  store: one(stores, {
    fields: [verificationTokens.storeId],
    references: [stores.id],
  }),
}));

export const staffInvitationsRelations = relations(staffInvitations, ({ one }) => ({
  store: one(stores, {
    fields: [staffInvitations.storeId],
    references: [stores.id],
  }),
  inviter: one(users, {
    fields: [staffInvitations.invitedBy],
    references: [users.id],
  }),
  acceptedUser: one(users, {
    fields: [staffInvitations.userId],
    references: [users.id],
  }),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  store: one(stores, {
    fields: [rolePermissions.storeId],
    references: [stores.id],
  }),
}));

// ─── Phase 2: Shipping Zones + Tax Config ───

export const shippingZones = pgTable("shipping_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  name: text("name").notNull(),
  countries: json("countries").$type<string[]>().default([]),
  states: json("states").$type<string[]>().default([]),
  postalCodePatterns: json("postal_code_patterns").$type<string[]>().default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const shippingRates = pgTable("shipping_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  zoneId: uuid("zone_id").references(() => shippingZones.id, { onDelete: "cascade" }).notNull(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  name: text("name").notNull(),
  method: text("method").notNull(), // 'standard' | 'express' | 'overnight' | 'pickup'
  carrier: text("carrier"), // 'fedex' | 'ups' | 'dhl' | 'usps' | null (custom)
  price: decimal("price").notNull(),
  freeAbove: decimal("free_above"), // free shipping if order subtotal >= this
  weightBased: boolean("weight_based").default(false),
  pricePerKg: decimal("price_per_kg"),
  estimatedDays: integer("estimated_days"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const taxRates = pgTable("tax_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  name: text("name").notNull(),
  rate: decimal("rate").notNull(), // e.g. "0.0825" for 8.25%
  country: text("country"), // ISO 3166-1 alpha-2, null = applies to all
  state: text("state"), // ISO 3166-2 subdivision code
  postalCode: text("postal_code"), // specific postal code or pattern
  isCompound: boolean("is_compound").default(false), // compound on top of other taxes
  priority: integer("priority").default(1), // lower = applied first
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Phase 2 Relations ───

export const shippingZonesRelations = relations(shippingZones, ({ one, many }) => ({
  store: one(stores, {
    fields: [shippingZones.storeId],
    references: [stores.id],
  }),
  rates: many(shippingRates),
}));

export const shippingRatesRelations = relations(shippingRates, ({ one }) => ({
  zone: one(shippingZones, {
    fields: [shippingRates.zoneId],
    references: [shippingZones.id],
  }),
  store: one(stores, {
    fields: [shippingRates.storeId],
    references: [stores.id],
  }),
}));

export const taxRatesRelations = relations(taxRates, ({ one }) => ({
  store: one(stores, {
    fields: [taxRates.storeId],
    references: [stores.id],
  }),
}));

// ─── Phase 3: Payment Providers + Payments ───

export const paymentProviders = pgTable("payment_providers", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  provider: text("provider").notNull(), // 'razorpay' | 'stripe' | 'cod'
  isEnabled: boolean("is_enabled").default(false),
  config: json("config").$type<Record<string, string>>(), // provider-specific config (API keys, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  provider: text("provider").notNull(), // 'razorpay' | 'stripe' | 'cod'
  providerPaymentId: text("provider_payment_id"), // Razorpay payment_id, Stripe PaymentIntent ID
  status: text("status").default("pending").notNull(), // pending | processing | completed | failed | refunded
  amount: decimal("amount").notNull(),
  currency: text("currency").default("USD"),
  idempotencyKey: text("idempotency_key"), // for retry safety
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("payments_store_id_provider_provider_payment_id_idx").on(table.storeId, table.provider, table.providerPaymentId),
  index("payments_store_id_order_id_idx").on(table.storeId, table.orderId),
]);

// ─── Phase 3 Relations ───

export const paymentProvidersRelations = relations(paymentProviders, ({ one }) => ({
  store: one(stores, {
    fields: [paymentProviders.storeId],
    references: [stores.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  store: one(stores, {
    fields: [payments.storeId],
    references: [stores.id],
  }),
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));

// ---- Webhooks ----

export const webhooks = pgTable("webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  url: text("url").notNull(),
  events: json("events").$type<string[]>().notNull(),
  secret: text("secret").notNull(),
  isActive: boolean("is_active").default(true),
  lastDeliveredAt: timestamp("last_delivered_at"),
  lastFailureAt: timestamp("last_failure_at"),
  failureCount: integer("failure_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  webhookId: uuid("webhook_id").references(() => webhooks.id, { onDelete: "cascade" }).notNull(),
  event: text("event").notNull(),
  payload: json("payload").notNull(),
  status: text("status").default("pending").notNull(),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---- Exchange Rates ----

export const exchangeRates = pgTable("exchange_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  baseCurrency: text("base_currency").notNull(),
  targetCurrency: text("target_currency").notNull(),
  rate: decimal("rate").notNull(),
  source: text("source").default("manual"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("exchange_rates_base_target_idx").on(table.baseCurrency, table.targetCurrency),
]);

// ---- Merchant Notifications ----

export const merchantNotifications = pgTable("merchant_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: json("data"),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Super Admin Tables ───

export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").default("open").notNull(),
  priority: text("priority").default("medium").notNull(),
  assignedTo: uuid("assigned_to").references(() => superAdmins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const ticketReplies = pgTable("ticket_replies", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id").references(() => supportTickets.id, { onDelete: 'cascade' }).notNull(),
  authorId: uuid("author_id").notNull(),
  authorType: text("author_type").notNull(), // 'superadmin' | 'merchant'
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const platformSettings = pgTable("platform_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  type: text("type").default("string").notNull(),
  updatedBy: uuid("updated_by").references(() => superAdmins.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const adminNotifications = pgTable("admin_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  targetScope: text("target_scope").default("all").notNull(),
  targetStoreId: uuid("target_store_id").references(() => stores.id),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  planId: uuid("plan_id").references(() => merchantPlans.id),
  amount: decimal("amount").notNull(),
  status: text("status").default("pending").notNull(),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  pdfUrl: text("pdf_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Super Admin Relations ───

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  store: one(stores, {
    fields: [supportTickets.storeId],
    references: [stores.id],
  }),
  assignedAdmin: one(superAdmins, {
    fields: [supportTickets.assignedTo],
    references: [superAdmins.id],
  }),
  replies: many(ticketReplies),
}));

export const ticketRepliesRelations = relations(ticketReplies, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [ticketReplies.ticketId],
    references: [supportTickets.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  store: one(stores, {
    fields: [invoices.storeId],
    references: [stores.id],
  }),
  plan: one(merchantPlans, {
    fields: [invoices.planId],
    references: [merchantPlans.id],
  }),
}));

// ---- New Table Relations ----

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  store: one(stores, {
    fields: [webhooks.storeId],
    references: [stores.id],
  }),
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  webhook: one(webhooks, {
    fields: [webhookDeliveries.webhookId],
    references: [webhooks.id],
  }),
}));

export const exchangeRatesRelations = relations(exchangeRates, () => ({}));

export const merchantNotificationsRelations = relations(merchantNotifications, ({ one }) => ({
  store: one(stores, {
    fields: [merchantNotifications.storeId],
    references: [stores.id],
  }),
}));

// ─── Returns ───

export const returns = pgTable("returns", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  customerId: uuid("customer_id").references(() => customers.id),
  status: text("status").default("requested").notNull(),
  reason: text("reason").notNull(),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  refundMethod: text("refund_method"),
  refundTransactionId: text("refund_transaction_id"),
  shippedAt: timestamp("shipped_at"),
  receivedAt: timestamp("received_at"),
  inspectedAt: timestamp("inspected_at"),
  refundedAt: timestamp("refunded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const returnItems = pgTable("return_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  returnId: uuid("return_id").notNull().references(() => returns.id),
  orderItemId: uuid("order_item_id").notNull().references(() => orderItems.id),
  quantity: integer("quantity").notNull(),
  reason: text("reason"),
  condition: text("condition"),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const returnsRelations = relations(returns, ({ one, many }) => ({
  store: one(stores, { fields: [returns.storeId], references: [stores.id] }),
  order: one(orders, { fields: [returns.orderId], references: [orders.id] }),
  customer: one(customers, { fields: [returns.customerId], references: [customers.id] }),
  items: many(returnItems),
}));

export const returnItemsRelations = relations(returnItems, ({ one }) => ({
  return: one(returns, { fields: [returnItems.returnId], references: [returns.id] }),
  orderItem: one(orderItems, { fields: [returnItems.orderItemId], references: [orderItems.id] }),
}));

// ─── Cookie Consent ───

export const cookieConsents = pgTable("cookie_consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  customerId: uuid("customer_id").references(() => customers.id),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  essential: boolean("essential").default(true).notNull(),
  analytics: boolean("analytics").default(false).notNull(),
  marketing: boolean("marketing").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cookieConsentsRelations = relations(cookieConsents, ({ one }) => ({
  store: one(stores, { fields: [cookieConsents.storeId], references: [stores.id] }),
  customer: one(customers, { fields: [cookieConsents.customerId], references: [customers.id] }),
}));

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  email: text("email").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
  unsubscribedAt: timestamp("unsubscribed_at"),
});

export const newsletterSubscribersRelations = relations(newsletterSubscribers, ({ one }) => ({
  store: one(stores, { fields: [newsletterSubscribers.storeId], references: [stores.id] }),
}));

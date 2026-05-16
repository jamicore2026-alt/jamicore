// Complete Database Schema for SaaS E-commerce Platform
// Using Drizzle ORM with PostgreSQL

import { pgTable, text, timestamp, uuid, integer, decimal, boolean, json, unique, relations } from "drizzle-orm/pg-core";

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
  tags: text("tags"),
  images: text("images"),
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
  isPublished: boolean("is_published").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
});

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
  images: text("images"),
  isVerified: boolean("is_verified").default(false),
  isApproved: boolean("is_approved").default(true),
  helpfulCount: integer("helpful_count").default(0),
  response: text("response"),
  respondedAt: timestamp("responded_at"),
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
});

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
  quantity: integer("quantity").notNull().default(1),
  price: decimal("price").notNull(),
  total: decimal("total").notNull(),
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

// Relations
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
  analytics: many(storeAnalytics),
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
}));

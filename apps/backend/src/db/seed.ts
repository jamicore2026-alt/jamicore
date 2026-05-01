// Comprehensive Database Seed Script
// Run with: pnpm db:seed
// Only runs in development/test - blocked in production

import 'dotenv/config';
import { db } from './index.js';
import * as schema from './schema.js';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

const SALT_ROUNDS = 12;

// Production guard
if (process.env.NODE_ENV === 'production') {
  console.error('Seed script cannot run in production environment');
  process.exit(1);
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function seed() {
  console.log('Starting database seed...\n');

  // ──────────────────────────────────────────────────────
  // 1. Super Admin
  // ──────────────────────────────────────────────────────
  console.log('1. Seeding super admins...');
  // ⚠️ WARNING: These are development-only passwords. NEVER use in production.
  const adminPassword = await hashPassword('Admin1234'); // DEV ONLY - Change in production
  const [admin] = await db.insert(schema.superAdmins).values({
    email: 'admin@saasplatform.com',
    password: adminPassword,
    name: 'Super Admin',
    isActive: true,
  }).onConflictDoUpdate({ target: schema.superAdmins.email, set: { updatedAt: new Date() } }).returning();

  // Resolve admin ID (may already exist from prior seed)
  const adminId = admin?.id || (await db.query.superAdmins.findFirst({
    where: eq(schema.superAdmins.email, 'admin@saasplatform.com'),
  }))!.id;
  console.log(`   Super admin: ${admin ? 'created' : 'already exists'}`);

  // ──────────────────────────────────────────────────────
  // 2. Merchant Plans
  // ──────────────────────────────────────────────────────
  console.log('2. Seeding merchant plans...');
  const [freePlan] = await db.insert(schema.merchantPlans).values({
    name: 'Free',
    description: 'Get started with a basic online store',
    price: '0',
    currency: 'USD',
    interval: 'month',
    features: ['Up to 10 products', 'Basic analytics', 'Email support'],
    maxProducts: 10,
    maxStorage: 100,
    isActive: true,
  }).onConflictDoUpdate({ target: schema.merchantPlans.id, set: { updatedAt: new Date() } }).returning();

  const [proPlan] = await db.insert(schema.merchantPlans).values({
    name: 'Professional',
    description: 'Everything you need to grow your business',
    price: '29.99',
    currency: 'USD',
    interval: 'month',
    features: ['Up to 500 products', 'Advanced analytics', 'Priority support', 'Custom domain', 'Discount codes'],
    maxProducts: 500,
    maxStorage: 5120,
    isActive: true,
  }).onConflictDoUpdate({ target: schema.merchantPlans.id, set: { updatedAt: new Date() } }).returning();

  const [_enterprisePlan] = await db.insert(schema.merchantPlans).values({
    name: 'Enterprise',
    description: 'Unlimited scale for serious businesses',
    price: '99.99',
    currency: 'USD',
    interval: 'month',
    features: ['Unlimited products', 'Full analytics suite', '24/7 phone support', 'Custom domain', 'Discount codes', 'API access', 'White-label'],
    maxProducts: 999999,
    maxStorage: 51200,
    isActive: true,
  }).onConflictDoUpdate({ target: schema.merchantPlans.id, set: { updatedAt: new Date() } }).returning();

  // Resolve plan IDs (may already exist from prior seed)
  const freePlanId = freePlan?.id || (await db.query.merchantPlans.findFirst({ where: eq(schema.merchantPlans.name, 'Free') }))?.id;
  const proPlanId = proPlan?.id || (await db.query.merchantPlans.findFirst({ where: eq(schema.merchantPlans.name, 'Professional') }))?.id;
  console.log('   Plans seeded');

  // ──────────────────────────────────────────────────────
  // 3. Stores
  // ──────────────────────────────────────────────────────
  console.log('3. Seeding stores...');
  const [store1] = await db.insert(schema.stores).values({
    name: 'TechGear Pro',
    domain: 'techgear',
    status: 'active',
    isApproved: true,
    approvedAt: new Date(),
    approvedBy: adminId,
    planId: proPlanId || null,
    planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    ownerEmail: 'owner@techgear.com',
    ownerName: 'Ahmed Hassan',
    ownerPhone: '+966501234567',
    primaryColor: '#0ea5e9',
    secondaryColor: '#6366f1',
    accentColor: '#8b5cf6',
    backgroundColor: '#0f172a',
    surfaceColor: '#1e293b',
    textColor: '#f8fafc',
    textSecondaryColor: '#94a3b8',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: '12px',
    fontFamily: 'Inter, sans-serif',
    currency: 'SAR',
    language: 'en',
    heroTitle: 'Premium Tech Accessories',
    heroSubtitle: 'Discover the latest gadgets and accessories',
    heroCtaText: 'Shop Now',
    heroCtaLink: '#products',
    heroEnabled: true,
  }).onConflictDoUpdate({ target: schema.stores.domain, set: { updatedAt: new Date() } }).returning();

  const [_store2] = await db.insert(schema.stores).values({
    name: 'Fashion House',
    domain: 'fashionhouse',
    status: 'active',
    isApproved: true,
    approvedAt: new Date(),
    approvedBy: adminId,
    planId: freePlanId || null,
    ownerEmail: 'owner@fashionhouse.com',
    ownerName: 'Sara Ali',
    ownerPhone: '+966509876543',
    primaryColor: '#ec4899',
    secondaryColor: '#f472b6',
    accentColor: '#a855f7',
    currency: 'SAR',
    language: 'ar',
    heroTitle: 'أناقة بلا حدود',
    heroSubtitle: 'اكتشفي أحدث صيحات الموضة',
    heroCtaText: 'تسوقي الآن',
    heroCtaLink: '#products',
    heroEnabled: true,
  }).onConflictDoUpdate({ target: schema.stores.domain, set: { updatedAt: new Date() } }).returning();

  const [_store3] = await db.insert(schema.stores).values({
    name: 'Organic Market',
    domain: 'organicmarket',
    status: 'pending',
    isApproved: false,
    ownerEmail: 'owner@organicmarket.com',
    ownerName: 'Khalid Omar',
    primaryColor: '#22c55e',
    secondaryColor: '#16a34a',
    accentColor: '#84cc16',
    currency: 'USD',
    language: 'en',
    heroTitle: 'Fresh & Organic',
    heroSubtitle: 'Locally sourced organic produce delivered to your door',
  }).onConflictDoUpdate({ target: schema.stores.domain, set: { updatedAt: new Date() } }).returning();
  console.log('   Stores seeded');

  // Resolve store ID (may already exist from prior seed/testing)
  let activeStoreId = store1?.id;
  if (!activeStoreId) {
    console.log('   Store already exists, looking up...');
    const existingStore = await db.query.stores.findFirst({
      where: eq(schema.stores.domain, 'techgear'),
    });
    if (!existingStore) {
      console.error('   ERROR: Could not find store for seeding');
      process.exit(1);
    }
    activeStoreId = existingStore.id;
  }

  // ──────────────────────────────────────────────────────
  // 4. Merchant Users
  // ──────────────────────────────────────────────────────
  console.log('4. Seeding merchant users...');
  // ⚠️ WARNING: These are development-only passwords. NEVER use in production.
  const userPassword = await hashPassword('Merchant1234'); // DEV ONLY - Change in production
  const [ownerUser] = await db.insert(schema.users).values({
    email: 'owner@techgear.com',
    password: userPassword,
    role: 'OWNER',
    storeId: activeStoreId,
  }).onConflictDoUpdate({ target: schema.users.email, set: { updatedAt: new Date() } }).returning();

  const [staffUser] = await db.insert(schema.users).values({
    email: 'staff@techgear.com',
    password: userPassword,
    role: 'STAFF',
    storeId: activeStoreId,
  }).onConflictDoUpdate({ target: schema.users.email, set: { updatedAt: new Date() } }).returning();
  console.log(`   Merchant users: ${ownerUser ? 'owner created' : 'exists'}, ${staffUser ? 'staff created' : 'exists'}`);

  // ──────────────────────────────────────────────────────
  // 5. Categories + Subcategories
  // ──────────────────────────────────────────────────────
  console.log('5. Seeding categories...');
  const [catPhones] = await db.insert(schema.categories).values({
    storeId: activeStoreId,
    nameEn: 'Phones & Accessories',
    nameAr: 'هواتف وملحقات',
  }).onConflictDoUpdate({ target: schema.categories.id, set: { updatedAt: new Date() } }).returning();

  const [catAudio] = await db.insert(schema.categories).values({
    storeId: activeStoreId,
    nameEn: 'Audio',
    nameAr: 'صوتيات',
  }).onConflictDoUpdate({ target: schema.categories.id, set: { updatedAt: new Date() } }).returning();

  const [catWearables] = await db.insert(schema.categories).values({
    storeId: activeStoreId,
    nameEn: 'Wearables',
    nameAr: 'ساعات ذكية',
  }).onConflictDoUpdate({ target: schema.categories.id, set: { updatedAt: new Date() } }).returning();

  // Subcategories
  const [subCases] = await db.insert(schema.subcategories).values({
    categoryId: catPhones?.id || '00000000-0000-0000-0000-000000000000',
    storeId: activeStoreId,
    nameEn: 'Cases',
    nameAr: 'حقائب',
  }).onConflictDoUpdate({ target: schema.subcategories.id, set: { updatedAt: new Date() } }).returning();

  const [_subChargers] = await db.insert(schema.subcategories).values({
    categoryId: catPhones?.id || '00000000-0000-0000-0000-000000000000',
    storeId: activeStoreId,
    nameEn: 'Chargers',
    nameAr: 'شواحن',
  }).onConflictDoUpdate({ target: schema.subcategories.id, set: { updatedAt: new Date() } }).returning();

  const [_subHeadphones] = await db.insert(schema.subcategories).values({
    categoryId: catAudio?.id || '00000000-0000-0000-0000-000000000000',
    storeId: activeStoreId,
    nameEn: 'Headphones',
    nameAr: 'سماعات',
  }).onConflictDoUpdate({ target: schema.subcategories.id, set: { updatedAt: new Date() } }).returning();
  console.log('   Categories & subcategories seeded');

  // Resolve category IDs for products (in case they already existed)
  const phoneCatId = catPhones?.id || (await db.query.categories.findFirst({ where: eq(schema.categories.nameEn, 'Phones & Accessories') }))?.id;
  const audioCatId = catAudio?.id || (await db.query.categories.findFirst({ where: eq(schema.categories.nameEn, 'Audio') }))?.id;
  const wearablesCatId = catWearables?.id || (await db.query.categories.findFirst({ where: eq(schema.categories.nameEn, 'Wearables') }))?.id;
  const subCasesId = subCases?.id || (await db.query.subcategories.findFirst({ where: eq(schema.subcategories.nameEn, 'Cases') }))?.id;

  // ──────────────────────────────────────────────────────
  // 6. Products
  // ──────────────────────────────────────────────────────
  console.log('6. Seeding products...');
  const productData = [
    {
      storeId: activeStoreId,
      categoryId: phoneCatId!,
      subcategoryId: subCasesId,
      titleEn: 'Premium Silicone Case',
      titleAr: 'كفر سيليكون فاخر',
      descriptionEn: 'Ultra-slim protective case with premium finish',
      descriptionAr: 'كفر حماية رفيع جداً بلمسة فاخرة',
      salePrice: '29.99',
      purchasePrice: '12.00',
      currentQuantity: 150,
      isPublished: true,
      sortOrder: 1,
    },
    {
      storeId: activeStoreId,
      categoryId: phoneCatId!,
      titleEn: 'Fast Wireless Charger',
      titleAr: 'شاحن لاسلكي سريع',
      descriptionEn: '15W fast wireless charging pad',
      descriptionAr: 'قاعدة شحن لاسلكي سريع 15 واط',
      salePrice: '49.99',
      purchasePrice: '22.00',
      currentQuantity: 80,
      isPublished: true,
      sortOrder: 2,
    },
    {
      storeId: activeStoreId,
      categoryId: audioCatId!,
      titleEn: 'Noise Cancelling Headphones',
      titleAr: 'سماعات عازلة للضوضاء',
      descriptionEn: 'Premium over-ear headphones with active noise cancellation',
      descriptionAr: 'سماعات أذن فاخرة مع إلغاء الضوضاء النشط',
      salePrice: '199.99',
      purchasePrice: '85.00',
      currentQuantity: 45,
      isPublished: true,
      sortOrder: 3,
    },
    {
      storeId: activeStoreId,
      categoryId: audioCatId!,
      titleEn: 'Wireless Earbuds Pro',
      titleAr: 'سماعات أذن لاسلكية برو',
      descriptionEn: 'True wireless earbuds with spatial audio',
      descriptionAr: 'سماعات أذن لاسلكية حقيقية مع صوت مكاني',
      salePrice: '129.99',
      purchasePrice: '55.00',
      currentQuantity: 200,
      isPublished: true,
      sortOrder: 4,
    },
    {
      storeId: activeStoreId,
      categoryId: wearablesCatId!,
      titleEn: 'Smart Watch Ultra',
      titleAr: 'ساعة ذكية ألترا',
      descriptionEn: 'Advanced fitness tracking and smart notifications',
      descriptionAr: 'تتبع لياقة متقدم وإشعات ذكية',
      salePrice: '349.99',
      purchasePrice: '150.00',
      currentQuantity: 30,
      isPublished: true,
      sortOrder: 5,
    },
    {
      storeId: activeStoreId,
      categoryId: phoneCatId!,
      titleEn: 'USB-C Cable Bundle',
      titleAr: 'حزمة كابلات USB-C',
      descriptionEn: '3-pack of premium braided USB-C cables',
      descriptionAr: 'حزمة من 3 كابلات USB-C مضفرة',
      salePrice: '19.99',
      purchasePrice: '5.00',
      currentQuantity: 500,
      isPublished: true,
      sortOrder: 6,
    },
    {
      storeId: activeStoreId,
      categoryId: wearablesCatId!,
      titleEn: 'Fitness Band Lite',
      titleAr: 'سوار لياقة لايت',
      descriptionEn: 'Lightweight fitness tracker with heart rate monitoring',
      descriptionAr: 'متتبع لياقة خفيف مع مراقبة معدل الضربات',
      salePrice: '59.99',
      purchasePrice: '20.00',
      currentQuantity: 120,
      isPublished: true,
      sortOrder: 7,
    },
    {
      storeId: activeStoreId,
      categoryId: audioCatId!,
      titleEn: 'Portable Bluetooth Speaker',
      titleAr: 'سبيكر بلوتوث محمول',
      descriptionEn: 'Waterproof portable speaker with 20h battery',
      descriptionAr: 'سبيكر محمول مقاوم للماء مع بطارية 20 ساعة',
      salePrice: '79.99',
      purchasePrice: '30.00',
      currentQuantity: 65,
      isPublished: false, // draft product
      sortOrder: 8,
    },
  ].filter(p => p.categoryId); // only insert if category exists

  const insertedProducts = await db.insert(schema.products).values(productData).onConflictDoUpdate({ target: schema.products.id, set: { updatedAt: new Date() } }).returning();
  console.log(`   Products: ${insertedProducts.length} created`);

  // ──────────────────────────────────────────────────────
  // 7. Product Variants + Options
  // ──────────────────────────────────────────────────────
  console.log('7. Seeding product variants...');
  // Add variants for headphones (color options)
  if (insertedProducts.length > 2 && insertedProducts[2]?.id) {
    const headphonesId = insertedProducts[2].id;
    const [colorVariant] = await db.insert(schema.productVariants).values({
      storeId: activeStoreId,
      productId: headphonesId,
      nameEn: 'Color',
      nameAr: 'لون',
      sortOrder: 1,
    }).onConflictDoUpdate({ target: schema.productVariants.id, set: { updatedAt: new Date() } }).returning();

    if (colorVariant) {
      await db.insert(schema.productVariantOptions).values([
        {
          variantId: colorVariant.id,
          storeId: activeStoreId,
          nameEn: 'Midnight Black',
          nameAr: 'أسود منتصف الليل',
          priceAdjustment: '0',
          sortOrder: 1,
        },
        {
          variantId: colorVariant.id,
          storeId: activeStoreId,
          nameEn: 'Silver',
          nameAr: 'فضي',
          priceAdjustment: '10.00',
          sortOrder: 2,
        },
        {
          variantId: colorVariant.id,
          storeId: activeStoreId,
          nameEn: 'Navy Blue',
          nameAr: 'أزرق بحري',
          priceAdjustment: '10.00',
          sortOrder: 3,
        },
      ]);
    }
  }
  console.log('   Variants seeded');

  // ──────────────────────────────────────────────────────
  // 8. Modifier Groups + Options
  // ──────────────────────────────────────────────────────
  console.log('8. Seeding modifier groups...');
  // Add warranty modifier for electronics
  if (insertedProducts.length > 2 && insertedProducts[2]?.id) {
    const headphonesId = insertedProducts[2].id;
    const [warrantyGroup] = await db.insert(schema.modifierGroups).values({
      storeId: activeStoreId,
      productId: headphonesId,
      name: 'Extended Warranty',
      nameAr: 'ضمان ممتد',
      isRequired: false,
      minSelections: 0,
      maxSelections: 1,
      sortOrder: 1,
    }).onConflictDoUpdate({ target: schema.modifierGroups.id, set: { updatedAt: new Date() } }).returning();

    if (warrantyGroup) {
      await db.insert(schema.modifierOptions).values([
        {
          modifierGroupId: warrantyGroup.id,
          storeId: activeStoreId,
          nameEn: '1 Year Warranty',
          nameAr: 'ضمان سنة',
          priceAdjustment: '15.00',
          sortOrder: 1,
        },
        {
          modifierGroupId: warrantyGroup.id,
          storeId: activeStoreId,
          nameEn: '2 Year Warranty',
          nameAr: 'ضمان سنتين',
          priceAdjustment: '25.00',
          sortOrder: 2,
        },
      ]);
    }
  }
  console.log('   Modifier groups seeded');

  // ──────────────────────────────────────────────────────
  // 9. Customers
  // ──────────────────────────────────────────────────────
  console.log('9. Seeding customers...');
  // ⚠️ WARNING: These are development-only passwords. NEVER use in production.
  const customerPassword = await hashPassword('Customer1234'); // DEV ONLY - Change in production
  const customerData = [
    {
      storeId: activeStoreId,
      email: 'john@example.com',
      password: customerPassword,
      firstName: 'John',
      lastName: 'Doe',
      phone: '+966501111111',
      isVerified: true,
    },
    {
      storeId: activeStoreId,
      email: 'fatima@example.com',
      password: customerPassword,
      firstName: 'Fatima',
      lastName: 'Ahmed',
      phone: '+966502222222',
      isVerified: true,
    },
    {
      storeId: activeStoreId,
      email: 'mohammed@example.com',
      password: customerPassword,
      firstName: 'Mohammed',
      lastName: 'Khan',
      isVerified: false,
    },
  ];

  const insertedCustomers = await db.insert(schema.customers).values(customerData).onConflictDoUpdate({ target: [schema.customers.email, schema.customers.storeId], set: { updatedAt: new Date() } }).returning();
  console.log(`   Customers: ${insertedCustomers.length} created`);

  // Resolve customer IDs for orders
  const customer1Id = insertedCustomers[0]?.id || (await db.query.customers.findFirst({ where: eq(schema.customers.email, 'john@example.com') }))?.id;
  const customer2Id = insertedCustomers[1]?.id || (await db.query.customers.findFirst({ where: eq(schema.customers.email, 'fatima@example.com') }))?.id;

  // ──────────────────────────────────────────────────────
  // 10. Customer Addresses
  // ──────────────────────────────────────────────────────
  console.log('10. Seeding customer addresses...');
  if (customer1Id) {
    await db.insert(schema.customerAddresses).values([
      {
        customerId: customer1Id,
        storeId: activeStoreId,
        name: 'Home',
        firstName: 'John',
        lastName: 'Doe',
        addressLine1: '123 King Fahd Road',
        addressLine2: 'Apt 4B',
        city: 'Riyadh',
        state: 'Riyadh Province',
        country: 'Saudi Arabia',
        postalCode: '12211',
        phone: '+966501111111',
        isDefault: true,
      },
      {
        customerId: customer1Id,
        storeId: activeStoreId,
        name: 'Office',
        firstName: 'John',
        lastName: 'Doe',
        addressLine1: '456 Olaya Street',
        city: 'Riyadh',
        state: 'Riyadh Province',
        country: 'Saudi Arabia',
        postalCode: '12241',
        isDefault: false,
      },
    ]).onConflictDoUpdate({ target: schema.customerAddresses.id, set: { updatedAt: new Date() } }).returning();
  }
  console.log('   Customer addresses seeded');

  // ──────────────────────────────────────────────────────
  // 11. Orders
  // ──────────────────────────────────────────────────────
  console.log('11. Seeding orders...');
  const ordersData = [];
  if (customer1Id && insertedProducts.length >= 3) {
    ordersData.push({
      storeId: activeStoreId,
      customerId: customer1Id,
      orderNumber: 'ORD-001',
      status: 'delivered',
      paymentStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      email: 'john@example.com',
      phone: '+966501111111',
      currency: 'SAR',
      subtotal: '229.98',
      tax: '34.50',
      shipping: '15.00',
      total: '279.48',
      billingFirstName: 'John',
      billingLastName: 'Doe',
      billingAddressLine1: '123 King Fahd Road',
      billingCity: 'Riyadh',
      billingCountry: 'Saudi Arabia',
      billingPostalCode: '12211',
      shippingFirstName: 'John',
      shippingLastName: 'Doe',
      shippingAddressLine1: '123 King Fahd Road',
      shippingCity: 'Riyadh',
      shippingCountry: 'Saudi Arabia',
      shippingPostalCode: '12211',
    });
  }

  if (customer2Id && insertedProducts.length >= 4) {
    ordersData.push({
      storeId: activeStoreId,
      customerId: customer2Id,
      orderNumber: 'ORD-002',
      status: 'processing',
      paymentStatus: 'paid',
      fulfillmentStatus: 'partial',
      email: 'fatima@example.com',
      currency: 'SAR',
      subtotal: '129.99',
      tax: '19.50',
      total: '149.49',
      billingFirstName: 'Fatima',
      billingLastName: 'Ahmed',
      billingAddressLine1: '789 Prince Sultan Road',
      billingCity: 'Jeddah',
      billingCountry: 'Saudi Arabia',
      billingPostalCode: '23311',
      shippingFirstName: 'Fatima',
      shippingLastName: 'Ahmed',
      shippingAddressLine1: '789 Prince Sultan Road',
      shippingCity: 'Jeddah',
      shippingCountry: 'Saudi Arabia',
      shippingPostalCode: '23311',
    });
  }

  if (customer1Id && insertedProducts.length >= 6) {
    ordersData.push({
      storeId: activeStoreId,
      customerId: customer1Id,
      orderNumber: 'ORD-003',
      status: 'pending',
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      email: 'john@example.com',
      currency: 'SAR',
      subtotal: '49.99',
      tax: '7.50',
      total: '57.49',
      billingFirstName: 'John',
      billingLastName: 'Doe',
      billingAddressLine1: '123 King Fahd Road',
      billingCity: 'Riyadh',
      billingCountry: 'Saudi Arabia',
      billingPostalCode: '12211',
      shippingFirstName: 'John',
      shippingLastName: 'Doe',
      shippingAddressLine1: '123 King Fahd Road',
      shippingCity: 'Riyadh',
      shippingCountry: 'Saudi Arabia',
      shippingPostalCode: '12211',
    });
  }

  const insertedOrders = ordersData.length > 0
    ? await db.insert(schema.orders).values(ordersData).onConflictDoUpdate({ target: schema.orders.orderNumber, set: { updatedAt: new Date() } }).returning()
    : [];
  console.log(`   Orders: ${insertedOrders.length} created`);

  // ──────────────────────────────────────────────────────
  // 12. Order Items
  // ──────────────────────────────────────────────
  console.log('12. Seeding order items...');
  const orderItemsData = [];
  if (insertedOrders.length > 0 && insertedProducts.length >= 4) {
    // Order 1: 2 items
    orderItemsData.push({
      orderId: insertedOrders[0].id,
      storeId: activeStoreId,
      productId: insertedProducts[0]?.id,
      productTitle: 'Premium Silicone Case',
      quantity: 2,
      price: '29.99',
      total: '59.98',
    });
    orderItemsData.push({
      orderId: insertedOrders[0].id,
      storeId: activeStoreId,
      productId: insertedProducts[2]?.id,
      productTitle: 'Noise Cancelling Headphones',
      quantity: 1,
      price: '199.99',
      total: '199.99',
    });

    // Order 2: 1 item
    if (insertedOrders.length > 1) {
      orderItemsData.push({
        orderId: insertedOrders[1].id,
        storeId: activeStoreId,
        productId: insertedProducts[3]?.id,
        productTitle: 'Wireless Earbuds Pro',
        quantity: 1,
        price: '129.99',
        total: '129.99',
      });
    }

    // Order 3: 1 item
    if (insertedOrders.length > 2) {
      orderItemsData.push({
        orderId: insertedOrders[2].id,
        storeId: activeStoreId,
        productId: insertedProducts[1]?.id,
        productTitle: 'Fast Wireless Charger',
        quantity: 1,
        price: '49.99',
        total: '49.99',
      });
    }
  }

  if (orderItemsData.length > 0) {
    await db.insert(schema.orderItems).values(orderItemsData).onConflictDoUpdate({ target: schema.orderItems.id, set: { createdAt: new Date() } });
  }
  console.log('   Order items seeded');

  // ──────────────────────────────────────────────────────
  // 13. Coupons
  // ──────────────────────────────────────────────────────
  console.log('13. Seeding coupons...');
  await db.insert(schema.coupons).values([
    {
      storeId: activeStoreId,
      code: 'WELCOME10',
      description: '10% off your first order',
      type: 'percent',
      value: '10',
      minOrderAmount: '50',
      maxDiscountAmount: '25',
      usageLimit: 100,
      usageLimitPerCustomer: 1,
      isActive: true,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      appliesTo: 'all',
    },
    {
      storeId: activeStoreId,
      code: 'FLAT20',
      description: '$20 off orders over $100',
      type: 'fixed',
      value: '20',
      minOrderAmount: '100',
      usageLimit: 50,
      usageLimitPerCustomer: 1,
      isActive: true,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      appliesTo: 'all',
    },
    {
      storeId: activeStoreId,
      code: 'FREESHIP',
      description: 'Free shipping on all orders',
      type: 'fixed',
      value: '0',
      freeShipping: true,
      usageLimit: 200,
      usageLimitPerCustomer: 2,
      isActive: true,
      startsAt: new Date(),
      appliesTo: 'all',
    },
  ]).onConflictDoUpdate({ target: [schema.coupons.storeId, schema.coupons.code], set: { updatedAt: new Date() } });
  console.log('   Coupons seeded');

  // ──────────────────────────────────────────────────────
  // 14. Reviews
  // ──────────────────────────────────────────────────────
  console.log('14. Seeding reviews...');
  if (customer1Id && insertedProducts.length >= 3 && insertedOrders.length >= 1) {
    await db.insert(schema.reviews).values([
      {
        storeId: activeStoreId,
        productId: insertedProducts[2].id,
        customerId: customer1Id,
        orderId: insertedOrders[0].id,
        rating: 5,
        title: 'Best headphones ever!',
        content: 'These noise cancelling headphones are incredible. The sound quality is amazing and the ANC works perfectly.',
        isVerified: true,
        isApproved: true,
      },
      {
        storeId: activeStoreId,
        productId: insertedProducts[0].id,
        customerId: customer1Id,
        orderId: insertedOrders[0].id,
        rating: 4,
        title: 'Great case',
        content: 'Fits perfectly and feels premium. Only wish it came in more colors.',
        isVerified: true,
        isApproved: true,
      },
    ]).onConflictDoUpdate({ target: schema.reviews.id, set: { updatedAt: new Date() } });
  }
  console.log('   Reviews seeded');

  // ──────────────────────────────────────────────────────
  // 15. Store Analytics (last 7 days)
  // ──────────────────────────────────────────────────────
  console.log('15. Seeding store analytics...');
  const analyticsData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    analyticsData.push({
      storeId: activeStoreId,
      date,
      visitors: 150 + Math.floor(Math.random() * 100),
      pageViews: 500 + Math.floor(Math.random() * 300),
      orders: 5 + Math.floor(Math.random() * 15),
      revenue: (1200 + Math.floor(Math.random() * 800)).toString(),
      averageOrderValue: (85 + Math.floor(Math.random() * 30)).toString(),
      conversionRate: (2.5 + Math.random() * 2).toFixed(2),
      productsViewed: 200 + Math.floor(Math.random() * 100),
      addToCarts: 30 + Math.floor(Math.random() * 20),
      checkoutsStarted: 15 + Math.floor(Math.random() * 10),
      checkoutsCompleted: 8 + Math.floor(Math.random() * 7),
    });
  }
  await db.insert(schema.storeAnalytics).values(analyticsData).onConflictDoUpdate({ target: schema.storeAnalytics.id, set: { updatedAt: new Date() } });
  console.log('   Analytics seeded');

  // ──────────────────────────────────────────────────────
  // 16. Email Templates
  // ──────────────────────────────────────────────────────
  console.log('16. Seeding email templates...');
  await db.insert(schema.emailTemplates).values([
    {
      storeId: activeStoreId,
      name: 'order_confirmation',
      subject: 'Order Confirmed - {{orderNumber}}',
      bodyHtml: '<h1>Thank you for your order!</h1><p>Order {{orderNumber}} has been confirmed.</p>',
      bodyText: 'Thank you for your order! Order {{orderNumber}} has been confirmed.',
      isActive: true,
    },
    {
      storeId: activeStoreId,
      name: 'order_shipped',
      subject: 'Your Order Has Shipped - {{orderNumber}}',
      bodyHtml: '<h1>Your order is on the way!</h1><p>Order {{orderNumber}} has been shipped.</p>',
      bodyText: 'Your order is on the way! Order {{orderNumber}} has been shipped.',
      isActive: true,
    },
    {
      storeId: activeStoreId,
      name: 'welcome',
      subject: 'Welcome to {{storeName}}!',
      bodyHtml: '<h1>Welcome!</h1><p>Thanks for joining {{storeName}}.</p>',
      bodyText: 'Welcome! Thanks for joining {{storeName}}.',
      isActive: true,
    },
  ]).onConflictDoUpdate({ target: schema.emailTemplates.id, set: { updatedAt: new Date() } });
  console.log('   Email templates seeded');

  // ──────────────────────────────────────────────────────
  // Update store counters
  // ──────────────────────────────────────────────────────
  console.log('\nUpdating store counters...');
  await db.update(schema.stores).set({
    totalOrders: insertedOrders.length,
    totalRevenue: insertedOrders.reduce((sum, o) => sum + parseFloat(o.total), 0).toFixed(2),
    totalCustomers: insertedCustomers.length,
  }).where(eq(schema.stores.id, activeStoreId));

  console.log('\n========================================');
  console.log('  Seed completed successfully!');
  console.log('========================================');
  console.log('\nTest Accounts (see .env.example or seed.ts source for credentials):');
  console.log('  Super Admin:  admin@saasplatform.com');
  console.log('  Store Owner:  owner@techgear.com');
  console.log('  Store Staff:  staff@techgear.com');
  console.log('  Customer:     john@example.com');
  console.log('  Customer:     fatima@example.com');
  console.log('\nStore: TechGear Pro (domain: techgear)');
  console.log('Store: Fashion House (domain: fashionhouse)');
  console.log('Store: Organic Market (domain: organicmarket) - PENDING');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
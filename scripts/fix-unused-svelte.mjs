// Auto-fix common unused locals in Svelte files based on svelte-check patterns
import { readFileSync, writeFileSync } from 'node:fs';

const fixes = [
  // Section components: remove sectionConfig prop
  {
    files: [
      'apps/storefront/src/lib/components/sections/HeroSection.svelte',
      'apps/storefront/src/lib/components/sections/EditorialHero.svelte',
      'apps/storefront/src/lib/components/sections/FeaturedProductsSection.svelte',
      'apps/storefront/src/lib/components/sections/NewArrivalsSection.svelte',
      'apps/storefront/src/lib/components/sections/PopularSection.svelte',
      'apps/storefront/src/lib/components/sections/CategoryGrid.svelte',
      'apps/storefront/src/lib/components/sections/OfferBannerSection.svelte',
      'apps/storefront/src/lib/components/sections/BrandTrustSection.svelte',
      'apps/storefront/src/lib/components/sections/TestimonialsSection.svelte',
    ],
    removeFromInterface: /\s+sectionConfig\?\?: Record<string, unknown>;\n/,
    removeFromDestructuring: /,\s*sectionConfig\b/,
  },
  // LookbookCard: remove showAddToCart and showDiscountBadge props
  {
    files: ['apps/storefront/src/lib/components/product/LookbookCard.svelte'],
    removeFromInterface: /\s+showAddToCart\?\?: boolean;\n\s+showDiscountBadge\?\?: boolean;\n/,
    removeFromDestructuring: /,\s*showAddToCart = false,\s*showDiscountBadge = false/,
  },
  // SpecCard: remove showAddToCart prop
  {
    files: ['apps/storefront/src/lib/components/product/SpecCard.svelte'],
    removeFromInterface: /\s+showAddToCart\?\?: boolean;\n/,
    removeFromDestructuring: /,\s*showAddToCart = false/,
  },
  // cart.svelte.ts: remove CartItem import
  {
    files: ['apps/storefront/src/lib/stores/cart.svelte.ts'],
    removeImport: /import type \{ CartItem \} from '@repo\/shared-types';\n/,
  },
  // StoreFooter: remove socialLinks
  {
    files: ['apps/storefront/src/lib/components/layout/StoreFooter.svelte'],
    removeVar: /\s+let socialLinks = [\s\S]*?];\n/,
  },
  // StoreHeader: remove Clock import
  {
    files: ['apps/storefront/src/lib/components/layout/StoreHeader.svelte'],
    removeImportName: /,\s*Clock/,
  },
  // GenericSection: remove unused index i in each
  {
    files: ['apps/storefront/src/lib/components/sections/GenericSection.svelte'],
    removeFromEach: /,\s*i/,
  },
  // account/+page.svelte: remove data
  {
    files: ['apps/storefront/src/routes/(customer)/account/+page.svelte'],
    removeDestructured: /\s+data/,
  },
  // account/orders/[id]/+page.svelte: remove Button import
  {
    files: ['apps/storefront/src/routes/(customer)/account/orders/[id]/+page.svelte'],
    removeImportName: /\s+Button/,
  },
  // account/reviews/+page.svelte: remove Pencil import
  {
    files: ['apps/storefront/src/routes/(customer)/account/reviews/+page.svelte'],
    removeImportName: /,\s*Pencil/,
  },
  // cart/+page.svelte: remove goto import
  {
    files: ['apps/storefront/src/routes/cart/+page.svelte'],
    removeImportName: /\s+goto/,
  },
  // checkout/+layout.svelte: remove data
  {
    files: ['apps/storefront/src/routes/checkout/+layout.svelte'],
    removeDestructured: /\s+data/,
  },
  // checkout/confirm/+page.svelte: remove razorpayModalOpen
  {
    files: ['apps/storefront/src/routes/checkout/confirm/+page.svelte'],
    removeVar: /\s+let razorpayModalOpen = \$state\(false\);\n/,
  },
  // checkout/payment/+page.svelte: remove calculatingTax, paymentLoading, shippingState
  {
    files: ['apps/storefront/src/routes/checkout/payment/+page.svelte'],
    removePatterns: [
      /\s+let calculatingTax = \$state\(false\);\n/,
      /\s+let paymentLoading = \$state\(false\);\n/,
      new RegExp("\\s+let shippingState = \\$state\\(''\\);\\n"),
    ],
  },
  // OfferBannerSection: remove cn import
  {
    files: ['apps/storefront/src/lib/components/sections/OfferBannerSection.svelte'],
    removeImport: /import \{ cn \} from '\$lib\/utils';\n/,
  },
  // BrandTrustSection: remove cn import
  {
    files: ['apps/storefront/src/lib/components/sections/BrandTrustSection.svelte'],
    removeImport: /import \{ cn \} from '\$lib\/utils';\n/,
  },
  // TestimonialsSection: remove cn import
  {
    files: ['apps/storefront/src/lib/components/sections/TestimonialsSection.svelte'],
    removeImport: /import \{ cn \} from '\$lib\/utils';\n/,
  },
];

for (const fix of fixes) {
  for (const file of fix.files) {
    try {
      let content = readFileSync(file, 'utf-8');
      let changed = false;

      if (fix.removeFromInterface) {
        const next = content.replace(fix.removeFromInterface, '\n');
        if (next !== content) { content = next; changed = true; }
      }
      if (fix.removeFromDestructuring) {
        const next = content.replace(fix.removeFromDestructuring, '');
        if (next !== content) { content = next; changed = true; }
      }
      if (fix.removeImport) {
        const next = content.replace(fix.removeImport, '');
        if (next !== content) { content = next; changed = true; }
      }
      if (fix.removeImportName) {
        const next = content.replace(fix.removeImportName, '');
        if (next !== content) { content = next; changed = true; }
      }
      if (fix.removeVar) {
        const next = content.replace(fix.removeVar, '');
        if (next !== content) { content = next; changed = true; }
      }
      if (fix.removeFromEach) {
        const next = content.replace(fix.removeFromEach, '');
        if (next !== content) { content = next; changed = true; }
      }
      if (fix.removeDestructured) {
        const next = content.replace(fix.removeDestructured, '');
        if (next !== content) { content = next; changed = true; }
      }
      if (fix.removePatterns) {
        for (const pattern of fix.removePatterns) {
          const next = content.replace(pattern, '');
          if (next !== content) { content = next; changed = true; }
        }
      }

      if (changed) {
        writeFileSync(file, content);
        console.log(`Fixed ${file}`);
      }
    } catch (err) {
      console.error(`Failed ${file}: ${err.message}`);
    }
  }
}

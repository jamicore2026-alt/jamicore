import { db } from '../../db/index.js';
import { products, stores } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export const seoService = {
  async getProductJsonLd(storeId: string, productId: string) {
    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    const [store] = await db.select({ domain: stores.domain, currency: stores.currency }).from(stores).where(eq(stores.id, storeId)).limit(1);
    if (!product || !store) return null;

    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.titleEn ?? '',
      image: product.images?.[0] ?? '',
      description: product.descriptionEn ?? '',
      sku: product.barcode ?? product.id,
      offers: {
        '@type': 'Offer',
        url: `https://${store.domain}/products/${product.id}`,
        priceCurrency: store.currency ?? 'USD',
        price: product.salePrice ?? '0',
        availability: product.currentQuantity && product.currentQuantity > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      },
    };
  },
};

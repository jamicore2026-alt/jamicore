// Unit tests for sanitizePublicCart — strips merchant-internal fields from public
// cart responses, including the nested product relation (which carries purchasePrice
// = merchant cost, same leak class as the product public route).
import { describe, it, expect } from 'vitest';
import { sanitizePublicCart } from './cart.service.js';

const fullCart = {
  id: 'cart-1',
  storeId: 'store-1', // tenant id — must NOT leak
  sessionId: 'sess-1', // internal session — must NOT leak
  customerId: 'cust-1', // customer linkage — must NOT leak
  subtotal: '19.98',
  total: '19.98',
  itemCount: 2,
  expiresAt: new Date(),
  items: [
    {
      id: 'item-1',
      cartId: 'cart-1',
      storeId: 'store-1', // internal — must NOT leak
      productId: 'prod-1',
      quantity: 2,
      price: '9.99',
      total: '19.98',
      product: {
        id: 'prod-1',
        storeId: 'store-1',
        titleEn: 'Widget',
        salePrice: '9.99',
        purchasePrice: '4.50', // merchant cost — must NOT leak
        inventoryAlertThreshold: 5, // merchant ops — must NOT leak
        deletedAt: null,
        isPublished: true,
      },
      bundle: {
        id: 'bundle-1',
        storeId: 'store-1',
        price: '15.00',
        items: [
          {
            id: 'bi-1',
            storeId: 'store-1',
            productId: 'prod-2',
            product: {
              id: 'prod-2',
              storeId: 'store-1',
              salePrice: '10.00',
              purchasePrice: '5.00', // merchant cost — must NOT leak
              titleEn: 'BundleProd',
              isPublished: true,
            },
          },
        ],
      },
    },
  ],
} as any;

describe('sanitizePublicCart', () => {
  it('strips storeId, sessionId, customerId from the cart top level', () => {
    const out = sanitizePublicCart(fullCart) as any;
    expect(out).not.toHaveProperty('storeId');
    expect(out).not.toHaveProperty('sessionId');
    expect(out).not.toHaveProperty('customerId');
  });

  it('keeps public cart fields (totals, itemCount, items)', () => {
    const out = sanitizePublicCart(fullCart) as any;
    expect(out).toHaveProperty('id', 'cart-1');
    expect(out).toHaveProperty('subtotal', '19.98');
    expect(out).toHaveProperty('total', '19.98');
    expect(out).toHaveProperty('itemCount', 2);
    expect(out).toHaveProperty('items');
    expect(out.items).toHaveLength(1);
  });

  it('strips storeId + purchasePrice + inventoryAlertThreshold + deletedAt from nested item.product', () => {
    const out = sanitizePublicCart(fullCart) as any;
    const product = out.items[0].product;
    expect(product).not.toHaveProperty('purchasePrice');
    expect(product).not.toHaveProperty('storeId');
    expect(product).not.toHaveProperty('inventoryAlertThreshold');
    expect(product).not.toHaveProperty('deletedAt');
    expect(product).toHaveProperty('salePrice', '9.99');
    expect(product).toHaveProperty('titleEn', 'Widget');
  });

  it('strips storeId from the cart item', () => {
    const out = sanitizePublicCart(fullCart) as any;
    expect(out.items[0]).not.toHaveProperty('storeId');
    expect(out.items[0]).toHaveProperty('productId', 'prod-1');
    expect(out.items[0]).toHaveProperty('quantity', 2);
  });

  it('strips purchasePrice from nested bundle.items[].product too', () => {
    const out = sanitizePublicCart(fullCart) as any;
    const bundleProduct = out.items[0].bundle.items[0].product;
    expect(bundleProduct).not.toHaveProperty('purchasePrice');
    expect(bundleProduct).not.toHaveProperty('storeId');
    expect(bundleProduct).toHaveProperty('salePrice', '10.00');
  });

  it('does not mutate the input', () => {
    const snapshot = JSON.parse(JSON.stringify(fullCart));
    sanitizePublicCart(fullCart);
    expect(JSON.parse(JSON.stringify(fullCart))).toEqual(snapshot);
  });

  it('handles a cart with no items array gracefully', () => {
    const out = sanitizePublicCart({ id: 'c', storeId: 's', sessionId: 'x', customerId: 'y' } as any) as any;
    expect(out).not.toHaveProperty('storeId');
    expect(out).toHaveProperty('id', 'c');
  });
});
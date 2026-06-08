import { db } from '../../db/index.js';
import { ErrorCodes } from '../../errors/codes.js';
import { posRepo } from './pos.repo.js';

function throwErr(code: string, message: string): never {
  throw Object.assign(new Error(message), { code });
}

export const posService = {
  async searchProducts(
    storeId: string,
    query: { search?: string; barcode?: string; limit: number },
  ) {
    const results = await posRepo.searchProducts(storeId, {
      search: query.search,
      barcode: query.barcode,
      limit: query.limit,
    });

    return results.map((p) => ({
      id: p.id,
      name: p.titleEn,
      price: p.salePrice,
      currentQuantity: p.currentQuantity,
      barcode: p.barcode,
      images: p.images,
      variants: (p.variants ?? []).map((v) => ({
        id: v.id,
        name: v.nameEn,
        options: (v.options ?? []).map((o) => ({
          id: o.id,
          name: o.nameEn,
          priceAdjustment: o.priceAdjustment,
          stockQuantity: o.stockQuantity,
          sku: o.sku,
          imageUrl: o.imageUrl,
        })),
      })),
    }));
  },

  async createPosOrder(
    storeId: string,
    cashierId: string,
    cashierEmail: string,
    storeCurrency: string,
    input: {
      items: Array<{
        productId: string;
        variantId?: string;
        quantity: number;
        price: number;
      }>;
      paymentMethod: 'cash' | 'card' | 'upi';
      amountTendered?: number;
      customerPhone?: string;
    },
  ) {
    return await db.transaction(async (tx) => {
      // 1. Fetch current prices from DB (IGNORE client-sent prices)
      const dbProducts = await tx.query.products.findMany({
        where: (t, { eq, and }) => and(eq(t.storeId, storeId)),
        with: {
          variants: {
            with: { options: true },
          },
        },
      });

      const productMap = new Map(dbProducts.map((p) => [p.id, p]));

      // Build variant option lookup (variantId from client maps to productVariantOptions.id)
      const variantOptionMap = new Map<
        string,
        {
          option: (typeof dbProducts)[0]['variants'][0]['options'][0];
          productTitle: string;
          variantName: string;
          productImage: string | undefined;
        }
      >();
      for (const p of dbProducts) {
        for (const v of p.variants ?? []) {
          for (const o of v.options ?? []) {
            variantOptionMap.set(o.id, {
              option: o,
              productTitle: p.titleEn,
              variantName: v.nameEn,
              productImage: (p.images?.[0]) ?? undefined,
            });
          }
        }
      }

      // 2. Validate and build line items with server prices
      const lineItems: Array<{
        productId: string;
        variantId: string | null;
        productImage: string | null;
        productTitle: string;
        variantName: string | null;
        quantity: number;
        price: number;
        total: number;
      }> = [];

      for (const item of input.items) {
        const product = productMap.get(item.productId);
        if (!product) throwErr(ErrorCodes.PRODUCT_NOT_FOUND, 'Product not found');

        if (item.variantId) {
          // variantId in POS context = productVariantOptions.id
          const voInfo = variantOptionMap.get(item.variantId);
          if (!voInfo) throwErr(ErrorCodes.VARIANT_NOT_FOUND, 'Variant option not found');

          const unitPrice =
            Number(product.salePrice) + Number(voInfo.option.priceAdjustment);
          const stockQty = voInfo.option.stockQuantity ?? 0;
          if (stockQty < item.quantity) {
            throwErr(
              ErrorCodes.INSUFFICIENT_INVENTORY,
              `Insufficient stock for ${voInfo.variantName}`,
            );
          }

          lineItems.push({
            productId: item.productId,
            variantId: item.variantId,
            productImage: voInfo.productImage ?? null,
            productTitle: voInfo.productTitle,
            variantName: voInfo.variantName,
            quantity: item.quantity,
            price: unitPrice,
            total: unitPrice * item.quantity,
          });
        } else {
          const unitPrice = Number(product.salePrice);
          if ((product.currentQuantity ?? 0) < item.quantity) {
            throwErr(
              ErrorCodes.INSUFFICIENT_INVENTORY,
              `Insufficient stock for ${product.titleEn}`,
            );
          }

          lineItems.push({
            productId: item.productId,
            variantId: null,
            productImage: (product.images?.[0]) ?? null,
            productTitle: product.titleEn,
            variantName: null,
            quantity: item.quantity,
            price: unitPrice,
            total: unitPrice * item.quantity,
          });
        }
      }

      // 3. Calculate server-side totals
      const subtotal = lineItems.reduce((sum, li) => sum + li.total, 0);
      const tax = Math.round(subtotal * 0.05); // Default 5% tax
      const total = subtotal + tax;

      // 4. Atomic inventory decrement
      for (const item of input.items) {
        await posRepo.decrementInventory(
          item.productId,
          storeId,
          item.quantity,
          item.variantId ?? null,
          tx,
        );
      }

      // 5. Create order
      const order = await posRepo.createOrder(
        {
          storeId,
          cashierId,
          customerPhone: input.customerPhone ?? null,
          email: cashierEmail,
          currency: storeCurrency,
          orderType: 'pos',
          paymentMethod: input.paymentMethod,
          items: lineItems,
          subtotal,
          tax,
          total,
          amountTendered: input.amountTendered ?? null,
          changeGiven:
            input.paymentMethod === 'cash' && input.amountTendered
              ? input.amountTendered - total
              : null,
          status: 'completed',
        },
        tx,
      );

      // 6. Return receipt data
      return {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          createdAt: order.createdAt,
          status: order.status,
          paymentMethod: input.paymentMethod,
          subtotal,
          tax,
          total,
          amountTendered: input.amountTendered ?? null,
          changeGiven:
            input.paymentMethod === 'cash' && input.amountTendered
              ? input.amountTendered - total
              : null,
        },
        items: lineItems.map((li) => ({
          name: li.productTitle + (li.variantName ? ` (${li.variantName})` : ''),
          quantity: li.quantity,
          price: li.price,
          total: li.total,
        })),
      };
    });
  },

  async listPosOrders(
    storeId: string,
    query: { date?: string; cashierId?: string; page: number; limit: number },
  ) {
    return posRepo.listPosOrders(storeId, query);
  },

  async getPosOrder(orderId: string, storeId: string) {
    const order = await posRepo.findPosOrderById(orderId, storeId);
    if (!order) throwErr(ErrorCodes.ORDER_NOT_FOUND, 'POS order not found');
    return order;
  },
};

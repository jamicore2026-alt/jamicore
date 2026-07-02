// Customer Checkout Routes - Place orders with server-side price verification
import { FastifyInstance } from 'fastify';
import { checkoutSchema } from './checkout.schema.js';
import { orderService } from '../order/order.service.js';

export default async function customerCheckoutRoutes(fastify: FastifyInstance) {
  // POST /api/v1/customer/checkout - Create an order
  fastify.post('/', {
    config: {
      rateLimit: { max: 5, timeWindow: '1 minute' },
    },
    schema: {
      tags: ['Customer Checkout'],
      summary: 'Place order',
      description: 'Create a new order with server-side price verification. Prices are computed from the database — do not send price or total fields.',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parsed = checkoutSchema.parse(request.body);

    // Compute full pricing server-side
    const pricing = await fastify.pricingService.computeOrderPricing({
      storeId: request.storeId,
      items: parsed.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        variantOptionIds: item.variantOptionIds,
        combinationKey: item.combinationKey,
        modifierOptionIds: item.modifierOptionIds,
      })),
      couponCode: parsed.couponCode,
      customerId: request.customerId,
      shippingAddress: {
        country: parsed.shippingCountry ?? '',
        state: parsed.shippingState,
        postalCode: parsed.shippingPostalCode,
      },
      shippingRateId: parsed.shippingRateId,
    });

    // Build order items from server-computed pricing.
    // pricing.items is 1:1 by index with parsed.items (computeOrderPricing pushes
    // one computed item per input item in order), so zip by index — NOT find-by-
    // productId. Two checkout lines may share a productId (same product, different
    // variants); find-by-productId would attach the FIRST matching line's modifiers
    // to every line, corrupting the second line's variant/modifier selections.
    const orderItems = pricing.items.map((item, idx) => {
      const inputItem = parsed.items[idx];
      const hasModifiers = item.variantName || inputItem.modifierOptionIds || inputItem.variantOptionIds || inputItem.combinationKey;
      return {
        productId: item.productId,
        productTitle: item.productTitle,
        productImage: item.productImage ?? undefined,
        variantName: item.variantName ?? undefined,
        variantId: item.combinationId ?? undefined,
        quantity: item.quantityRequested,
        price: item.effectivePrice,
        total: item.lineTotal,
        modifiers: hasModifiers
          ? JSON.stringify({
              variantOptionIds: inputItem.variantOptionIds,
              combinationKey: inputItem.combinationKey,
              modifierOptionIds: inputItem.modifierOptionIds,
            })
          : undefined,
      };
    });

    // Create order with verified prices
    const order = await orderService.create({
      storeId: request.storeId,
      customerId: request.customerId,
      email: parsed.email,
      phone: parsed.phone,
      currency: parsed.currency,
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      shipping: pricing.shipping,
      tax: pricing.tax,
      total: pricing.total,
      items: orderItems,
      cartId: parsed.cartId,
      billingAddress: {
        billingName: parsed.billingName,
        billingFirstName: parsed.billingFirstName,
        billingLastName: parsed.billingLastName,
        billingAddressLine1: parsed.billingAddressLine1,
        billingAddressLine2: parsed.billingAddressLine2,
        billingCity: parsed.billingCity,
        billingState: parsed.billingState,
        billingCountry: parsed.billingCountry,
        billingPostalCode: parsed.billingPostalCode,
      },
      shippingAddress: {
        shippingName: parsed.shippingName,
        shippingFirstName: parsed.shippingFirstName,
        shippingLastName: parsed.shippingLastName,
        shippingAddressLine1: parsed.shippingAddressLine1,
        shippingAddressLine2: parsed.shippingAddressLine2,
        shippingCity: parsed.shippingCity,
        shippingState: parsed.shippingState,
        shippingCountry: parsed.shippingCountry,
        shippingPostalCode: parsed.shippingPostalCode,
      },
      paymentMethod: parsed.paymentMethod,
      couponId: pricing.coupon?.id,
      couponCode: parsed.couponCode,
      notes: parsed.notes,
    });

    reply.status(201).send({ order });
  });
}
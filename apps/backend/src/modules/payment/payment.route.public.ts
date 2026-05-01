// Public Payment Routes — provider listing, webhook handlers (no auth, signature verified)
import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { payments } from '../../db/schema.js';
import { paymentService, verifyRazorpaySignature, verifyStripeSignature } from './payment.service.js';
import { ErrorCodes } from '../../errors/codes.js';

export default async function publicPaymentRoutes(fastify: FastifyInstance) {
  // GET /api/v1/public/payments/providers
  // Returns only enabled providers (no config/keys) for storefront display
  fastify.get('/providers', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: { tags: ['Public Payments'], summary: 'List enabled payment providers for storefront' },
  }, async (request, reply) => {
    if (!request.storeId) {
      reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not found' });
      return;
    }
    const providers = await paymentService.getProviders(request.storeId);
    // Return enabled providers with minimal info; expose publishable keys for wallets
    const enabled = providers
      .filter((p) => p.isEnabled)
      .map((p) => {
        const base = { provider: p.provider, isEnabled: p.isEnabled };
        if (p.provider === 'stripe' && p.config && typeof p.config === 'object' && 'publishable_key' in p.config) {
          return { ...base, publishableKey: (p.config as Record<string, string>).publishable_key };
        }
        if (p.provider === 'razorpay' && p.config && typeof p.config === 'object' && 'key_id' in p.config) {
          return { ...base, keyId: (p.config as Record<string, string>).key_id };
        }
        return base;
      });
    return { providers: enabled };
  });

  // Webhook routes are registered in an encapsulated plugin so we can attach
  // a custom content-type parser that preserves the raw body for signature verification.
  fastify.register(async function webhookRoutes(webhookFastify) {
    // Override the JSON parser for this encapsulated scope to capture rawBody
    webhookFastify.addContentTypeParser(
      'application/json',
      { parseAs: 'string' },
      function (_req, body, done) {
        _req.rawBody = body as string;
        try {
          const json = JSON.parse(body as string);
          done(null, json);
        } catch (err) {
          done(err as Error, undefined);
        }
      },
    );

    // POST /api/v1/public/payments/webhook/razorpay
    webhookFastify.post('/razorpay', {
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
      schema: { tags: ['Public Payments'], summary: 'Razorpay webhook handler' },
    }, async (request, reply) => {
      const signature = request.headers['x-razorpay-signature'] as string;
      if (!signature) {
        reply.status(400).send({ error: 'Bad Request', message: 'Missing webhook signature' });
        return;
      }

      const rawBody = request.rawBody;
      if (!rawBody) {
        reply.status(400).send({ error: 'Bad Request', message: 'Missing raw request body' });
        return;
      }

      try {
        const payload = request.body as Record<string, unknown>;

        // Resolve store from request metadata (tenant resolution hook)
        if (!request.storeId) {
          reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not resolved from request' });
          return;
        }

        // Find the payment record by Razorpay order_id from the webhook payload
        const payloadData = payload.payload as Record<string, unknown> | undefined;
        const paymentNested = payloadData?.payment as Record<string, unknown> | undefined;
        const paymentEntity = paymentNested?.entity as Record<string, unknown> | undefined;
        const orderNested = payloadData?.order as Record<string, unknown> | undefined;
        const orderEntity = orderNested?.entity as Record<string, unknown> | undefined;
        const razorpayOrderId: string | undefined =
          (paymentEntity?.order_id as string | undefined) ?? (orderEntity?.id as string | undefined);

        if (!razorpayOrderId) {
          reply.status(422).send({ error: 'Unprocessable Entity', code: ErrorCodes.VALIDATION_ERROR, message: 'Missing Razorpay order ID in payload' });
          return;
        }

        // Look up the payment filtered by providerPaymentId AND storeId for isolation
        const payment = await db.query.payments.findFirst({
          where: and(eq(payments.providerPaymentId, razorpayOrderId), eq(payments.storeId, request.storeId)),
        });

        if (!payment) {
          reply.status(404).send({ error: 'Not Found', code: ErrorCodes.ORDER_NOT_FOUND, message: 'Payment not found for Razorpay order' });
          return;
        }

        // Get provider config to verify signature using resolved store
        const providerConfig = await paymentService.findProviderByStoreId(request.storeId, 'razorpay');
        if (!providerConfig?.config) {
          reply.status(422).send({ error: 'Unprocessable Entity', code: ErrorCodes.PAYMENT_PROVIDER_NOT_ENABLED, message: 'Provider config not found' });
          return;
        }

        const config = providerConfig.config as Record<string, string>;
        if (typeof config.webhook_secret !== 'string' || config.webhook_secret.length === 0) {
          reply.status(422).send({ error: 'Unprocessable Entity', code: ErrorCodes.PAYMENT_PROVIDER_NOT_ENABLED, message: 'Webhook secret not configured' });
          return;
        }

        const isValid = verifyRazorpaySignature(rawBody, signature, config.webhook_secret);
        if (!isValid) {
          reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.VALIDATION_ERROR, message: 'Invalid webhook signature' });
          return;
        }

        const result = await paymentService.handleWebhook('razorpay', payload, signature, rawBody, request.storeId);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const code = 'code' in error ? (error as unknown as { code: string }).code : undefined;

        // Business logic / not-found errors → 4xx (do not retry)
        if (code === ErrorCodes.ORDER_NOT_FOUND || code === ErrorCodes.PAYMENT_ALREADY_PROCESSED) {
          fastify.log.warn({ err: error }, 'Razorpay webhook business logic error');
          reply.status(404).send({ error: 'Not Found', code, message: error.message });
          return;
        }
        if (code === ErrorCodes.VALIDATION_ERROR || code === ErrorCodes.PAYMENT_PROVIDER_NOT_ENABLED) {
          fastify.log.warn({ err: error }, 'Razorpay webhook validation error');
          reply.status(422).send({ error: 'Unprocessable Entity', code, message: error.message });
          return;
        }

        // Transient errors (DB, network, etc.) → 500 (trigger provider retry)
        fastify.log.error({ err: error }, 'Razorpay webhook transient error');
        reply.status(500).send({ error: 'Internal Server Error', message: 'Transient error, will retry' });
      }
    });

    // POST /api/v1/public/payments/webhook/stripe
    webhookFastify.post('/stripe', {
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
      schema: { tags: ['Public Payments'], summary: 'Stripe webhook handler' },
    }, async (request, reply) => {
      const signature = request.headers['stripe-signature'] as string;
      if (!signature) {
        reply.status(400).send({ error: 'Bad Request', message: 'Missing webhook signature' });
        return;
      }

      const rawBody = request.rawBody;
      if (!rawBody) {
        reply.status(400).send({ error: 'Bad Request', message: 'Missing raw request body' });
        return;
      }

      try {
        const payload = request.body as Record<string, unknown>;

        // Resolve store from request metadata (tenant resolution hook)
        if (!request.storeId) {
          reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not resolved from request' });
          return;
        }

        // Find the payment by Stripe PaymentIntent ID
        const dataObject = (payload.data as Record<string, unknown>)?.object as Record<string, unknown> | undefined;
        const stripePaymentIntentId = dataObject?.id as string | undefined;

        if (!stripePaymentIntentId) {
          reply.status(422).send({ error: 'Unprocessable Entity', code: ErrorCodes.VALIDATION_ERROR, message: 'Missing Stripe PaymentIntent ID in payload' });
          return;
        }

        // Look up the payment filtered by providerPaymentId AND storeId for isolation
        const payment = await db.query.payments.findFirst({
          where: and(eq(payments.providerPaymentId, stripePaymentIntentId), eq(payments.storeId, request.storeId)),
        });

        if (!payment) {
          reply.status(404).send({ error: 'Not Found', code: ErrorCodes.ORDER_NOT_FOUND, message: 'Payment not found for Stripe intent' });
          return;
        }

        // Get provider config to verify signature using resolved store
        const providerConfig = await paymentService.findProviderByStoreId(request.storeId, 'stripe');
        if (!providerConfig?.config) {
          reply.status(422).send({ error: 'Unprocessable Entity', code: ErrorCodes.PAYMENT_PROVIDER_NOT_ENABLED, message: 'Provider config not found' });
          return;
        }

        const config = providerConfig.config as Record<string, string>;
        if (typeof config.webhook_secret !== 'string' || config.webhook_secret.length === 0) {
          reply.status(422).send({ error: 'Unprocessable Entity', code: ErrorCodes.PAYMENT_PROVIDER_NOT_ENABLED, message: 'Webhook secret not configured' });
          return;
        }

        const isValid = verifyStripeSignature(rawBody, signature, config.webhook_secret);
        if (!isValid) {
          reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.VALIDATION_ERROR, message: 'Invalid webhook signature' });
          return;
        }

        const result = await paymentService.handleWebhook('stripe', payload, signature, rawBody, request.storeId);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const code = 'code' in error ? (error as unknown as { code: string }).code : undefined;

        // Business logic / not-found errors → 4xx (do not retry)
        if (code === ErrorCodes.ORDER_NOT_FOUND || code === ErrorCodes.PAYMENT_ALREADY_PROCESSED) {
          fastify.log.warn({ err: error }, 'Stripe webhook business logic error');
          reply.status(404).send({ error: 'Not Found', code, message: error.message });
          return;
        }
        if (code === ErrorCodes.VALIDATION_ERROR || code === ErrorCodes.PAYMENT_PROVIDER_NOT_ENABLED) {
          fastify.log.warn({ err: error }, 'Stripe webhook validation error');
          reply.status(422).send({ error: 'Unprocessable Entity', code, message: error.message });
          return;
        }

        // Transient errors (DB, network, etc.) → 500 (trigger provider retry)
        fastify.log.error({ err: error }, 'Stripe webhook transient error');
        reply.status(500).send({ error: 'Internal Server Error', message: 'Transient error, will retry' });
      }
    });
  });
}

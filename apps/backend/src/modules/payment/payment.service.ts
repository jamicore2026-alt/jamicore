// Payment service — facade. See per-concern files for implementation:
//   payment.provider.service.ts  — getProviders, configureProvider
//   payment.intent.service.ts    — createPaymentIntent
//   payment.refund.service.ts    — refundPayment
//   payment.webhook.service.ts   — handleWebhook, getPaymentStatus, findProviderByStoreId
import { providerService } from './payment.provider.service.js';
import { intentService } from './payment.intent.service.js';
import { refundService } from './payment.refund.service.js';
import { webhookService } from './payment.webhook.service.js';

export const paymentService = {
  ...providerService,
  ...intentService,
  ...refundService,
  ...webhookService,
};

// Re-export webhook signature verification helpers for route handlers.
export { verifyRazorpaySignature, verifyStripeSignature } from './payment.webhook.service.js';

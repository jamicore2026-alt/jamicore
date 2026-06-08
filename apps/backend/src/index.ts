// SaaS E-commerce API - Main Entry Point

import 'dotenv/config';
import Fastify from 'fastify';
import pino from 'pino';
import { env } from './config/env.js';
import plugins from './plugins/index.js';
import publicScope from './scopes/public.js';
import merchantScope from './scopes/merchant.js';
import customerScope from './scopes/customer.js';
import superAdminScope from './scopes/superAdmin.js';
import { db, client, getPoolMetrics } from './db/index.js';
import { createCacheService, setCacheServiceInstance } from './services/cache.service.js';
import { createQueueService } from './services/queue.service.js';
import { createEmailService } from './services/email.service.js';
import { createUploadService } from './modules/upload/upload.service.js';
import { storeService } from './modules/store/store.service.js';
import { pricingService } from './modules/pricing/pricing.service.js';
import { staffService } from './modules/staff/staff.service.js';
import { paymentService } from './modules/payment/payment.service.js';
import { authService } from './modules/auth/auth.service.js';
import { createEmailProcessor } from './services/emailProcessor.service.js';
import { processImageJob } from './services/imageProcessor.service.js';
import { backupService } from './modules/backup/backup.service.js';
import { sql } from 'drizzle-orm';
import { initSentry, Sentry } from './services/sentry.service.js';
import { runAbandonedCartCron } from './jobs/abandonedCartCron.js';
import { runExchangeRateCron } from './jobs/exchangeRateCron.js';
import { ErrorCodes } from './errors/codes.js';
import { validatorCompiler, serializerCompiler } from 'fastify-type-provider-zod';


initSentry();

function isPrivateIp(ip: string): boolean {
  // Handle IPv4-mapped IPv6 (::ffff:127.0.0.1)
  const ipv4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  if (ipv4 === '127.0.0.1' || ip === '::1') return true;
  const parts = ipv4.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
  // 127.0.0.0/8 (full loopback range)
  if (parts[0] === 127) return true;
  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
}

const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.token',
      'req.body.cardNumber',
      'req.body.cvv',
      'req.body.secret',
      'req.body.apiKey',
      'req.body.webhook_secret',
      'req.body.secret_key',
    ],
    censor: '[REDACTED]',
  },
  transport: env.isProduction
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true } },
});

const fastify = Fastify({
  loggerInstance: logger,
  genReqId: () => crypto.randomUUID(),
  trustProxy: env.isProduction ? (env.TRUST_PROXY_HOPS ?? 1) : false,
});

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

// Register plugins
await fastify.register(plugins);

// Type-safe request ID decoration
fastify.decorateRequest('requestId', '');

// Request ID propagation hook
fastify.addHook('onRequest', async (request, _reply) => {
  request.requestId = request.id;
});


fastify.addHook('onSend', async (_request, reply) => {
  reply.header('Api-Version', '1');
});

fastify.addHook('onResponse', async (request, reply) => {
  fastify.log.info({
    reqId: request.id,
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    responseTime: reply.elapsedTime,
    storeId: request.storeId,
    userId: request.user?.id,
  }, 'request completed');
});

// Decorate services
const cacheService = createCacheService(fastify.redis);
setCacheServiceInstance(cacheService);
const queueService = createQueueService(env.REDIS_URL);
const emailService = createEmailService(queueService.emailQueue);
const uploadService = createUploadService(queueService.imageQueue);
fastify.decorate('cacheService', cacheService);
fastify.decorate('queueService', queueService);
fastify.decorate('emailService', emailService);
fastify.decorate('uploadService', uploadService);
fastify.decorate('storeService', storeService);
fastify.decorate('pricingService', pricingService);
fastify.decorate('staffService', staffService);
fastify.decorate('paymentService', paymentService);
fastify.decorate('authService', authService);

// Configure notification queue
import { setNotificationQueue } from './modules/notifications/notifications.service.js';
setNotificationQueue(queueService.notificationQueue);

// Start email worker to process queued emails
const emailProcessor = createEmailProcessor(emailService);
queueService.createWorker('emails', emailProcessor);

// Start abandoned cart worker to process abandoned cart reminders
import { createAbandonedCartProcessor } from './services/abandonedCartProcessor.service.js';
queueService.createWorker('abandoned-cart', createAbandonedCartProcessor(queueService));

// Start webhook worker to process queued webhook deliveries
import { webhookService } from './modules/webhook/webhook.service.js';
interface WebhookJobData {
  hook: { id: string; url: string; secret: string; storeId: string; failureCount: number | null };
  event: string;
  payload: Record<string, unknown>;
}

queueService.createWorker('webhooks', async (job) => {
  const { hook, event, payload } = job.data as WebhookJobData;
  await webhookService.deliverWebhook(hook, event, payload);
});

// Start image worker to process uploaded images (WebP/AVIF conversion)
queueService.createWorker('images', processImageJob);

// Start notification worker to process queued notifications
import { notificationService } from './modules/notifications/notifications.service.js';

queueService.createWorker('notifications', async (job) => {
  const { storeId, type, title, body, data } = job.data as {
    storeId: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  };
  await notificationService.processNotification({ storeId, type, title, body, data });
});

// Start domain verification worker
import { processDomainVerification } from './jobs/domainVerificationProcessor.js';
queueService.createWorker('domain-verification', processDomainVerification);

// Health check endpoints (no auth)
fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
}));

fastify.get('/health/ready', async (_request, reply) => {
  try {
    await db.execute(sql`SELECT 1`);
    await fastify.redis.ping();

    // Pool saturation check: report not-ready if pool is nearly exhausted
    const poolMetrics = await getPoolMetrics();
    const poolMax = env.isProduction ? 20 : 10;
    if (poolMetrics.waiting > 5 || (poolMetrics.active / poolMax) > 0.9) {
      fastify.log.warn({ poolMetrics }, 'Health check: DB pool saturated');
      // QUAL-006: code so clients/load-balancers can branch on this
      reply.status(503).send({ status: 'not ready', error: 'DB pool saturated', code: ErrorCodes.SERVICE_UNAVAILABLE });
      return;
    }

    return { status: 'ready' };
  } catch (err) {
    fastify.log.error(err, 'Health check failed');
    // QUAL-006: code so clients/load-balancers can branch on this
    reply.status(503).send({ status: 'not ready', error: 'Service unavailable', code: ErrorCodes.SERVICE_UNAVAILABLE });
  }
});

// Detailed health check - database, redis, queue, memory (protected by API key or internal network)
fastify.get('/health/detailed', async (request, reply) => {
  // IP allowlist: only allow private/internal networks
  const clientIp = request.ip;
  if (!isPrivateIp(clientIp)) {
    // QUAL-006: code so clients/load-balancers can branch on this
    reply.status(403).send({ error: 'Forbidden', code: ErrorCodes.HEALTH_CHECK_UNAUTHORIZED, message: 'Access denied' });
    return;
  }

  // Require health-check API key via header only (query params leak into logs)
  const healthKey = request.headers['x-health-key'];
  if (!env.HEALTH_CHECK_KEY || healthKey !== env.HEALTH_CHECK_KEY) {
    // QUAL-006: code so clients/load-balancers can branch on this
    reply.status(403).send({ error: 'Forbidden', code: ErrorCodes.HEALTH_CHECK_UNAUTHORIZED, message: 'Access denied' });
    return;
  }
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  // Database check
  const dbStart = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks.database = { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' };
  }

  // Redis check
  const redisStart = Date.now();
  try {
    await fastify.redis.ping();
    checks.redis = { status: 'ok', latencyMs: Date.now() - redisStart };
  } catch (err) {
    checks.redis = { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' };
  }

  // Queue check (verify queues are reachable via Redis)
  try {
    const queueCount = await queueService.emailQueue.getJobCounts();
    checks.queue = { status: queueCount ? 'ok' : 'error' };
  } catch (err) {
    checks.queue = { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' };
  }

  // Memory usage
  const mem = process.memoryUsage();
  checks.memory = {
    status: mem.rss < 512 * 1024 * 1024 ? 'ok' : 'warning',
  };

  // Pool metrics
  let poolMetrics: { active: number; idle: number; waiting: number } | undefined;
  try {
    poolMetrics = await getPoolMetrics();
  } catch {
    poolMetrics = undefined;
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok');

  return {
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
    memory: {
      rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
    },
    pool: poolMetrics,
  };
});

// Metrics endpoint - structured observability data (protected by API key or internal network)
fastify.get('/health/metrics', async (request, reply) => {
  const clientIp = request.ip;
  if (!isPrivateIp(clientIp)) {
    // QUAL-006: code so clients/load-balancers can branch on this
    reply.status(403).send({ error: 'Forbidden', code: ErrorCodes.HEALTH_CHECK_UNAUTHORIZED, message: 'Access denied' });
    return;
  }

  const healthKey = request.headers['x-health-key'];
  if (!env.HEALTH_CHECK_KEY || healthKey !== env.HEALTH_CHECK_KEY) {
    // QUAL-006: code so clients/load-balancers can branch on this
    reply.status(403).send({ error: 'Forbidden', code: ErrorCodes.HEALTH_CHECK_UNAUTHORIZED, message: 'Access denied' });
    return;
  }

  const mem = process.memoryUsage();
  const uptime = process.uptime();
  let poolMetrics: { active: number; idle: number; waiting: number } | undefined;
  try {
    poolMetrics = await getPoolMetrics();
  } catch {
    poolMetrics = undefined;
  }

  return {
    uptime_seconds: uptime,
    memory: {
      rss_bytes: mem.rss,
      heap_used_bytes: mem.heapUsed,
      heap_total_bytes: mem.heapTotal,
      external_bytes: mem.external,
    },
    pool: poolMetrics,
    timestamp: new Date().toISOString(),
  };
});

fastify.get('/health/backup', async (request, reply) => {
  const clientIp = request.ip;
  if (!isPrivateIp(clientIp)) {
    // QUAL-006: code so clients/load-balancers can branch on this
    reply.status(403).send({ error: 'Forbidden', code: ErrorCodes.HEALTH_CHECK_UNAUTHORIZED, message: 'Access denied' });
    return;
  }

  const healthKey = request.headers['x-health-key'];
  if (!env.HEALTH_CHECK_KEY || healthKey !== env.HEALTH_CHECK_KEY) {
    // QUAL-006: code so clients/load-balancers can branch on this
    reply.status(403).send({ error: 'Forbidden', code: ErrorCodes.HEALTH_CHECK_UNAUTHORIZED, message: 'Access denied' });
    return;
  }

  const latest = await backupService.getLatestBackup();
  return {
    status: latest ? 'ok' : 'warning',
    lastBackup: latest?.lastModified ?? null,
    filename: latest?.filename ?? null,
  };
});

// Error handler - MUST be registered BEFORE scopes so it catches all errors
fastify.setErrorHandler((error: unknown, request, reply) => {
  Sentry.captureException(error, {
    extra: {
      reqId: request.id,
      storeId: request.storeId,
      url: request.url,
      method: request.method,
    },
  });
  // Handle Zod validation errors as 400 Bad Request
  if (error && typeof error === 'object' && 'issues' in (error as object)) {
    const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
    reply.status(400).send({
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      message: zodError.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    });
    return;
  }

  // Handle custom error codes (thrown by services with .code property)
  const err = error instanceof Error ? error : new Error(String(error));
  const code = 'code' in err ? (err as unknown as { code: string }).code : undefined;

  // Map error codes to HTTP status codes
  // QUAL-013: use ErrorCodes.X as the key so a constant rename can't drift
  // the map. (The constant value is the string itself, so this is functionally
  // identical to a string-literal key, but the type system now enforces the
  // coupling.)
  const codeToStatus: Record<string, number> = {
    // 400 Bad Request
    [ErrorCodes.VALIDATION_ERROR]: 400,
    [ErrorCodes.INVALID_FILE_TYPE]: 400,
    [ErrorCodes.FILE_TOO_LARGE]: 400,
    // 401 Unauthorized
    [ErrorCodes.INVALID_CREDENTIALS]: 401,
    [ErrorCodes.TOKEN_MISSING]: 401,
    [ErrorCodes.TOKEN_EXPIRED]: 401,
    [ErrorCodes.TOKEN_INVALID]: 401,
    [ErrorCodes.VERIFICATION_TOKEN_EXPIRED]: 401,
    [ErrorCodes.PASSWORD_RESET_EXPIRED]: 401,
    [ErrorCodes.EMAIL_NOT_VERIFIED]: 401,
    [ErrorCodes.MFA_REQUIRED]: 401,
    [ErrorCodes.MFA_CODE_INVALID]: 401,
    [ErrorCodes.MFA_CODE_EXPIRED]: 401,
    [ErrorCodes.API_KEY_INVALID]: 401,
    // 403 Forbidden
    [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 403,
    [ErrorCodes.STORE_SUSPENDED]: 403,
    [ErrorCodes.PLAN_EXPIRED]: 403,
    [ErrorCodes.PLAN_LIMIT_EXCEEDED]: 403,
    [ErrorCodes.PERMISSION_DENIED]: 403,
    [ErrorCodes.EMAIL_ALREADY_VERIFIED]: 403,
    [ErrorCodes.CANNOT_REMOVE_OWNER]: 403,
    [ErrorCodes.CART_NOT_OWNED]: 403,
    [ErrorCodes.UPGRADE_NOT_ALLOWED]: 403,
    [ErrorCodes.REVIEW_NOT_OWNED]: 403,
    [ErrorCodes.HEALTH_CHECK_UNAUTHORIZED]: 403,
    [ErrorCodes.RETURN_UNAUTHORIZED]: 403,
    // 404 Not Found
    [ErrorCodes.NOT_FOUND]: 404,
    [ErrorCodes.STORE_NOT_FOUND]: 404,
    [ErrorCodes.PRODUCT_NOT_FOUND]: 404,
    [ErrorCodes.ORDER_NOT_FOUND]: 404,
    [ErrorCodes.CUSTOMER_NOT_FOUND]: 404,
    [ErrorCodes.CATEGORY_NOT_FOUND]: 404,
    [ErrorCodes.MODIFIER_GROUP_NOT_FOUND]: 404,
    [ErrorCodes.REVIEW_NOT_FOUND]: 404,
    [ErrorCodes.USER_NOT_FOUND]: 404,
    [ErrorCodes.ADMIN_NOT_FOUND]: 404,
    [ErrorCodes.PLAN_NOT_FOUND]: 404,
    [ErrorCodes.MERCHANT_NOT_FOUND]: 404,
    [ErrorCodes.STAFF_NOT_FOUND]: 404,
    [ErrorCodes.STAFF_INVITE_NOT_FOUND]: 404,
    [ErrorCodes.STAFF_INVITE_EXPIRED]: 404,
    [ErrorCodes.CART_NOT_FOUND]: 404,
    [ErrorCodes.CART_ITEM_NOT_FOUND]: 404,
    [ErrorCodes.ZONE_NOT_FOUND]: 404,
    [ErrorCodes.RATE_NOT_FOUND]: 404,
    [ErrorCodes.TAX_RATE_NOT_FOUND]: 404,
    [ErrorCodes.ADDRESS_NOT_FOUND]: 404,
    [ErrorCodes.VARIANT_NOT_FOUND]: 404,
    [ErrorCodes.MODIFIER_NOT_FOUND]: 404,
    [ErrorCodes.RETURN_NOT_FOUND]: 404,
    [ErrorCodes.CMS_PAGE_NOT_FOUND]: 404,
    [ErrorCodes.SWAGGER_NOT_FOUND]: 404,
    // 409 Conflict
    [ErrorCodes.USER_ALREADY_EXISTS]: 409,
    [ErrorCodes.CUSTOMER_ALREADY_EXISTS]: 409,
    [ErrorCodes.WISHLIST_ITEM_EXISTS]: 409,
    [ErrorCodes.ORDER_ALREADY_FULFILLED]: 409,
    [ErrorCodes.ORDER_CANCELLED]: 409,
    [ErrorCodes.ORDER_ALREADY_PAID]: 409,
    [ErrorCodes.COUPON_USAGE_EXCEEDED]: 409,
    [ErrorCodes.ALREADY_ON_PLAN]: 409,
    [ErrorCodes.PRICE_MISMATCH]: 409,
    [ErrorCodes.PAYMENT_ALREADY_PROCESSED]: 409,
    // 410 Gone
    [ErrorCodes.COUPON_EXPIRED]: 410,
    [ErrorCodes.PRODUCT_UNPUBLISHED]: 410,
    // 422 Unprocessable
    [ErrorCodes.INVALID_COUPON]: 422,
    [ErrorCodes.INSUFFICIENT_INVENTORY]: 422,
    [ErrorCodes.SHIPPING_NOT_CALCULABLE]: 422,
    [ErrorCodes.ORDER_NOT_FULFILLED]: 422,
    [ErrorCodes.PRODUCT_UNAVAILABLE]: 422,
    [ErrorCodes.COUPON_NOT_APPLICABLE]: 422,
    [ErrorCodes.SHIPPING_OPTION_INVALID]: 422,
    [ErrorCodes.RETURN_INVALID_STATUS]: 422,
    [ErrorCodes.PAYMENT_PROVIDER_NOT_ENABLED]: 422,
    // Payment
    [ErrorCodes.PAYMENT_FAILED]: 400,
    [ErrorCodes.PAYMENT_TRANSIENT_ERROR]: 500,
    [ErrorCodes.SWAGGER_CONFIG_ERROR]: 500,
    // QUAL-006: health-check / readiness / metrics / backup
    [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
    // QUAL-007: swagger /documentation
    [ErrorCodes.SWAGGER_AUTH_REQUIRED]: 401,
    // Domain
    [ErrorCodes.DOMAIN_ALREADY_TAKEN]: 409,
    [ErrorCodes.DOMAIN_INVALID_FORMAT]: 400,
    [ErrorCodes.DOMAIN_TOO_MANY]: 403,
    [ErrorCodes.DOMAIN_VERIFICATION_FAILED]: 400,
    [ErrorCodes.DOMAIN_SSL_FAILED]: 500,
    [ErrorCodes.DOMAIN_NOT_FOUND]: 404,
  };

  // Priority: custom code mapping > Fastify's statusCode > default 500
  const statusCode = (code && codeToStatus[code])
    || ('statusCode' in err ? (err as unknown as { statusCode: number }).statusCode : null)
    || 500;

  // Only log 500-level errors at error level
  if (statusCode >= 500) {
    fastify.log.error(error);
  } else {
    fastify.log.debug(error);
  }

  const payload = {
    error: err.name || 'Internal Server Error',
    ...(code ? { code } : {}),
    message: (env.isProduction && statusCode >= 500) ? 'An error occurred' : err.message,
  };

  reply.status(statusCode).send(payload);
});

// Register scopes (each is encapsulated)
await fastify.register(publicScope, { prefix: '/api/v1/public' });
await fastify.register(merchantScope, { prefix: '/api/v1/merchant' });
await fastify.register(customerScope, { prefix: '/api/v1/customer' });
await fastify.register(superAdminScope, { prefix: '/api/v1/admin' });

  // Start server
try {
  await fastify.listen({ port: Number(env.PORT), host: env.HOST });
  fastify.log.info(`Server listening on port ${env.PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

// Run every 30 minutes
setInterval(() => {
  runAbandonedCartCron(queueService, fastify.log, fastify.redis).catch((err) => fastify.log.error(err));
}, 30 * 60 * 1000);

// Run once on startup
runAbandonedCartCron(queueService, fastify.log, fastify.redis).catch((err) => fastify.log.error(err));

// Run exchange rate update daily
setInterval(() => {
  runExchangeRateCron(fastify.log).catch((err) => fastify.log.error(err));
}, 24 * 60 * 60 * 1000);

// Run once on startup
runExchangeRateCron(fastify.log).catch((err) => fastify.log.error(err));

// Graceful shutdown
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
for (const signal of signals) {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await queueService.closeAll();
      await fastify.close();
      await client.end();
      fastify.log.info('Server shut down successfully');
      process.exit(0);
    } catch (err) {
      fastify.log.error(err, 'Error during shutdown');
      process.exit(1);
    }
  });
}

export default fastify;


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
import { createCacheService } from './services/cache.service.js';
import { createQueueService } from './services/queue.service.js';
import { createEmailService } from './services/email.service.js';
import { createUploadService } from './services/upload.service.js';
import { storeService } from './modules/store/store.service.js';
import { pricingService } from './modules/pricing/pricing.service.js';
import { staffService } from './modules/staff/staff.service.js';
import { paymentService } from './modules/payment/payment.service.js';
import { createEmailProcessor } from './services/emailProcessor.service.js';
import { processImageJob } from './services/imageProcessor.service.js';
import { backupService } from './modules/backup/backup.service.js';
import { sql } from 'drizzle-orm';
import { initSentry, Sentry } from './services/sentry.service.js';
import { runAbandonedCartCron } from './jobs/abandonedCartCron.js';
import { runExchangeRateCron } from './jobs/exchangeRateCron.js';

initSentry();

function isPrivateIp(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === '::1') return true;
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
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
  transport: env.isProduction
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true } },
});

const fastify = Fastify({
  loggerInstance: logger,
  genReqId: () => crypto.randomUUID(),
  trustProxy: env.isProduction ? (env.TRUST_PROXY_HOPS ?? 1) : false,
});

// Register plugins
await fastify.register(plugins);

// Request ID propagation hook
fastify.addHook('onRequest', async (request, _reply) => {
  const requestId = request.id;
  // Store requestId on the request for downstream use
  (request as unknown as Record<string, string>).requestId = requestId;
});


fastify.addHook('onResponse', async (request, reply) => {
  fastify.log.info({
    reqId: request.id,
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    responseTime: reply.elapsedTime,
    storeId: (request as any).storeId,
    userId: (request as any).user?.id,
  }, 'request completed');
});

// Decorate services
const cacheService = createCacheService(fastify.redis);
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

// Start email worker to process queued emails
const emailProcessor = createEmailProcessor(emailService);
queueService.createWorker('emails', emailProcessor);

// Start abandoned cart worker to process abandoned cart reminders
import { createAbandonedCartProcessor } from './services/abandonedCartProcessor.service.js';
queueService.createWorker('abandoned-cart', createAbandonedCartProcessor(queueService));

// Start webhook worker to process queued webhook deliveries
import { webhookService } from './modules/webhook/webhook.service.js';
queueService.createWorker('webhooks', async (job) => {
  const { hook, event, payload } = job.data as { hook: any; event: string; payload: Record<string, unknown> };
  await webhookService.deliverWebhook(hook, event, payload);
});

// Start image worker to process uploaded images (WebP/AVIF conversion)
queueService.createWorker('images', processImageJob);

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
    return { status: 'ready' };
  } catch (err) {
    fastify.log.error(err, 'Health check failed');
    reply.status(503).send({ status: 'not ready', error: 'Service unavailable' });
  }
});

// Detailed health check - database, redis, queue, memory (protected by API key or internal network)
fastify.get('/health/detailed', async (request, reply) => {
  // IP allowlist: only allow private/internal networks
  const clientIp = request.ip;
  if (!isPrivateIp(clientIp)) {
    reply.status(403).send({ error: 'Forbidden', message: 'Access denied from this IP' });
    return;
  }

  // Require a static health-check API key via query param or header
  const healthKey = request.headers['x-health-key'] || (request.query as Record<string, string>)['health_key'];
  if (env.HEALTH_CHECK_KEY && healthKey !== env.HEALTH_CHECK_KEY) {
    reply.status(403).send({ error: 'Forbidden', message: 'Invalid health check key' });
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
    reply.status(403).send({ error: 'Forbidden', message: 'Access denied from this IP' });
    return;
  }

  const healthKey = request.headers['x-health-key'] || (request.query as Record<string, string>)['health_key'];
  if (env.HEALTH_CHECK_KEY && healthKey !== env.HEALTH_CHECK_KEY) {
    reply.status(403).send({ error: 'Forbidden', message: 'Invalid health check key' });
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

fastify.get('/health/backup', async (_request, _reply) => {
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
      storeId: (request as any).storeId,
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
  const codeToStatus: Record<string, number> = {
    // 400 Bad Request
    VALIDATION_ERROR: 400,
    INVALID_FILE_TYPE: 400,
    FILE_TOO_LARGE: 400,
    // 401 Unauthorized
    INVALID_CREDENTIALS: 401,
    TOKEN_EXPIRED: 401,
    TOKEN_INVALID: 401,
    VERIFICATION_TOKEN_EXPIRED: 401,
    PASSWORD_RESET_EXPIRED: 401,
    EMAIL_NOT_VERIFIED: 401,
    // 403 Forbidden
    INSUFFICIENT_PERMISSIONS: 403,
    STORE_SUSPENDED: 403,
    PLAN_EXPIRED: 403,
    PERMISSION_DENIED: 403,
    EMAIL_ALREADY_VERIFIED: 403,
    CANNOT_REMOVE_OWNER: 403,
    // 404 Not Found
    NOT_FOUND: 404,
    STORE_NOT_FOUND: 404,
    PRODUCT_NOT_FOUND: 404,
    ORDER_NOT_FOUND: 404,
    CUSTOMER_NOT_FOUND: 404,
    CATEGORY_NOT_FOUND: 404,
    MODIFIER_GROUP_NOT_FOUND: 404,
    REVIEW_NOT_FOUND: 404,
    USER_NOT_FOUND: 404,
    ADMIN_NOT_FOUND: 404,
    PLAN_NOT_FOUND: 404,
    MERCHANT_NOT_FOUND: 404,
    STAFF_NOT_FOUND: 404,
    STAFF_INVITE_NOT_FOUND: 404,
    STAFF_INVITE_EXPIRED: 404,
    CART_NOT_FOUND: 404,
    CART_ITEM_NOT_FOUND: 404,
    // 409 Conflict
    USER_ALREADY_EXISTS: 409,
    CUSTOMER_ALREADY_EXISTS: 409,
    WISHLIST_ITEM_EXISTS: 409,
    ORDER_ALREADY_FULFILLED: 409,
    ORDER_CANCELLED: 409,
    COUPON_USAGE_EXCEEDED: 409,
    // 410 Gone
    COUPON_EXPIRED: 410,
    PRODUCT_UNPUBLISHED: 410,
    // 422 Unprocessable
    INVALID_COUPON: 422,
    INSUFFICIENT_INVENTORY: 422,
    SHIPPING_NOT_CALCULABLE: 422,
    // 409 Conflict
    PRICE_MISMATCH: 409,
    // 404 (additional)
    ZONE_NOT_FOUND: 404,
    RATE_NOT_FOUND: 404,
    TAX_RATE_NOT_FOUND: 404,
    ADDRESS_NOT_FOUND: 404,
    VARIANT_NOT_FOUND: 404,
    MODIFIER_NOT_FOUND: 404,
    // 422 Unprocessable
    PRODUCT_UNAVAILABLE: 422,
    COUPON_NOT_APPLICABLE: 422,
    SHIPPING_OPTION_INVALID: 422,
    // Payment
    PAYMENT_FAILED: 400,
    PAYMENT_PROVIDER_NOT_ENABLED: 422,
    PAYMENT_ALREADY_PROCESSED: 409,
    // Returns
    RETURN_NOT_FOUND: 404,
    RETURN_INVALID_STATUS: 422,
    RETURN_UNAUTHORIZED: 403,
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

  reply.status(statusCode).send({
    error: err.name || 'Internal Server Error',
    ...(code ? { code } : {}),
    message: env.isProduction ? 'An error occurred' : err.message,
  });
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
  runAbandonedCartCron(queueService, fastify.log).catch((err) => fastify.log.error(err));
}, 30 * 60 * 1000);

// Run once on startup
runAbandonedCartCron(queueService, fastify.log).catch((err) => fastify.log.error(err));

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

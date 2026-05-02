// Swagger Plugin - OpenAPI documentation with Zod schema support
// Secured with Basic Auth — credentials from SWAGGER_USER / SWAGGER_PASSWORD env vars
// Only available in development mode (NODE_ENV !== 'production')

import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { FastifyInstance } from 'fastify';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';

// Resolve static assets path (ESM-compatible with pnpm)
const require = createRequire(import.meta.url);
const swaggerUiDir = path.dirname(require.resolve('@fastify/swagger-ui/package.json'));
const staticDir = path.join(swaggerUiDir, 'static');

export default fp(async function swaggerPlugin(fastify: FastifyInstance) {
  // ── Basic Auth middleware for /documentation ──
  fastify.addHook('onRequest', async (request, reply) => {
    // Only protect /documentation routes
    if (!request.url.startsWith('/documentation')) return;

    // Block entirely in production
    if (env.isProduction) {
      reply.status(404).send({ error: 'Not Found' });
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      reply.header('WWW-Authenticate', 'Basic realm="Swagger API Docs"');
      reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required to access API documentation' });
      return;
    }

    const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
    const [username, password] = credentials.split(':');

    if (username !== env.SWAGGER_USER || password !== env.SWAGGER_PASSWORD) {
      reply.header('WWW-Authenticate', 'Basic realm="Swagger API Docs"');
      reply.status(401).send({ error: 'Unauthorized', message: 'Invalid credentials' });
      return;
    }
  });

  // ── Swagger spec generation ──
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'SaaS E-commerce API',
        description:
          'Multi-tenant headless ecommerce SaaS platform. ' +
          'All merchant/customer/admin endpoints require JWT cookie authentication. ' +
          'Public endpoints resolve store via Host header subdomain.',
        version: '1.0.0',
      },
      servers: [
        // Development / local server
        { url: `http://localhost:${env.PORT ?? 3000}`, description: 'Local Development' },
        // Staging / Production API URL when configured
        ...(env.API_BASE_URL ? [{ url: env.API_BASE_URL.replace(/\/$/, ''), description: `${env.isProduction ? 'Production' : 'Staging'} API` }] : []),
        // Storefront BFF proxy path
        ...(env.STOREFRONT_URL ? [{ url: env.STOREFRONT_URL.replace(/\/$/, '') + '/api', description: 'Storefront BFF' }] : []),
      ],
      tags: [
        { name: 'Public', description: 'Storefront browsing (no auth required)' },
        { name: 'Merchant Auth', description: 'Merchant login, register, logout' },
        { name: 'Merchant Store', description: 'Store settings management' },
        { name: 'Merchant Products', description: 'Product, variant, and option management' },
        { name: 'Merchant Categories', description: 'Category and subcategory management' },
        { name: 'Merchant Modifiers', description: 'Modifier groups and options' },
        { name: 'Merchant Orders', description: 'Order management and fulfillment' },
        { name: 'Merchant Customers', description: 'Customer list and details' },
        { name: 'Merchant Reviews', description: 'Review moderation' },
        { name: 'Merchant Coupons', description: 'Coupon management' },
        { name: 'Merchant Analytics', description: 'Dashboard and revenue analytics' },
        { name: 'Merchant Upload', description: 'File upload' },
        { name: 'Merchant Staff', description: 'Staff management and invitations' },
        { name: 'Merchant Shipping', description: 'Shipping zones and rates' },
        { name: 'Merchant Tax', description: 'Tax rate management' },
        { name: 'Customer Auth', description: 'Customer login, register, logout' },
        { name: 'Customer Profile', description: 'Profile management' },
        { name: 'Customer Orders', description: 'Order history and details' },
        { name: 'Customer Checkout', description: 'Place orders' },
        { name: 'Customer Wishlist', description: 'Wishlist management' },
        { name: 'Customer Reviews', description: 'Customer reviews' },
        { name: 'Customer Addresses', description: 'Address book management' },
        { name: 'Public Shipping', description: 'Shipping calculation' },
        { name: 'Public Tax', description: 'Tax calculation' },
        { name: 'SuperAdmin Auth', description: 'Admin login, logout' },
        { name: 'SuperAdmin Merchants', description: 'Store approval and management' },
        { name: 'SuperAdmin Plans', description: 'Plan CRUD' },
        { name: 'SuperAdmin Stores', description: 'Store management and platform stats' },
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'token',
            description: 'JWT token set via httpOnly cookie on login',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  // ── Swagger UI ──
  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    baseDir: staticDir,
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      persistAuthorization: true,
      displayRequestDuration: true,
    },
    staticCSP: true,
  });

  // ── Workaround: serve static assets manually (ESM + pnpm path issue) ──
  const contentTypes: Record<string, string> = {
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
  };

  const criticalFiles = [
    'swagger-ui.css',
    'swagger-ui-bundle.js',
    'swagger-ui-standalone-preset.js',
    'index.css',
    'favicon-16x16.png',
    'favicon-32x32.png',
    'logo.svg',
  ];

  for (const file of criticalFiles) {
    const filePath = path.join(staticDir, file);
    if (!fs.existsSync(filePath)) continue;

    const ext = path.extname(file);
    const contentType = contentTypes[ext] || 'application/octet-stream';
    const routePath = `/documentation/static/${file}`;

    try {
      fastify.get(routePath, async (_request, reply) => {
        const content = fs.readFileSync(filePath);
        reply.header('Content-Type', contentType);
        reply.header('Cache-Control', 'public, max-age=86400');
        return reply.send(content);
      });
    } catch {
      // Route already registered by swagger-ui, skip
    }
  }
}, { name: 'swagger', dependencies: [] });
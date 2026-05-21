import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

export default fp(async function helmetPlugin(fastify: FastifyInstance) {
  const imgSrc = ["'self'", 'data:'];

  // Allow storefront origin for images
  if (env.STOREFRONT_URL) {
    try {
      imgSrc.push(new URL(env.STOREFRONT_URL).origin);
    } catch {
      // ignore invalid URL
    }
  }

  // Allow S3 virtual-hosted bucket domain if configured
  if (env.S3_BUCKET && env.S3_REGION) {
    imgSrc.push(`https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com`);
  }

  // Allow Sentry CDN if configured
  if (env.SENTRY_DSN) {
    imgSrc.push('https://*.sentry.io');
  }

  // Filter out dev origins in production
  const productionImgSrc = env.isProduction
    ? imgSrc.filter((src) => !src.includes('localhost') && !src.includes('127.0.0.1'))
    : imgSrc;

  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: productionImgSrc,
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        frameSrc: ["'none'"],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: env.isProduction ? [] : null,
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  });
}, { name: 'helmet', dependencies: [] });

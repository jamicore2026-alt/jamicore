import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

export default fp(async function corsPlugin(fastify: FastifyInstance) {
  // Parse CORS_ORIGINS env var (comma-separated list of origin patterns)
  const allowedPatterns: string[] = env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Allow non-browser requests (Postman, server-to-server, curl)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (env.isDevelopment) {
        // In development: allow only known localhost ports
        try {
          const url = new URL(origin);
          if ((url.hostname === 'localhost' || url.hostname === '127.0.0.1') && [3000, 5173, 5174].includes(Number(url.port))) {
            callback(null, true);
            return;
          }
        } catch {
          callback(null, false);
          return;
        }
      }

      // Check against allowed patterns (exact match or wildcard subdomain)
      for (const pattern of allowedPatterns) {
        // Exact match
        if (origin === pattern) {
          callback(null, true);
          return;
        }
        // Wildcard subdomain match: "*.myplatform.com" matches "store1.myplatform.com"
        if (pattern.startsWith('*.')) {
          const baseDomain = pattern.slice(2); // e.g., "myplatform.com"
          try {
            const url = new URL(origin);
            if (url.hostname === baseDomain || url.hostname.endsWith('.' + baseDomain)) {
              callback(null, true);
              return;
            }
          } catch {
            continue;
          }
        }
      }

      // No match found
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-CSRF-Token'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400,
  });
}, { name: 'cors', dependencies: [] });
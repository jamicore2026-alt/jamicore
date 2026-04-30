// Plugin registration - all plugins registered here
// Wrapped in fastify-plugin to break encapsulation boundary
// so that decorations (redis, jwt, etc.) are available at root scope

import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

export default fp(async function plugins(fastify: FastifyInstance) {
  // Core plugins (order matters)
  await fastify.register(import('./sensible.js'));
  await fastify.register(import('./helmet.js'));
  await fastify.register(import('./cors.js'));
  await fastify.register(import('./compress.js'));
  await fastify.register(import('./rateLimit.js'));
  await fastify.register(import('./jwt.js'));
  await fastify.register(import('./redis.js'));
  await fastify.register(import('./multipart.js'));

  // Serve local uploads in development with on-the-fly image processing
  if (env.isDevelopment) {
    const uploadsRoot = join(process.cwd(), 'uploads');

    fastify.get('/uploads/*', async (request, reply) => {
      const wildcard = (request.params as Record<string, string>)['*'];
      const relativePath = wildcard ?? '';
      const filePath = join(uploadsRoot, relativePath);

      // Serve existing file directly
      if (existsSync(filePath)) {
        const ext = relativePath.split('.').pop()?.toLowerCase() ?? '';
        const mimeTypes: Record<string, string> = {
          jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
          gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
          svg: 'image/svg+xml', pdf: 'application/pdf',
        };
        const mime = mimeTypes[ext] ?? 'application/octet-stream';
        const buffer = await readFile(filePath);
        reply.type(mime);
        return reply.send(buffer);
      }

      // Check if this is a variant request: path/name-1024w.avif
      // The storefront replaces the original extension, so we need to try common originals
      const variantMatch = relativePath.match(/(.+)-(\d+)w\.(webp|avif|png|jpg|jpeg)$/i);
      if (variantMatch) {
        const [, originalBasePath, sizeStr, format] = variantMatch;
        const sharpFormat = format!.toLowerCase() as 'webp' | 'avif' | 'png' | 'jpg' | 'jpeg';
        const size = parseInt(sizeStr!, 10);

        // Try common original extensions (getOptimizedUrl replaced the original ext)
        const possibleExts = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];
        let originalFilePath: string | null = null;
        for (const ext of possibleExts) {
          const candidate = join(uploadsRoot, originalBasePath! + ext);
          if (existsSync(candidate)) {
            originalFilePath = candidate;
            break;
          }
        }

        if (originalFilePath) {
          const sharp = (await import('sharp')).default;
          const quality = sharpFormat === 'avif' ? 80 : 85;

          let pipeline = sharp(originalFilePath).resize(size, null, { withoutEnlargement: true });

          if (sharpFormat === 'webp') {
            pipeline = pipeline.webp({ quality });
          } else if (sharpFormat === 'avif') {
            pipeline = pipeline.avif({ quality });
          } else if (sharpFormat === 'png') {
            pipeline = pipeline.png({ quality });
          } else {
            pipeline = pipeline.jpeg({ quality });
          }

          const buffer = await pipeline.toBuffer();

          // Cache the generated file
          await mkdir(dirname(filePath), { recursive: true });
          await writeFile(filePath, buffer);

          const mimeTypes: Record<string, string> = {
            webp: 'image/webp', avif: 'image/avif',
            png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
          };
          reply.type(mimeTypes[sharpFormat] ?? 'application/octet-stream');
          return reply.send(buffer);
        }
      }

      reply.callNotFound();
    });
  }

  // Documentation (dev only)
  if (process.env.NODE_ENV !== 'production') {
    await fastify.register(import('./swagger.js'));
  }
}, { name: 'plugins', fastify: '5.x' });

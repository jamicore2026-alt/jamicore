import fp from 'fastify-plugin';
import compress from '@fastify/compress';
import { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

export default fp(async function compressPlugin(fastify: FastifyInstance) {
  // Skip compression in development to avoid proxy/body issues
  if (env.isDevelopment) {
    return;
  }
  await fastify.register(compress, {
    encodings: ['gzip', 'deflate'],
  });
}, { name: 'compress', dependencies: [] });

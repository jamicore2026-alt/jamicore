import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

export default fp(async function jwtPlugin(fastify: FastifyInstance) {
  // Register cookie plugin first (required for httpOnly JWT cookies)
  await fastify.register(cookie, {
    secret: env.COOKIE_SECRET,
  });

  // Register JWT plugin
  // Default sign is for access tokens (15 min). Refresh tokens pass { expiresIn: '7d' } explicitly.
  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: '15m',
    },
    cookie: {
      cookieName: 'access_token',
      signed: true,
    },
  });
}, { name: 'jwt', dependencies: [] });
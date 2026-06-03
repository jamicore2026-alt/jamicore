// Customer auth routes — barrel that composes:
//   auth.route.session.ts   — login, register, logout, refresh, me
//   auth.route.password.ts  — verify-email, resend-verification, forgot-password, reset-password
//   auth.route.mfa.ts       — verify-mfa, mfa/resend, mfa/enable, mfa/disable
import type { FastifyInstance } from 'fastify';
import sessionRoutes from './auth.route.session.js';
import passwordRoutes from './auth.route.password.js';
import mfaRoutes from './auth.route.mfa.js';

export default async function customerAuthRoutes(fastify: FastifyInstance) {
  await fastify.register(sessionRoutes);
  await fastify.register(passwordRoutes);
  await fastify.register(mfaRoutes);
}

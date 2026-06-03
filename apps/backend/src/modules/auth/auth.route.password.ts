// Customer password/email-verification routes — verify-email, resend-verification, forgot-password, reset-password
import type { FastifyInstance } from 'fastify';
import { verifyEmailSchema, emailSchema, resetPasswordSchema } from './auth.schema.js';
import { authService } from './auth.service.js';
import { storeService } from '../store/store.service.js';
import { ErrorCodes } from '../../errors/codes.js';
import { env } from '../../config/env.js';
import { resolveStoreId } from './auth.helpers.js';

export default async function passwordRoutes(fastify: FastifyInstance) {
  // POST /api/v1/customer/auth/verify-email
  fastify.post('/verify-email', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Customer Auth'],
      summary: 'Verify customer email',
      description: 'Verify a customer email address using the token sent via email',
    },
  }, async (request) => {
    const { token } = verifyEmailSchema.parse(request.body);
    const result = await authService.verifyEmail(token);
    return { success: true, ...result };
  });

  // POST /api/v1/customer/auth/resend-verification
  fastify.post('/resend-verification', {
    config: { rateLimit: { max: 3, timeWindow: '1 minute' } },
    schema: {
      tags: ['Customer Auth'],
      summary: 'Resend verification email',
      description: 'Request a new email verification token for the authenticated customer',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const customerId = request.customerId!;
    const customer = await authService.findCustomerForVerification(customerId);
    if (!customer) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.CUSTOMER_NOT_FOUND, message: 'Customer not found' });
      return;
    }
    const { token } = await authService.resendVerification(customer.email, customer.storeId, 'customer');
    // Queue verification email with clickable link
    const verifyUrl = `${env.STOREFRONT_URL}/verify-email?token=${token}`;
    await fastify.emailService.sendEmail({
      to: customer.email,
      subject: 'Verify your email address',
      html: `<p>Click the link below to verify your email address:</p><p><a href="${verifyUrl}">Verify your email</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
      text: `Verify your email address: ${verifyUrl}`,
    });
    return { success: true, message: 'Verification email sent' };
  });

  // POST /api/v1/customer/auth/forgot-password
  fastify.post('/forgot-password', {
    config: { rateLimit: { max: 3, timeWindow: '1 minute' } },
    schema: {
      tags: ['Customer Auth'],
      summary: 'Request password reset',
      description: 'Request a password reset token sent to the customer email',
    },
  }, async (request, reply) => {
    const { email } = emailSchema.parse(request.body);
    const storeId = await resolveStoreId(request);

    if (storeId) {
      const store = await storeService.findById(storeId);
      if (store && store.status !== 'active') {
        reply.status(403).send({ error: 'Store suspended', code: ErrorCodes.STORE_SUSPENDED, message: 'Store is currently suspended' });
        return;
      }
    }

    const result = await authService.requestPasswordReset(email, storeId || undefined, 'customer');
    // Queue reset email if user was found (don't reveal if email exists)
    if (result.token) {
      await fastify.emailService.sendEmail({
        to: email,
        subject: 'Reset your password',
        html: `<p>Click the link below to reset your password:</p><p><a href="${env.STOREFRONT_URL}/reset-password?token=${result.token}">Reset your password</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
        text: `Reset your password: ${env.STOREFRONT_URL}/reset-password?token=${result.token}`,
      });
    }
    return { success: true, message: 'If an account with that email exists, a reset link has been sent' };
  });

  // POST /api/v1/customer/auth/reset-password
  fastify.post('/reset-password', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Customer Auth'],
      summary: 'Reset password',
      description: 'Reset customer password using the token from the reset email',
    },
  }, async (request) => {
    const { token, password } = resetPasswordSchema.parse(request.body);
    const result = await authService.resetPassword(token, password);
    return { success: true, ...result };
  });
}

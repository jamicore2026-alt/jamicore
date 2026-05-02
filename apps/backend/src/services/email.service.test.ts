import { describe, it, expect, vi } from 'vitest';
import { createEmailService } from './email.service.js';

// ─── Mock Resend ───
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ error: null }),
    },
  })),
}));

vi.mock('../../config/env.js', () => ({
  env: {
    RESEND_API_KEY: 'test-api-key',
    FROM_EMAIL: 'test@example.com',
  },
}));

describe('createEmailService', () => {
  const mockQueue = {
    add: vi.fn().mockResolvedValue(undefined),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queues an email job with correct payload', async () => {
    const service = createEmailService(mockQueue);
    await service.sendEmail({
      to: 'user@example.com',
      subject: 'Welcome',
      html: '<h1>Hello</h1>',
    });

    expect(mockQueue.add).toHaveBeenCalledWith(
      'send',
      {
        to: 'user@example.com',
        subject: 'Welcome',
        html: '<h1>Hello</h1>',
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  });

  it('queues an email with multiple recipients', async () => {
    const service = createEmailService(mockQueue);
    await service.sendEmail({
      to: ['a@example.com', 'b@example.com'],
      subject: 'Newsletter',
      text: 'Hello',
    });

    expect(mockQueue.add).toHaveBeenCalledWith(
      'send',
      expect.objectContaining({
        to: ['a@example.com', 'b@example.com'],
        subject: 'Newsletter',
        text: 'Hello',
      }),
      expect.anything(),
    );
  });
});

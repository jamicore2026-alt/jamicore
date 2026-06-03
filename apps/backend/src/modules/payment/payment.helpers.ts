// Payment helpers — shared utilities used across multiple service files.
// See per-concern files (provider, intent, refund, webhook) for usage.
import crypto from 'node:crypto';

/** Generate a UUID-based idempotency key. */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

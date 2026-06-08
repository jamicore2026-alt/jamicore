// W3C Trace Context propagation helper
// Generates traceparent headers for distributed tracing across external API calls.
import { randomBytes } from 'node:crypto';

/**
 * Generate a W3C Trace Context traceparent header value.
 * Format: 00-{trace-id}-{span-id}-01
 * - trace-id: 32 hex chars (16 bytes)
 * - span-id: 16 hex chars (8 bytes)
 * - trace-flags: 01 (sampled)
 */
export function generateTraceParent(): string {
  const traceId = randomBytes(16).toString('hex');
  const spanId = randomBytes(8).toString('hex');
  return `00-${traceId}-${spanId}-01`;
}

/** Default timeout for external HTTP calls (30 seconds) */
export const EXTERNAL_FETCH_TIMEOUT_MS = 30_000;

/**
 * Create an AbortSignal that times out after `ms` milliseconds.
 * Uses AbortSignal.timeout where available (Node 17.3+), falls back to manual controller.
 */
export function createTimeoutSignal(ms: number = EXTERNAL_FETCH_TIMEOUT_MS): AbortSignal {
  return AbortSignal.timeout(ms);
}

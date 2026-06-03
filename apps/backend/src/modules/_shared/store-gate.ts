// Store status gate — single source of truth for "is this store allowed to
// issue tokens / accept auth?" Used by both merchant and customer auth routes
// so the response shape and the status semantics are consistent across scopes.
//
// Status semantics: only 'active' stores are allowed. 'pending' and 'suspended'
// are both rejected. Returns a uniform 403 with the canonical STORE_SUSPENDED
// error code so clients match on `code` rather than parsing messages.
import type { FastifyReply } from 'fastify';
import { ErrorCodes } from '../../errors/codes.js';

export type StoreLike = { id: string; status: string } | null | undefined;

export interface StoreGateResult {
  ok: boolean;
  statusCode: number;
  body: {
    error: string;
    code: string;
    message: string;
  };
}

/**
 * Evaluate whether a store may be used for auth/session operations.
 * Returns the standard response body if the gate rejects, or null if allowed.
 * Use in routes as:
 *
 *   const denied = evaluateStoreGate(store);
 *   if (denied) { reply.status(denied.statusCode).send(denied.body); return; }
 */
export function evaluateStoreGate(store: StoreLike): StoreGateResult | null {
  if (!store) {
    return {
      ok: false,
      statusCode: 404,
      body: {
        error: 'Not Found',
        code: ErrorCodes.STORE_NOT_FOUND,
        message: 'Store not found',
      },
    };
  }
  if (store.status !== 'active') {
    return {
      ok: false,
      statusCode: 403,
      body: {
        error: 'Forbidden',
        code: ErrorCodes.STORE_SUSPENDED,
        message: 'Store is suspended. Contact support.',
      },
    };
  }
  return null;
}

/**
 * Convenience wrapper that sends the gate response if needed and returns
 * a boolean indicating whether the caller should `return` after invoking.
 */
export function checkStoreActive(reply: FastifyReply, store: StoreLike): boolean {
  const denied = evaluateStoreGate(store);
  if (denied) {
    reply.status(denied.statusCode).send(denied.body);
    return true;
  }
  return false;
}

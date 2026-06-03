/**
 * Extract a human-readable error message from an unknown thrown value.
 * Use this in place of `err?.message` in catch blocks, since strict mode
 * types catch bindings as `unknown`.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return 'An unexpected error occurred';
}

/**
 * Extract a string error code from an unknown thrown value. The api client
 * surfaces backend error codes as `code` on the thrown ApiError object.
 */
export function errorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

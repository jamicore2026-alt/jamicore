import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, getCookie } from './client.js';

describe('getCookie', () => {
  it('returns undefined when document is undefined (SSR)', () => {
    expect(getCookie('csrf_token')).toBeUndefined();
  });
});

describe('apiFetch', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prepends API_BASE to the path', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ data: 'test' }),
    });

    await apiFetch('/test');

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/test',
      expect.any(Object),
    );
  });

  it('sets Content-Type and credentials by default', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ data: 'test' }),
    });

    await apiFetch('/test');

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers.get('Content-Type')).toBe('application/json');
    expect(options.credentials).toBe('include');
  });

  it('sets Host and X-Store-Domain headers when host is provided', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ data: 'test' }),
    });

    await apiFetch('/test', { host: 'techgear.localhost:5173' });

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers.get('Host')).toBe('techgear.localhost:5173');
    expect(options.headers.get('X-Store-Domain')).toBe('techgear');
  });

  it('does not set X-Store-Domain for localhost without subdomain', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ data: 'test' }),
    });

    await apiFetch('/test', { host: 'localhost:5173' });

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers.get('Host')).toBe('localhost:5173');
    expect(options.headers.get('X-Store-Domain')).toBeNull();
  });

  it('merges custom headers', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ data: 'test' }),
    });

    await apiFetch('/test', { headers: { 'X-Custom': 'value' } });

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers.get('X-Custom')).toBe('value');
    expect(options.headers.get('Content-Type')).toBe('application/json');
  });

  it('throws error response on non-ok status', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockResolvedValueOnce({
        error: 'Bad Request',
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
      }),
    });

    await expect(apiFetch('/test')).rejects.toEqual({
      error: 'Bad Request',
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
    });
  });

  it('throws generic error when response body cannot be parsed', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockRejectedValueOnce(new Error('parse failed')),
    });

    await expect(apiFetch('/test')).rejects.toEqual({
      error: 'Unknown Error',
      message: 'An unexpected error occurred',
    });
  });

  it('returns parsed JSON on success', async () => {
    const expected = { items: [{ id: '1' }], total: 1 };
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce(expected),
    });

    const result = await apiFetch('/test');
    expect(result).toEqual(expected);
  });

  it('forwards method and body', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({}),
    });

    await apiFetch('/test', {
      method: 'POST',
      body: JSON.stringify({ name: 'test' }),
    });

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ name: 'test' }));
  });
});

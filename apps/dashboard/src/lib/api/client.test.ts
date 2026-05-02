import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, serverApiFetch } from './client.js';

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

  it('does not set Content-Type for GET requests without body', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({}),
    });

    await apiFetch('/test');

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers.get('Content-Type')).toBeNull();
  });

  it('sets Content-Type for POST with JSON body', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({}),
    });

    await apiFetch('/test', { method: 'POST', body: JSON.stringify({}) });

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers.get('Content-Type')).toBe('application/json');
  });

  it('does not set Content-Type for FormData body', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({}),
    });

    const formData = new FormData();
    await apiFetch('/test', { method: 'POST', body: formData });

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers.get('Content-Type')).toBeNull();
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

  it('returns undefined on 204 No Content', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: vi.fn().mockResolvedValueOnce({}),
    });

    const result = await apiFetch('/test');
    expect(result).toBeUndefined();
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

  it('forwards custom headers', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({}),
    });

    await apiFetch('/test', { headers: { 'X-Custom': 'value' } });

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers.get('X-Custom')).toBe('value');
  });
});

describe('serverApiFetch', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls API_SERVER_BASE with path', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ data: 'test' }),
    });

    await serverApiFetch('/test');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.any(Object),
    );
  });

  it('sets Cookie and X-CSRF-Token headers when provided', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({}),
    });

    await serverApiFetch('/test', {}, 'access_token=abc', 'csrf123');

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers.get('Cookie')).toBe('access_token=abc');
    expect(options.headers.get('X-CSRF-Token')).toBe('csrf123');
  });

  it('throws error response on non-ok status', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockResolvedValueOnce({
        error: 'Not Found',
        message: 'Resource not found',
      }),
    });

    await expect(serverApiFetch('/test')).rejects.toEqual({
      error: 'Not Found',
      message: 'Resource not found',
    });
  });

  it('returns parsed JSON on success', async () => {
    const expected = { store: { id: '1' } };
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce(expected),
    });

    const result = await serverApiFetch('/test');
    expect(result).toEqual(expected);
  });
});

import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('./serverConnection', () => ({
  ensureServerReady: vi.fn().mockResolvedValue(undefined),
  serverResponded: vi.fn(),
  serverUnavailable: vi.fn(),
}));
beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

test('ambiguous writes are not replayed automatically; manual retry keeps its key', async () => {
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(new TypeError('connection lost'))
    .mockResolvedValueOnce(new Response(JSON.stringify({ saved: true })));
  vi.stubGlobal('fetch', fetch);
  const { api } = await import('./api');
  await expect(api('/example', { value: 1 })).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
  await api('/example', { value: 1 });
  expect(fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe(
    fetch.mock.calls[1][1].headers['Idempotency-Key'],
  );
});
test('an ordinary unauthenticated session remains a 401, without retry', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'SIGN_IN_REQUIRED' } }), {
        status: 401,
      }),
    );
  vi.stubGlobal('fetch', fetch);
  const { api } = await import('./api');
  await expect(api('/session')).rejects.toMatchObject({
    status: 401,
    code: 'SIGN_IN_REQUIRED',
  });
  expect(fetch).toHaveBeenCalledTimes(1);
});
test('gateway HTML becomes a readable error rather than a JSON parsing exception', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('<html>Gateway</html>', { status: 502 })),
  );
  const { api } = await import('./api');
  await expect(api('/session')).rejects.toThrow('Unable to reach the server');
});

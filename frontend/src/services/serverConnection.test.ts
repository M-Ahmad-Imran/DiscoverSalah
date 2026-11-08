import { afterEach, beforeEach, expect, test, vi } from 'vitest';
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-05'));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
test('concurrent callers share wake-up and retry a gateway response', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response('gateway', { status: 503 }))
    .mockResolvedValue(new Response(JSON.stringify({ status: 'ready' })));
  vi.stubGlobal('fetch', fetch);
  const c = await import('./serverConnection');
  const first = c.ensureServerReady();
  expect(c.ensureServerReady()).toBe(first);
  await vi.advanceTimersByTimeAsync(1600);
  expect(c.connectionSnapshot()).toBe('connecting');
  await vi.advanceTimersByTimeAsync(500);
  await first;
  expect(c.connectionSnapshot()).toBe('idle');
  await c.ensureServerReady();
  expect(fetch).toHaveBeenCalledTimes(2);
});
test('wake-up stops after 90 seconds and can be retried after cooldown', async () => {
  const fetch = vi.fn().mockRejectedValue(new TypeError('offline'));
  vi.stubGlobal('fetch', fetch);
  const c = await import('./serverConnection');
  const result = c.ensureServerReady().catch((error) => error);
  await vi.advanceTimersByTimeAsync(90000);
  expect(await result).toBeInstanceOf(Error);
  expect(c.connectionSnapshot()).toBe('unavailable');
  const calls = fetch.mock.calls.length;
  await expect(c.ensureServerReady()).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(calls);
  await vi.advanceTimersByTimeAsync(5000);
  fetch.mockResolvedValue(new Response(JSON.stringify({ status: 'ready' })));
  await c.ensureServerReady();
  expect(c.connectionSnapshot()).toBe('idle');
});
test('HTML success pages do not count as a ready API', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response('<html>Wake up</html>'))
      .mockResolvedValue(new Response(JSON.stringify({ status: 'ready' }))),
  );
  const c = await import('./serverConnection');
  const result = c.ensureServerReady();
  await vi.advanceTimersByTimeAsync(2000);
  await result;
  expect(c.connectionSnapshot()).toBe('idle');
});

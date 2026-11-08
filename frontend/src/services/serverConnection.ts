type State = 'idle' | 'connecting' | 'unavailable';
let state: State = 'idle';
let lastReady = 0;
let failedAt = 0;
let pending: Promise<void> | undefined;
const listeners = new Set<() => void>();
export const connectionSnapshot = () => state;
export const subscribeConnection = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
function publish(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}
export function serverResponded() {
  lastReady = Date.now();
}
export function serverUnavailable() {
  lastReady = 0;
}
export const connectionError =
  'The server is taking longer than expected. Check your connection and try again.';

/** One wake-up shared by all callers. Never replays a mutation or an upload. */
export function ensureServerReady(): Promise<void> {
  if (pending) return pending;
  if (lastReady && Date.now() - lastReady < 10 * 60000) return Promise.resolve();
  if (failedAt && Date.now() - failedAt < 5000)
    return Promise.reject(new Error(connectionError));
  pending = (async () => {
    const deadline = Date.now() + 90000;
    const message = setTimeout(() => publish('connecting'), 1500);
    try {
      while (Date.now() < deadline) {
        const controller = new AbortController();
        const timer = setTimeout(
          () => controller.abort(),
          Math.min(15000, deadline - Date.now()),
        );
        try {
          const response = await fetch('/health/ready', {
            signal: controller.signal,
            cache: 'no-store',
          });
          if (response.ok && (await response.json())?.status === 'ready') {
            serverResponded();
            failedAt = 0;
            publish('idle');
            return;
          }
        } catch {
          /* Gateway timeouts/HTML and network failures are safe to retry here. */
        } finally {
          clearTimeout(timer);
        }
        const delay = Math.min(2000, deadline - Date.now());
        if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
      }
      failedAt = Date.now();
      publish('unavailable');
      throw new Error(connectionError);
    } finally {
      clearTimeout(message);
    }
  })().finally(() => {
    pending = undefined;
  });
  return pending;
}

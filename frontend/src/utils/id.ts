// getRandomValues works on older Android browsers that lack randomUUID.
// Keep 128 bits of randomness for command idempotency; never use Math.random.
export function requestId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
export const uid = (prefix = 'DS') => `${prefix}-${requestId()}`;

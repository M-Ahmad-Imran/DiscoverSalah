import { errorMessage } from '../i18n/errors';
import { tr } from '../i18n/translate';
import { requestId } from '../utils/id';
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export interface SessionAccount {
  id: string;
  name: string;
  role: 'admin' | 'focal' | 'representative';
  areaIds: string[];
  mustChangePassword: boolean;
  contactConfirmedAt?: string;
}
let csrf = '';
let mfaChallenge = '';
const retryKeys = new Map<string, string>();
export function setChallenge(value: string) {
  mfaChallenge = value;
}
export function getChallenge() {
  return mfaChallenge;
}
export function setCsrf(value: string) {
  csrf = value;
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const signature = path + JSON.stringify(body);
  const key = body === undefined ? undefined : retryKeys.get(signature) || requestId();
  if (key) retryKeys.set(signature, key);
  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    response = await fetch('/api/v1' + path, {
      signal: controller.signal,
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers:
        body === undefined
          ? {}
          : {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrf,
              'Idempotency-Key': key!,
            },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(
      tr('Unable to reach the server. Check your connection and retry the same action.'),
    );
  } finally {
    clearTimeout(timeout);
  }
  const payload = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    if (response.status < 500) retryKeys.delete(signature);
    throw new ApiError(
      response.status,
      payload?.error?.code || 'REQUEST_FAILED',
      errorMessage(
        payload?.error?.code || 'REQUEST_FAILED',
        payload?.error?.message || 'Request failed.',
      ),
    );
  }
  retryKeys.delete(signature);
  if (payload?.csrfToken) csrf = payload.csrfToken;
  return payload as T;
}

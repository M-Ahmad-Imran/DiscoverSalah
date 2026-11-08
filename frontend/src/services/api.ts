import { errorMessage } from '../i18n/errors';
import { tr } from '../i18n/translate';
import { requestId } from '../utils/id';
import {
  ensureServerReady,
  serverResponded,
  serverUnavailable,
} from './serverConnection';
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

export interface UploadedNoticeImage {
  id: string;
  previewUrl: string;
  attachBefore: string;
  bytes: number;
}
/** The caller keeps this key for retries of the same file and mosque. */
export async function uploadNoticeImage(
  file: File,
  venueId: string,
  key: string,
  signal: AbortSignal,
  progress: (percent: number) => void,
): Promise<UploadedNoticeImage> {
  await ensureServerReady().catch(() => {
    throw new Error(
      tr(
        'The server is taking longer than expected. Check your connection and try again.',
      ),
    );
  });
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      'POST',
      '/api/v1/management/notice-images?venueId=' + encodeURIComponent(venueId),
    );
    xhr.withCredentials = true;
    xhr.timeout = 90000;
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.setRequestHeader('X-CSRF-Token', csrf);
    xhr.setRequestHeader('Idempotency-Key', key);
    const abort = () => xhr.abort();
    const cleanup = () => signal.removeEventListener('abort', abort);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        progress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      cleanup();
      let payload;
      try {
        payload = JSON.parse(xhr.responseText);
        serverResponded();
      } catch {
        reject(
          new Error(tr('Unable to read the server response. Retry the same upload.')),
        );
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        const code = payload?.error?.code || 'REQUEST_FAILED';
        reject(
          new ApiError(
            xhr.status,
            code,
            errorMessage(code, payload?.error?.message || 'Image upload failed.'),
          ),
        );
      } else resolve(payload as UploadedNoticeImage);
    };
    xhr.onerror = xhr.ontimeout = () => {
      serverUnavailable();
      cleanup();
      reject(
        new Error(
          tr(
            'Unable to reach the server. Check your connection and retry the same action.',
          ),
        ),
      );
    };
    xhr.onabort = () => {
      cleanup();
      reject(new DOMException('Upload canceled', 'AbortError'));
    };
    if (signal.aborted) {
      reject(new DOMException('Upload canceled', 'AbortError'));
      return;
    }
    signal.addEventListener('abort', abort, { once: true });
    xhr.send(file);
  });
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  await ensureServerReady().catch(() => {
    throw new Error(
      tr(
        'The server is taking longer than expected. Check your connection and try again.',
      ),
    );
  });
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
    serverUnavailable();
    throw new Error(
      tr('Unable to reach the server. Check your connection and retry the same action.'),
    );
  } finally {
    clearTimeout(timeout);
  }
  let payload;
  try {
    payload = response.status === 204 ? null : await response.json();
  } catch {
    serverUnavailable();
    throw new Error(
      tr('Unable to reach the server. Check your connection and retry the same action.'),
    );
  }
  if (response.status >= 500) serverUnavailable();
  else serverResponded();
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

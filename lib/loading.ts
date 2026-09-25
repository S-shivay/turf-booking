'use client';

import { useSyncExternalStore } from 'react';

/**
 * Global loading store — a request counter any code can drive.
 *
 *   start()  → count++      show loader while count > 0
 *   stop()   → count--      hide only when the LAST request finishes
 *
 * Wrapped by `apiFetch` / `withLoader` so every API call is tracked
 * without touching the loader component. Framework-agnostic on purpose:
 * plain module state + useSyncExternalStore for React.
 */

let count = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const loading = {
  start() {
    count += 1;
    emit();
  },
  stop() {
    count = Math.max(0, count - 1);
    emit();
  },
  /** Force-clear (e.g. after a route error boundary). */
  reset() {
    count = 0;
    emit();
  },
  get active() {
    return count > 0;
  },
  get pending() {
    return count;
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

const getSnapshot = () => count > 0;
const getServerSnapshot = () => false;

/** React hook: `true` while at least one tracked request is in flight. */
export function useGlobalLoading(): boolean {
  return useSyncExternalStore(loading.subscribe, getSnapshot, getServerSnapshot);
}

/** Track any promise (or promise-returning function). Hides on success AND error. */
export async function withLoader<T>(task: Promise<T> | (() => Promise<T>)): Promise<T> {
  loading.start();
  try {
    return await (typeof task === 'function' ? task() : task);
  } finally {
    loading.stop();
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Drop-in `fetch` that shows the global loader for the whole request.
 * Pass `{ silent: true }` for background polling that must not block the UI.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit & { silent?: boolean }): Promise<Response> {
  const { silent, ...rest } = init ?? {};
  if (silent) return fetch(input, rest);
  return withLoader(() => fetch(input, rest));
}

/**
 * `apiFetch` + JSON parsing + typed errors. Resolves with the parsed body
 * on 2xx; throws `ApiError` (carrying the server's `{ error, message }`)
 * otherwise. The loader hides either way.
 */
export async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit & { silent?: boolean }): Promise<T> {
  const res = await apiFetch(input, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const b = (body ?? {}) as { error?: string; message?: string };
    throw new ApiError(res.status, b.error ?? 'REQUEST_FAILED', b.message ?? `Request failed (${res.status})`, body);
  }
  return body as T;
}

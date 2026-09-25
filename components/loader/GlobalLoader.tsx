'use client';

import { useEffect } from 'react';
import { CricketTurfLoader } from '@/components/loader/CricketTurfLoader';
import { useGlobalLoading, withLoader } from '@/lib/loading';

/**
 * Mounted once in the root layout. Shows the cricket loader whenever the
 * global request counter is > 0 — i.e. during any `apiFetch` / `apiJson`
 * / `withLoader` call anywhere in the app.
 *
 * Dev aid: open any page with `?demo-loader` to see a fake 3 s request.
 */
export function GlobalLoader() {
  const isLoading = useGlobalLoading();

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (!new URLSearchParams(window.location.search).has('demo-loader')) return;
    void withLoader(new Promise<void>((r) => setTimeout(r, 3000)));
  }, []);

  return <CricketTurfLoader isLoading={isLoading} />;
}

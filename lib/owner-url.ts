// The ledger filter ↔ the URL. Pure, so the server page, the client filter
// bar and the download link all build the same links from the same rules.
//
// Only what differs from the default is written into the query string: a URL
// you can read tells you what you are looking at, and an empty one means
// "everything".

import type { OwnerQuery } from '@/lib/types';

export const OWNER_DEFAULTS: OwnerQuery = {
  page: 1,
  pageSize: 25,
  q: null,
  from: null,
  to: null,
  status: 'all',
};

export function ownerParams(q: OwnerQuery): URLSearchParams {
  const p = new URLSearchParams();
  if (q.q) p.set('q', q.q);
  // A single day is written as `on`, which is what the owner actually picked.
  if (q.from && q.to && q.from === q.to) p.set('on', q.from);
  else {
    if (q.from) p.set('from', q.from);
    if (q.to) p.set('to', q.to);
  }
  if (q.status !== 'all') p.set('status', q.status);
  if (q.pageSize !== OWNER_DEFAULTS.pageSize) p.set('page_size', String(q.pageSize));
  if (q.page > 1) p.set('page', String(q.page));
  return p;
}

/**
 * A link to the same view with something changed. Any change other than the
 * page itself returns to page 1 — landing on page 7 of a filter that now has
 * two results is the kind of small betrayal that makes a tool feel broken.
 */
export function ownerHref(q: OwnerQuery, patch: Partial<OwnerQuery> = {}): string {
  const next: OwnerQuery = { ...q, ...patch, page: patch.page ?? (Object.keys(patch).length ? 1 : q.page) };
  const s = ownerParams(next).toString();
  return s ? `/owner?${s}` : '/owner';
}

export function ownerExportHref(q: OwnerQuery): string {
  // The download is the whole filter, never one page of it.
  const p = ownerParams({ ...q, page: 1 });
  p.delete('page');
  p.delete('page_size');
  const s = p.toString();
  return s ? `/api/owner/export?${s}` : '/api/owner/export';
}

export type PresetKey = 'today' | 'week' | 'upcoming' | 'played' | 'cancelled' | 'all';

/** What each named preset means, expressed as the filter itself. */
export function presetQuery(key: PresetKey, today: string, weekEnd: string): OwnerQuery {
  switch (key) {
    case 'today':
      return { ...OWNER_DEFAULTS, from: today, to: today };
    case 'week':
      return { ...OWNER_DEFAULTS, from: today, to: weekEnd };
    case 'upcoming':
      return { ...OWNER_DEFAULTS, status: 'upcoming' };
    case 'played':
      return { ...OWNER_DEFAULTS, status: 'played' };
    case 'cancelled':
      return { ...OWNER_DEFAULTS, status: 'cancelled' };
    default:
      return { ...OWNER_DEFAULTS };
  }
}

/** Which preset the current view *is*, so one chip can be lit. */
export function activePreset(q: OwnerQuery, today: string, weekEnd: string): PresetKey | null {
  const keys: PresetKey[] = ['today', 'week', 'upcoming', 'played', 'cancelled', 'all'];
  for (const key of keys) {
    const p = presetQuery(key, today, weekEnd);
    if (q.q) return null; // a search is its own view, not a preset
    if (p.from === q.from && p.to === q.to && p.status === q.status) return key;
  }
  return null;
}

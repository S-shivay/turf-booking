import { describe, expect, it } from 'vitest';
import { OWNER_DEFAULTS, activePreset, ownerExportHref, ownerHref, presetQuery } from '@/lib/owner-url';
import { parseOwnerQuery } from '@/lib/validation';

const TODAY = '2026-09-22';
const WEEK_END = '2026-09-28';

describe('parseOwnerQuery', () => {
  it('defaults everything when the URL says nothing', () => {
    expect(parseOwnerQuery({})).toEqual(OWNER_DEFAULTS);
  });

  it('clamps nonsense instead of failing — a filter is a view, not a mutation', () => {
    const q = parseOwnerQuery({ page: 'abc', page_size: '10000', status: 'nope' });
    expect(q.page).toBe(1);
    expect(q.pageSize).toBe(25);
    expect(q.status).toBe('all');
    expect(parseOwnerQuery({ page: '-4' }).page).toBe(1);
    expect(parseOwnerQuery({ page_size: '50' }).pageSize).toBe(50);
  });

  it('treats `on` as a one-day range and rights a backwards one', () => {
    expect(parseOwnerQuery({ on: '2026-09-24' })).toMatchObject({ from: '2026-09-24', to: '2026-09-24' });
    expect(parseOwnerQuery({ from: '2026-09-30', to: '2026-09-22' })).toMatchObject({
      from: '2026-09-22',
      to: '2026-09-30',
    });
  });

  it('ignores a date that is not a date', () => {
    expect(parseOwnerQuery({ from: '24-09-2026', to: '2026-13-45' })).toMatchObject({ from: null, to: null });
  });

  it('strips the LIKE wildcard, which would otherwise match every booking', () => {
    expect(parseOwnerQuery({ q: '%%%' }).q).toBeNull();
    expect(parseOwnerQuery({ q: 'ra%hul' }).q).toBe('rahul');
    expect(parseOwnerQuery({ q: '   ' }).q).toBeNull();
    expect(parseOwnerQuery({ q: 'x'.repeat(200) }).q).toHaveLength(60);
  });

  it('reads back everything a link writes', () => {
    const q = { ...OWNER_DEFAULTS, q: 'rahul', from: '2026-09-22', to: '2026-09-30', status: 'cancelled' as const, page: 3, pageSize: 50 };
    const url = new URL(ownerHref(q, { page: 3 }), 'http://x');
    expect(parseOwnerQuery(url.searchParams)).toEqual(q);
  });
});

describe('ownerHref', () => {
  it('writes only what differs from the default', () => {
    expect(ownerHref(OWNER_DEFAULTS)).toBe('/owner');
    expect(ownerHref(OWNER_DEFAULTS, { q: 'rahul' })).toBe('/owner?q=rahul');
  });

  it('returns to page 1 whenever the filter itself changes', () => {
    const onPage7 = { ...OWNER_DEFAULTS, page: 7 };
    expect(ownerHref(onPage7, { q: 'rahul' })).not.toContain('page=7');
    // …but paging is not a filter change.
    expect(ownerHref(onPage7, { page: 8 })).toContain('page=8');
  });

  it('downloads the whole filter, never one page of it', () => {
    const href = ownerExportHref({ ...OWNER_DEFAULTS, page: 4, pageSize: 100, from: '2026-09-22', to: '2026-09-30' });
    expect(href).not.toMatch(/page/);
    expect(href).toContain('from=2026-09-22');
    expect(href).toContain('to=2026-09-30');
  });
});

describe('presets', () => {
  it('lights the chip for the view you are actually looking at', () => {
    for (const key of ['today', 'week', 'upcoming', 'played', 'cancelled', 'all'] as const) {
      expect(activePreset(presetQuery(key, TODAY, WEEK_END), TODAY, WEEK_END)).toBe(key);
    }
  });

  it('lights none of them once you have typed a search', () => {
    const searched = { ...presetQuery('today', TODAY, WEEK_END), q: 'rahul' };
    expect(activePreset(searched, TODAY, WEEK_END)).toBeNull();
  });

  it('never carries a page over from the view before it', () => {
    expect(presetQuery('today', TODAY, WEEK_END).page).toBe(1);
    expect(presetQuery('all', TODAY, WEEK_END)).toEqual(OWNER_DEFAULTS);
  });
});

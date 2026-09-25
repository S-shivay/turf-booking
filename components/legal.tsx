import type { LegalSection } from '@/lib/types';

/**
 * The shared shell for `/terms` and `/privacy`: a contents list and a numbered
 * body, both driven by the same array so a section can never appear in one and
 * not the other. `t` is the caller's placeholder filler ({turf}, {phone}, …).
 */

export function LegalToc({
  sections,
  title,
  className,
}: {
  sections: readonly LegalSection[];
  title: string;
  className?: string;
}) {
  return (
    <nav aria-label="Sections of this document" className={className}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">{title}</p>
      <ol className="mt-3">
        {sections.map((s, i) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="flex min-h-11 items-center gap-3 text-sm font-semibold hover:text-green-deep"
            >
              <span aria-hidden className="w-5 shrink-0 text-right text-xs font-bold tabular-nums text-muted">
                {i + 1}
              </span>
              {s.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function LegalBody({
  sections,
  t,
}: {
  sections: readonly LegalSection[];
  /** Fills {placeholders} in the copy. */
  t: (s: string) => string;
}) {
  return (
    <div className="max-w-3xl space-y-12 sm:space-y-16">
      {sections.map((s, i) => (
        // scroll-mt clears the fixed navbar when an anchor is followed.
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="min-w-0 scroll-mt-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-green-deep">
            {String(i + 1).padStart(2, '0')}
          </p>
          <h2 id={`${s.id}-title`} className="mt-2 text-2xl font-black uppercase tracking-tight sm:text-3xl">
            {s.title}
          </h2>

          {s.paras?.map((p) => (
            <p key={p.slice(0, 24)} className="mt-4 text-[15px] leading-7 text-ink-soft sm:text-base sm:leading-8">
              {t(p)}
            </p>
          ))}

          {s.bullets && (
            <ul className="mt-5 space-y-4 border-l-2 border-ink/10 pl-5">
              {s.bullets.map((b) => (
                <li key={(b.label ?? '') + b.text.slice(0, 20)} className="text-[15px] leading-7 text-ink-soft">
                  {b.label && <strong className="font-bold text-ink">{t(b.label)}. </strong>}
                  {t(b.text)}
                </li>
              ))}
            </ul>
          )}

          {s.after?.map((p) => (
            <p key={p.slice(0, 24)} className="mt-4 text-[15px] leading-7 text-ink-soft sm:text-base sm:leading-8">
              {t(p)}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}

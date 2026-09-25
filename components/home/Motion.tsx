'use client';

import { useEffect } from 'react';

/**
 * The only scroll JS on the page:
 *  - marks <html> as reveal-ready, then flips `[data-reveal]` elements to
 *    `.is-in` when they enter the viewport (CSS does the animating);
 *  - writes `--scroll-y` for the hero's very light parallax while the hero
 *    is on screen.
 * Both are skipped under prefers-reduced-motion.
 */
export function Motion() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const root = document.documentElement;
    root.classList.add('reveal-ready');

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        root.style.setProperty('--scroll-y', String(y < 1200 ? y : 1200));
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      root.classList.remove('reveal-ready');
    };
  }, []);

  return null;
}

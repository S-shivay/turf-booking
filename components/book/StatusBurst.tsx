'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export const BURST_TONES = ['confirmed', 'waiting', 'failed', 'expired', 'cancelled'] as const;
export type BurstTone = (typeof BURST_TONES)[number];

export function isBurstTone(value: string): value is BurstTone {
  return (BURST_TONES as readonly string[]).includes(value);
}

/**
 * How long each scene holds before it starts leaving. Every one of these is
 * its own animation's full length plus a beat to read the caption — a scene
 * that is cut off mid-flight looks like a bug, not a celebration. Keep these
 * in step with the keyframe delays in `globals.css`: confetti is still falling
 * at 4 s, and the cross only finishes shaking its head at 2 s.
 */
const PLAY_MS: Record<BurstTone, number> = {
  confirmed: 4400,
  waiting: 2400,
  failed: 3300,
  expired: 3300,
  cancelled: 3300,
};
const FADE_MS = 450;
/** Nothing to watch when motion is off, so it just says its line and goes. */
const PLAY_MS_STILL = 1100;

export interface StatusBurstProps {
  tone: BurstTone;
  caption: string;
  onDone: () => void;
}

/**
 * A short film, not a dialog. It plays over the blurred page for a couple of
 * seconds, says what happened in one line and removes itself — the page behind
 * carries every detail and every button, so this never has to be dismissed and
 * never takes a tap. It is `pointer-events-none` throughout: taps fall straight
 * through to the page, and there is no scroll lock to leak.
 */
export function StatusBurst({ tone, caption, onDone }: StatusBurstProps) {
  const [leaving, setLeaving] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // The caller's `onDone` is usually a fresh arrow every render, and the status
  // page re-renders every three seconds as it polls. Depending on it directly
  // would restart the timers each time and the scene would never end, so the
  // effect reads the latest callback through a ref and runs exactly once.
  const latestDone = useRef(onDone);
  useEffect(() => {
    latestDone.current = onDone;
  });

  useEffect(() => {
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const life = still ? PLAY_MS_STILL : PLAY_MS[tone];
    const play = window.setTimeout(() => setLeaving(true), life);
    const done = window.setTimeout(() => latestDone.current(), life + FADE_MS);
    return () => {
      window.clearTimeout(play);
      window.clearTimeout(done);
    };
  }, [tone]);

  if (!mounted) return null;

  // The blur sits on the same element that fades, not on a child: an ancestor
  // animating opacity becomes the backdrop root, and a child's backdrop-filter
  // would then have nothing behind it left to sample.
  return createPortal(
    <div
      aria-hidden
      data-leaving={leaving || undefined}
      className="burst-layer pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-white/70 px-6 backdrop-blur-md"
    >
      <div className="relative flex flex-col items-center">
        <div className="w-[min(76vw,320px)]">
          {tone === 'confirmed' ? <CheersScene /> : tone === 'waiting' ? <WaitScene /> : <StoppedScene />}
        </div>
        <p
          className={cn(
            'burst-caption mt-1 text-center text-[1.75rem] font-black uppercase leading-tight tracking-tight sm:text-4xl',
            tone === 'confirmed' ? 'text-gradient' : tone === 'waiting' ? 'text-ink' : 'text-rose-600',
          )}
        >
          {caption}
        </p>
      </div>

      {tone === 'confirmed' && <Confetti />}
    </div>,
    document.body,
  );
}

// ───────────────────────────────────────────────────────── confirmed

/** Two flutes swing in, clink, and fizz. */
function CheersScene() {
  const id = useId();
  return (
    <svg viewBox="0 0 200 180" className="w-full" role="presentation">
      <defs>
        <linearGradient id={`${id}-fizz`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#16A34A" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
      </defs>

      <g className="cheers-left" style={{ transformOrigin: '72px 166px' }}>
        <Flute x={72} gradient={`url(#${id}-fizz)`} bubbleSeed={0} />
      </g>
      <g className="cheers-right" style={{ transformOrigin: '128px 166px' }}>
        <Flute x={128} gradient={`url(#${id}-fizz)`} bubbleSeed={3} />
      </g>

      {/* the clink */}
      <g className="cheers-spark" style={{ transformOrigin: '100px 44px' }}>
        <g stroke="#22C55E" strokeWidth="4" strokeLinecap="round">
          <path d="M100 18 V4" />
          <path d="M82 26 L72 14" />
          <path d="M118 26 L128 14" />
        </g>
        <g stroke="#38BDF8" strokeWidth="4" strokeLinecap="round">
          <path d="M70 44 H56" />
          <path d="M130 44 H144" />
        </g>
      </g>
    </svg>
  );
}

/** One champagne flute, drawn from the foot up so it can pivot on its base. */
function Flute({ x, gradient, bubbleSeed }: { x: number; gradient: string; bubbleSeed: number }) {
  return (
    <g transform={`translate(${x} 166)`}>
      <ellipse cx="0" cy="2" rx="18" ry="5" fill="#101817" opacity="0.12" />
      <ellipse cx="0" cy="0" rx="17" ry="4.5" fill="#eef4f9" stroke="#101817" strokeOpacity="0.16" strokeWidth="2" />
      <rect x="-3" y="-36" width="6" height="36" rx="3" fill="#dce7f1" stroke="#101817" strokeOpacity="0.1" />
      <path d="M-15 -118 L-10 -52 Q0 -42 10 -52 L15 -118 Z" fill="#fff" opacity="0.92" />
      {/* what's in it */}
      <path d="M-12.6 -96 L-9.6 -52 Q0 -43.5 9.6 -52 L12.6 -96 Z" fill={gradient} opacity="0.9" />
      {/* rim + body outline */}
      <path
        d="M-15 -118 L-10 -52 Q0 -42 10 -52 L15 -118"
        fill="none"
        stroke="#101817"
        strokeOpacity="0.18"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <g fill="#fff">
        {[0, 1, 2, 3].map((i) => {
          const n = i + bubbleSeed;
          return (
            <circle
              key={i}
              className="bubble"
              cx={-6 + ((n * 5) % 13)}
              cy={-52}
              r={1.6 + ((n * 7) % 3) * 0.5}
              style={{
                ['--delay' as string]: `${(0.7 + ((n * 13) % 9) * 0.12).toFixed(2)}s`,
                ['--dur' as string]: `${(1.3 + ((n * 11) % 5) * 0.16).toFixed(2)}s`,
              }}
            />
          );
        })}
      </g>
    </g>
  );
}

// ─────────────────────────────────────────────────────────── waiting

/** A clock with a hand going round — something is still happening. */
function WaitScene() {
  return (
    <svg viewBox="0 0 200 180" className="w-full" role="presentation">
      <circle cx="100" cy="90" r="54" fill="#fff" opacity="0.9" />
      <circle cx="100" cy="90" r="54" fill="none" stroke="#BDEBFF" strokeWidth="8" />
      <circle
        className="ring-draw"
        cx="100"
        cy="90"
        r="54"
        fill="none"
        stroke="#0EA5E9"
        strokeWidth="8"
        strokeLinecap="round"
        transform="rotate(-90 100 90)"
      />
      <g className="clock-hand" style={{ transformOrigin: '100px 90px' }}>
        <path d="M100 90 V52" stroke="#101817" strokeWidth="7" strokeLinecap="round" />
      </g>
      <path d="M100 90 L126 102" stroke="#101817" strokeWidth="7" strokeLinecap="round" opacity="0.35" />
      <circle cx="100" cy="90" r="6" fill="#38BDF8" />
    </svg>
  );
}

// ───────────────────────────────────────────── failed / expired / cancelled

/** A circle and a cross drawn in, then a small shake of the head. */
function StoppedScene() {
  return (
    <svg viewBox="0 0 200 180" className="w-full burst-shake" role="presentation">
      <circle cx="100" cy="90" r="54" fill="#fff" opacity="0.9" />
      <circle
        className="ring-draw"
        cx="100"
        cy="90"
        r="54"
        fill="none"
        stroke="#f43f5e"
        strokeWidth="8"
        strokeLinecap="round"
        transform="rotate(-90 100 90)"
        opacity="0.9"
      />
      <g stroke="#f43f5e" strokeWidth="10" strokeLinecap="round">
        <path className="x-draw" d="M82 72 L118 108" />
        <path className="x-draw x-draw-2" d="M118 72 L82 108" />
      </g>
    </svg>
  );
}

// ────────────────────────────────────────────────────────── confetti

const COLORS = ['#22C55E', '#38BDF8', '#B9F5C8', '#BDEBFF', '#16A34A', '#0EA5E9'];

/**
 * Deterministic on purpose: the same pieces every render, so nothing depends
 * on a random number that the server and the browser would disagree about.
 */
const PIECES = Array.from({ length: 30 }, (_, i) => {
  const r = (seed: number) => {
    const v = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  return {
    left: `${(r(1) * 100).toFixed(2)}%`,
    dx: `${(r(2) * 180 - 90).toFixed(0)}px`,
    // Spread so the rain lasts the whole scene: the last piece lands at
    // ~4.4 s, exactly when the confirmed burst begins to fade.
    delay: `${(0.2 + r(3) * 0.9).toFixed(2)}s`,
    dur: `${(2.1 + r(4) * 1.2).toFixed(2)}s`,
    spin: `${(r(5) * 900 + 360).toFixed(0)}deg`,
    size: 6 + Math.round(r(6) * 7),
    round: r(7) > 0.62,
    color: COLORS[Math.floor(r(8) * COLORS.length)],
  };
});

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: p.left,
            width: p.size,
            height: p.round ? p.size : p.size * 1.8,
            background: p.color,
            borderRadius: p.round ? '50%' : '2px',
            ['--dx' as string]: p.dx,
            ['--delay' as string]: p.delay,
            ['--dur' as string]: p.dur,
            ['--spin' as string]: p.spin,
          }}
        />
      ))}
    </div>
  );
}

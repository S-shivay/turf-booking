'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import s from './CricketTurfLoader.module.css';

type Phase = 'hidden' | 'entering' | 'visible' | 'exiting';

export interface CricketTurfLoaderProps {
  /** Show while true. Hiding is debounced by `minVisibleMs` and faded over `exitMs`. */
  isLoading: boolean;
  /** Message under the scene. */
  message?: string;
  /** Keep the loader on screen at least this long — avoids a flash on fast requests. */
  minVisibleMs?: number;
  /** Fade-out duration. Must match the CSS transition (≈320ms). */
  exitMs?: number;
  /** Selector of the app root that receives `inert` while the loader is up. */
  appRootSelector?: string;
}

const MESSAGES = ['Preparing your turf...', 'Getting the pitch ready...', 'Setting up your game...'];

/**
 * Full-screen, blurred, non-interactive loading overlay with a CSS-3D
 * cricket scene. Controlled purely by `isLoading`; safe to drive from any
 * state (a request counter, React Query, a single fetch).
 */
export function CricketTurfLoader({
  isLoading,
  message,
  minVisibleMs = 500,
  exitMs = 320,
  appRootSelector = '[data-app-root]',
}: CricketTurfLoaderProps) {
  const [phase, setPhase] = useState<Phase>('hidden');
  const shownAt = useRef(0);
  const timers = useRef<number[]>([]);
  const labelId = useId();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  // Pick a message once per mount so it doesn't change mid-load.
  const [text] = useState(() => message ?? MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);

  useEffect(() => {
    const clear = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    clear();

    if (isLoading) {
      setPhase((p) => {
        if (p === 'visible' || p === 'entering') return p;
        shownAt.current = performance.now();
        return 'entering';
      });
      // Two frames so the entering styles paint before we transition in.
      timers.current.push(window.setTimeout(() => setPhase((p) => (p === 'entering' ? 'visible' : p)), 30));
      return clear;
    }

    // Hiding: honour the minimum visible time, then fade, then unmount.
    const remaining = Math.max(0, minVisibleMs - (performance.now() - shownAt.current));
    timers.current.push(
      window.setTimeout(() => {
        setPhase((p) => (p === 'hidden' ? p : 'exiting'));
        timers.current.push(window.setTimeout(() => setPhase('hidden'), exitMs));
      }, remaining),
    );
    return clear;
  }, [isLoading, minVisibleMs, exitMs]);

  // While up: block scroll, make the app inert (no clicks, no Tab focus),
  // and announce to assistive tech.
  const active = phase !== 'hidden';
  useEffect(() => {
    if (!active) return;
    const root = document.querySelector<HTMLElement>(appRootSelector);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    root?.setAttribute('inert', '');
    root?.setAttribute('aria-busy', 'true');
    return () => {
      document.body.style.overflow = prevOverflow;
      root?.removeAttribute('inert');
      root?.removeAttribute('aria-busy');
    };
  }, [active, appRootSelector]);

  if (!mounted || !active) return null;

  return createPortal(
    <div
      className={s.overlay}
      data-phase={phase}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-labelledby={labelId}
    >
      <div className={s.backdrop} />
      <div className={s.card}>
        <div className={s.scene} aria-hidden="true">
          <div className={s.glow} />
          <div className={s.stage}>
            <div className={s.platform} />
            <div className={s.turf} />
            <div className={s.pitch}>
              <div className={s.creaseBox} />
            </div>
            <div className={s.stumpsShadow} />
            <div className={s.stumps}>
              <div className={s.stumpsWobble}>
                <div className={s.stump} />
                <div className={s.stump} />
                <div className={s.stump} />
                <div className={s.bail} />
                <div className={s.bail} />
              </div>
            </div>
            <div className={s.ballShadow} />
            <div className={s.ballTrack}>
              <div className={s.ballLift}>
                <div className={s.ball}>
                  <div className={s.seam} />
                  <div className={s.seam2} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <p id={labelId} className={s.message}>
          {text}
        </p>
        <p className={s.hint}>Cricket · Turf · Booking</p>
      </div>
    </div>,
    document.body,
  );
}

import type { CSSProperties } from 'react';

// Inline SVG art for the homepage. Pure markup + CSS animation — no JS,
// no image requests. Everything here is decorative (aria-hidden).

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;
const css = (o: Record<string, string | number>) => o as CSSProperties;

/* ───────────────────────────── Hero scene ───────────────────────────── */

const CRICKET_PATH = 'M 120 372 C 220 150, 420 120, 600 210';
const SHUTTLE_PATH = 'M 610 118 C 560 60, 470 70, 430 150';

export function HeroScene({ compact = false }: { compact?: boolean }) {
  // Unique gradient ids per instance: the compact and full scenes both live
  // in the DOM (one is display:none) and a hidden <defs> would win the lookup.
  const u = compact ? 'hgc' : 'hgd';
  return (
    <svg viewBox="0 0 720 520" className="h-auto w-full" aria-hidden>
      <defs>
        <linearGradient id={`${u}-ground`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#b9f5c8" />
          <stop offset="1" stopColor="#bdebff" />
        </linearGradient>
        <linearGradient id={`${u}-green`} x1="0" x2="1">
          <stop offset="0" stopColor="#22c55e" stopOpacity="0" />
          <stop offset="0.5" stopColor="#22c55e" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${u}-blue`} x1="0" x2="1">
          <stop offset="0" stopColor="#38bdf8" stopOpacity="0" />
          <stop offset="0.5" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${u}-glow-g`}>
          <stop offset="0" stopColor="#22c55e" stopOpacity="0.35" />
          <stop offset="1" stopColor="#22c55e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${u}-glow-b`}>
          <stop offset="0" stopColor="#38bdf8" stopOpacity="0.35" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${u}-willow`} x1="0" x2="1">
          <stop offset="0" stopColor="#fbf3df" />
          <stop offset="1" stopColor="#e9d5a8" />
        </linearGradient>
        <clipPath id={`${u}-ball`}>
          <circle cx="0" cy="0" r="30" />
        </clipPath>
      </defs>

      {/* depth 0: glows + ground */}
      <g className="hero-layer" style={css({ '--depth': 0.04 })}>
        <circle cx="200" cy="140" r="170" fill={`url(#${u}-glow-g)`} />
        <circle cx="560" cy="330" r="190" fill={`url(#${u}-glow-b)`} />
        <ellipse cx="360" cy="440" rx="330" ry="58" fill={`url(#${u}-ground)`} opacity="0.9" />
        <g stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.5" fill="none">
          <ellipse cx="360" cy="440" rx="250" ry="40" />
          <ellipse cx="360" cy="440" rx="150" ry="22" />
          <line x1="360" y1="382" x2="360" y2="498" />
        </g>
        <g stroke="#22c55e" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" fill="none">
          {Array.from({ length: 22 }, (_, i) => {
            const x = 60 + i * 28;
            const dx = i % 2 ? 9 : -6;
            return <path key={i} d={`M ${x} 470 q 4 -14 ${dx} -20`} />;
          })}
        </g>
      </g>

      {/* particles */}
      <g>
        {[
          [120, 90, 3, 4.5, 0],
          [640, 80, 2, 5, 0.6],
          [90, 300, 2.5, 6, 1.2],
          [500, 60, 2, 4, 1.8],
          [670, 250, 3, 5.5, 0.3],
          [300, 40, 2, 6.5, 2.4],
        ].map(([x, y, r, d, del], i) => (
          <circle
            key={i}
            className="particle"
            cx={x}
            cy={y}
            r={r}
            fill={i % 2 ? '#38bdf8' : '#22c55e'}
            style={css({ '--dur': `${d}s`, '--delay': `${del}s`, transformBox: 'fill-box', transformOrigin: 'center' })}
          />
        ))}
      </g>

      {/* depth 1: motion trails */}
      <g className="hero-layer" style={css({ '--depth': 0.08 })} fill="none" strokeWidth="4" strokeLinecap="round">
        <path className="trail-cricket" d={CRICKET_PATH} stroke={`url(#${u}-green)`} />
        {!compact && <path className="trail-shuttle" d={SHUTTLE_PATH} stroke={`url(#${u}-blue)`} />}
      </g>

      {/* bat (bottom-left) */}
      <g className="hero-layer" style={css({ '--depth': 0.12 })}>
        <g className="bat-swing" style={css({ transformBox: 'fill-box', transformOrigin: '82% 92%' })}>
          <g transform="translate(112 300) rotate(-28)">
            <rect
              x="-22"
              y="-90"
              width="44"
              height="150"
              rx="12"
              fill={`url(#${u}-willow)`}
              stroke="#d8c08c"
              strokeWidth="2"
            />
            <rect x="-6" y="-70" width="12" height="100" rx="6" fill="#ffffff" fillOpacity="0.5" />
            <rect x="-9" y="56" width="18" height="70" rx="7" fill="#101817" />
            <rect
              x="-9"
              y="56"
              width="18"
              height="70"
              rx="7"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="3 5"
            />
          </g>
        </g>
      </g>

      {/* cricket ball on the arc */}
      <g className="ball-cricket" style={css({ offsetPath: `path("${CRICKET_PATH}")`, offsetRotate: '0deg' })}>
        <circle r="24" fill="#22c55e" opacity="0.14" />
        <circle r="15" fill="#e11d48" stroke="#9f1239" strokeWidth="1.5" />
        <path
          d="M -8 -12 q 8 12 0 24 M 8 -12 q -8 12 0 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.6"
          strokeDasharray="2 2.5"
        />
      </g>

      {/* football (right) */}
      <g className="hero-layer" style={css({ '--depth': 0.1 })}>
        <g transform={compact ? 'translate(560 300)' : 'translate(560 320)'}>
          <g className="football-drift" style={css({ transformBox: 'fill-box', transformOrigin: 'center' })}>
            <circle r="46" fill="#ffffff" stroke="#101817" strokeWidth="2.5" />
            <g clipPath={`url(#${u}-ball)`} transform="scale(1.53)">
              <polygon points="0,-11 10,-3 6,9 -6,9 -10,-3" fill="#101817" />
              <g fill="#101817">
                <polygon points="0,-30 10,-22 6,-16 -6,-16 -10,-22" transform="translate(0 4)" />
                <polygon points="22,-8 30,0 26,10 16,8 14,-2" transform="translate(4 -2)" />
                <polygon points="-22,-8 -14,-2 -16,8 -26,10 -30,0" transform="translate(-4 -2)" />
                <polygon points="14,20 22,26 16,32 8,30 6,22" transform="translate(4 4)" />
                <polygon points="-14,20 -6,22 -8,30 -16,32 -22,26" transform="translate(-4 4)" />
              </g>
              <path
                d="M0 -11 L0 -26 M10 -3 L22 -8 M6 9 L14 20 M-6 9 L-14 20 M-10 -3 L-22 -8"
                stroke="#101817"
                strokeWidth="1.4"
                fill="none"
              />
            </g>
            <circle r="46" fill={`url(#${u}-glow-b)`} opacity="0.5" />
          </g>
        </g>
      </g>

      {/* racket + shuttle — desktop only */}
      {!compact && (
        <>
          <g className="hero-layer" style={css({ '--depth': 0.14 })}>
            <g transform="translate(640 140) rotate(32)">
              <ellipse cx="0" cy="-58" rx="40" ry="54" fill="#f0faff" stroke="#101817" strokeWidth="2.5" />
              <g stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.8">
                {[-30, -20, -10, 0, 10, 20, 30].map((x) => (
                  <line key={`v${x}`} x1={x} y1="-108" x2={x} y2="-8" />
                ))}
                {[-100, -88, -76, -64, -52, -40, -28, -16].map((y) => (
                  <line key={`h${y}`} x1="-38" y1={y} x2="38" y2={y} />
                ))}
              </g>
              <path d="M -6 -6 L -5 20 L 5 20 L 6 -6 Z" fill="#101817" />
              <rect x="-7" y="20" width="14" height="60" rx="6" fill="#101817" />
              <rect
                x="-7"
                y="20"
                width="14"
                height="60"
                rx="6"
                fill="none"
                stroke="#22c55e"
                strokeWidth="1.5"
                strokeDasharray="3 5"
              />
            </g>
          </g>
          <g
            className="ball-shuttle"
            style={css({ offsetPath: `path("${SHUTTLE_PATH}")`, offsetRotate: 'auto 90deg' })}
          >
            <g transform="rotate(-90)">
              <path
                d="M -12 -2 L -22 -30 Q 0 -40 22 -30 L 12 -2 Z"
                fill="#ffffff"
                stroke="#101817"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M -8 -6 L -14 -30 M 0 -8 L 0 -34 M 8 -6 L 14 -30"
                stroke="#38bdf8"
                strokeWidth="1.2"
                fill="none"
              />
              <circle cx="0" cy="4" r="9" fill="#22c55e" stroke="#101817" strokeWidth="1.6" />
            </g>
          </g>
        </>
      )}
    </svg>
  );
}

/* ───────────────────────────── Sport card visuals ───────────────────── */

export function CricketArt() {
  return (
    <svg viewBox="0 0 240 160" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="ca-w" x1="0" x2="1">
          <stop offset="0" stopColor="#fbf3df" />
          <stop offset="1" stopColor="#e9d5a8" />
        </linearGradient>
      </defs>
      <ellipse cx="120" cy="138" rx="96" ry="14" fill="#b9f5c8" opacity="0.7" />
      <g
        className="transition-transform duration-500 ease-out group-hover:-rotate-6"
        style={css({ transformOrigin: '70px 130px' })}
      >
        <g transform="translate(72 96) rotate(-32)">
          <rect x="-16" y="-70" width="32" height="104" rx="9" fill="url(#ca-w)" stroke="#d8c08c" strokeWidth="1.5" />
          <rect x="-6" y="34" width="12" height="42" rx="5" fill="#101817" />
        </g>
      </g>
      <path
        d="M 96 100 C 120 70, 140 66, 160 64"
        fill="none"
        stroke="#22c55e"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="4 7"
        opacity="0.7"
      />
      <g className="transition-transform duration-500 ease-out group-hover:translate-x-6 group-hover:-translate-y-3">
        <circle cx="160" cy="64" r="16" fill="#e11d48" stroke="#9f1239" strokeWidth="1.5" />
        <path
          d="M 152 52 q 8 12 0 24 M 168 52 q -8 12 0 24"
          fill="none"
          stroke="#fff"
          strokeWidth="1.5"
          strokeDasharray="2 2.5"
        />
      </g>
      <g stroke="#101817" strokeWidth="3" strokeLinecap="round">
        <line x1="196" y1="88" x2="196" y2="132" />
        <line x1="208" y1="88" x2="208" y2="132" />
        <line x1="220" y1="88" x2="220" y2="132" />
        <line x1="193" y1="86" x2="223" y2="86" strokeWidth="4" />
      </g>
    </svg>
  );
}

export function FootballArt() {
  return (
    <svg viewBox="0 0 240 160" className="h-full w-full" aria-hidden>
      <ellipse cx="120" cy="138" rx="96" ry="14" fill="#bdebff" opacity="0.7" />
      <g stroke="#101817" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M 140 44 L 140 124 M 228 44 L 228 124 M 140 44 L 228 44" />
        <path d="M 140 44 L 160 30 L 228 30 L 228 44 M 228 30 L 228 110" strokeWidth="2" opacity="0.5" />
      </g>
      <g stroke="#38bdf8" strokeWidth="1" opacity="0.6">
        {[152, 164, 176, 188, 200, 212].map((x) => (
          <line key={x} x1={x} y1="46" x2={x} y2="124" />
        ))}
        {[56, 68, 80, 92, 104, 116].map((y) => (
          <line key={y} x1="142" y1={y} x2="226" y2={y} />
        ))}
      </g>
      <path
        d="M 98 100 C 110 96, 122 96, 134 92"
        fill="none"
        stroke="#22c55e"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="4 7"
        opacity="0.7"
      />
      <g
        className="transition-transform duration-500 ease-out group-hover:translate-x-16 group-hover:rotate-45"
        style={css({ transformOrigin: '72px 100px' })}
      >
        <circle cx="72" cy="100" r="26" fill="#fff" stroke="#101817" strokeWidth="2.2" />
        <polygon points="72,88 82,95 78,107 66,107 62,95" fill="#101817" />
        <path
          d="M72 88 L72 76 M82 95 L94 92 M78 107 L86 118 M66 107 L58 118 M62 95 L50 92"
          stroke="#101817"
          strokeWidth="1.3"
          fill="none"
        />
      </g>
    </svg>
  );
}

export function BadmintonArt() {
  return (
    <svg viewBox="0 0 240 160" className="h-full w-full" aria-hidden>
      <ellipse cx="120" cy="138" rx="96" ry="14" fill="#b9f5c8" opacity="0.7" />
      <g
        className="transition-transform duration-500 ease-out group-hover:-rotate-12"
        style={css({ transformOrigin: '84px 120px' })}
      >
        <g transform="translate(84 120) rotate(-28)">
          <ellipse cx="0" cy="-58" rx="30" ry="40" fill="#f0faff" stroke="#101817" strokeWidth="2.2" />
          <g stroke="#38bdf8" strokeWidth="0.9" opacity="0.9">
            {[-20, -10, 0, 10, 20].map((x) => (
              <line key={x} x1={x} y1="-96" x2={x} y2="-20" />
            ))}
            {[-88, -76, -64, -52, -40, -28].map((y) => (
              <line key={y} x1="-28" y1={y} x2="28" y2={y} />
            ))}
          </g>
          <rect x="-5" y="-18" width="10" height="52" rx="4" fill="#101817" />
        </g>
      </g>
      <path
        d="M 112 84 C 130 62, 148 58, 166 60"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="4 7"
        opacity="0.7"
      />
      <g className="transition-transform duration-500 ease-out group-hover:translate-x-5 group-hover:-translate-y-4">
        <g transform="translate(168 56) rotate(35)">
          <path
            d="M -10 -2 L -18 -26 Q 0 -34 18 -26 L 10 -2 Z"
            fill="#fff"
            stroke="#101817"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M -6 -5 L -11 -26 M 0 -7 L 0 -30 M 6 -5 L 11 -26" stroke="#38bdf8" strokeWidth="1.1" fill="none" />
          <circle cx="0" cy="3" r="7" fill="#22c55e" stroke="#101817" strokeWidth="1.5" />
        </g>
      </g>
    </svg>
  );
}

export function SportArt({ id }: { id: string }) {
  if (id === 'football') return <FootballArt />;
  if (id === 'badminton') return <BadmintonArt />;
  return <CricketArt />;
}

/* ───────────────────────────── Small sport icons ────────────────────── */

export function SportIcon({ id, className = 'h-7 w-7' }: { id: string; className?: string }) {
  if (id === 'football')
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7l4 3-1.5 4.5h-5L8 10z" fill="currentColor" stroke="none" />
        <path d="M12 7V3.5M16 10l3.4-1.2M14.5 14.5l2.3 3M9.5 14.5l-2.3 3M8 10L4.6 8.8" />
      </svg>
    );
  if (id === 'badminton')
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
        <ellipse cx="9" cy="8" rx="5" ry="6.5" transform="rotate(-30 9 8)" />
        <path d="M12.5 12.5 19 19" strokeWidth="2.4" />
        <path d="M6 8h6M9 4v8" strokeWidth="0.9" opacity="0.7" />
        <circle cx="19" cy="6" r="1.8" fill="currentColor" stroke="none" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M4.5 19.5 14 10" strokeWidth="2.6" />
      <rect
        x="11.5"
        y="3"
        width="6"
        height="11"
        rx="2.5"
        transform="rotate(45 14.5 8.5)"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <circle cx="18.5" cy="17.5" r="2.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ───────────────────────────── Facility icons ───────────────────────── */

export function FacilityIcon({ name, className = 'h-6 w-6' }: { name: string; className?: string }) {
  const p = { className, 'aria-hidden': true, viewBox: '0 0 24 24', ...stroke };
  switch (name) {
    case 'goal':
      return (
        <svg {...p}>
          <path d="M3 20V6h18v14M3 20h18" />
          <path d="M7 6v14M11 6v14M15 6v14M19 6v14M3 10h18M3 14h18" opacity="0.5" strokeWidth="1" />
        </svg>
      );
    case 'bat':
      return (
        <svg {...p}>
          <path d="M4 20l5-5" strokeWidth="2.6" />
          <rect x="10" y="3" width="6" height="12" rx="2.5" transform="rotate(45 13 9)" />
          <circle cx="19" cy="18" r="2" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'wicket':
      return (
        <svg {...p}>
          <path d="M7 21V8M12 21V8M17 21V8" strokeWidth="2.2" />
          <path d="M5 7h5M14 7h5" strokeWidth="2.4" />
        </svg>
      );
    case 'net':
      return (
        <svg {...p}>
          <path d="M3 5v14M21 5v14M3 9h18" />
          <path d="M3 12h18M3 15h18M7 9v9M11 9v9M15 9v9M19 9v9" strokeWidth="0.9" opacity="0.6" />
        </svg>
      );
    case 'parking':
      return (
        <svg {...p}>
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
        </svg>
      );
    case 'bath':
      return (
        <svg {...p}>
          <path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" />
          <path d="M6 12V6a2 2 0 0 1 4 0M7 21v-2M17 21v-2" />
        </svg>
      );
    case 'cafe':
      return (
        <svg {...p}>
          <path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
          <path d="M16 10h2a2.5 2.5 0 0 1 0 5h-2M7 5.5c0-1 1-1 1-2M11 5.5c0-1 1-1 1-2" />
        </svg>
      );
    case 'food':
      return (
        <svg {...p}>
          <path d="M4 14c0-4 3.6-7 8-7s8 3 8 7z" />
          <path d="M3 17h18M5 20h14" />
          <circle cx="9" cy="11" r="0.8" fill="currentColor" stroke="none" />
          <circle cx="13" cy="10" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'drink':
      return (
        <svg {...p}>
          <path d="M8 3h8l-1 18H9z" />
          <path d="M8.5 9h7" />
          <path d="M12 12l-1.5 3h3L12 18" strokeWidth="1.4" />
        </svg>
      );
    case 'seat':
      return (
        <svg {...p}>
          <path d="M5 11V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5" />
          <path d="M3 12a2 2 0 0 1 2 2v3h14v-3a2 2 0 0 1 2-2" />
          <path d="M6 17v3M18 17v3M5 14h14" />
        </svg>
      );
    case 'cctv':
      return (
        <svg {...p}>
          <path d="M3 8l12-4 2 5-12 4z" />
          <path d="M6 13l-1 5h5M17 9l3-1" />
          <circle cx="13.5" cy="7" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

/* ───────────────────────────── Experience illustrations ─────────────── */

export function ExperienceArt({ id }: { id: string }) {
  if (id === 'refresh')
    return (
      <svg viewBox="0 0 160 120" className="h-full w-full" aria-hidden>
        <ellipse cx="80" cy="104" rx="56" ry="8" fill="#bdebff" opacity="0.7" />
        <path d="M46 48h60l-5 46a8 8 0 0 1-8 7H59a8 8 0 0 1-8-7z" fill="#fff" stroke="#101817" strokeWidth="2.2" />
        <path d="M106 54h8a9 9 0 0 1 0 18h-9" fill="none" stroke="#101817" strokeWidth="2.2" />
        <path d="M52 62h48" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" opacity="0.6" />
        <g stroke="#22c55e" strokeWidth="2" strokeLinecap="round" fill="none" className="animate-float">
          <path d="M66 36c0-6 6-6 6-12M78 38c0-6 6-6 6-12M90 36c0-6 6-6 6-12" />
        </g>
      </svg>
    );
  if (id === 'relax')
    return (
      <svg viewBox="0 0 160 120" className="h-full w-full" aria-hidden>
        <ellipse cx="80" cy="104" rx="60" ry="8" fill="#b9f5c8" opacity="0.7" />
        <path
          d="M30 60a10 10 0 0 1 10 10v10h80V70a10 10 0 0 1 10-10"
          fill="#f0faff"
          stroke="#101817"
          strokeWidth="2.2"
        />
        <path d="M40 60V38a8 8 0 0 1 8-8h64a8 8 0 0 1 8 8v22" fill="#fff" stroke="#101817" strokeWidth="2.2" />
        <path d="M40 80v14M120 80v14" stroke="#101817" strokeWidth="2.2" strokeLinecap="round" />
        <circle
          cx="122"
          cy="26"
          r="9"
          fill="#22c55e"
          opacity="0.9"
          className="animate-float"
          style={css({ transformOrigin: 'center', transformBox: 'fill-box' })}
        />
        <path d="M112 30a20 20 0 0 1 20-8" stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 160 120" className="h-full w-full" aria-hidden>
      <ellipse cx="80" cy="104" rx="60" ry="8" fill="#b9f5c8" opacity="0.8" />
      <path
        d="M20 92 C 50 40, 110 40, 140 92"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="5 8"
        opacity="0.8"
      />
      <g className="animate-float" style={css({ transformOrigin: 'center', transformBox: 'fill-box' })}>
        <circle cx="80" cy="40" r="16" fill="#e11d48" stroke="#9f1239" strokeWidth="1.5" />
        <path
          d="M72 28q8 12 0 24M88 28q-8 12 0 24"
          fill="none"
          stroke="#fff"
          strokeWidth="1.5"
          strokeDasharray="2 2.5"
        />
      </g>
      <g transform="translate(120 84) rotate(-35)">
        <rect x="-8" y="-40" width="16" height="52" rx="6" fill="#f5e6c8" stroke="#d8c08c" strokeWidth="1.5" />
        <rect x="-3" y="12" width="6" height="22" rx="3" fill="#101817" />
      </g>
    </svg>
  );
}

/* ───────────────────────────── Community icons ──────────────────────── */

export function CommunityIcon({ id, className = 'h-8 w-8' }: { id: string; className?: string }) {
  const p = { className, 'aria-hidden': true, viewBox: '0 0 24 24', ...stroke };
  switch (id) {
    case 'teams':
      return (
        <svg {...p}>
          <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case 'corporate':
      return (
        <svg {...p}>
          <rect x="3" y="7" width="18" height="13" rx="3" />
          <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" />
        </svg>
      );
    case 'lovers':
      return (
        <svg {...p}>
          <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <circle cx="9" cy="8" r="3.2" />
          <circle cx="17" cy="9" r="2.6" />
          <path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M15 13.8c2.8 0 5 1.8 5 4.7" />
        </svg>
      );
  }
}

/* ───────────────────────────── Final CTA silhouettes ────────────────── */

export function Silhouettes() {
  return (
    <svg
      viewBox="0 0 1200 400"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="sil-g" x1="0" x2="1">
          <stop offset="0" stopColor="#22c55e" stopOpacity="0.35" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <g className="silhouette" fill="url(#sil-g)">
        <path d="M180 330c-12-30 2-60 18-78l-22-40 14-8 22 36c20-8 40 0 46 22l10 68h-18l-8-52-10 8 6 44z" />
        <circle cx="205" cy="180" r="16" />
        <path d="M700 330l14-70-30-20-8 40-26 30-14-10 30-38-6-50 40-12 36 36-12 24 24 50-16 8-26-44-10 24 10 32z" />
        <circle cx="708" cy="164" r="16" />
        <circle cx="770" cy="322" r="14" fill="#38bdf8" fillOpacity="0.45" />
      </g>
      <g className="silhouette-2" fill="url(#sil-g)">
        <path d="M1000 330l10-64-22-26-14 30-30 12-6-14 30-16 12-46 30-22 16 8 34-70 14 8-34 76-12 34 20 62-18 6-18-48-8 24 10 46z" />
        <circle cx="1024" cy="150" r="15" />
        <path d="M1060 60l10-6 18 30-10 6z" fill="#22c55e" fillOpacity="0.4" />
      </g>
      <g stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1">
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1={i * 100} y1="0" x2={i * 100 + 200} y2="400" />
        ))}
      </g>
    </svg>
  );
}

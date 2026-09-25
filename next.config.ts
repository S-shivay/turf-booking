import type { NextConfig } from 'next';

// CSP is set per-request (with a nonce) in proxy.ts. Everything else that
// doesn't need a nonce lives here so it also covers API routes and assets.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  /**
   * Phones on the same Wi-Fi. `next dev` serves its HMR socket and other dev
   * endpoints only to the host it was started with, so opening the site at
   * http://192.168.x.x:3000 leaves the dev runtime retrying a websocket that
   * is refused — the HTML renders, nothing hydrates, and every tap does
   * nothing. `*` matches one label, so these cover the private ranges a home
   * router hands out, whatever address the laptop gets today.
   *
   * Development only — Next ignores this in a production build.
   */
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*', '*.local'],
  // Hide the floating Next.js dev badge (the bottom-left "N"). Compile and
  // runtime errors are still surfaced in the browser and terminal.
  devIndicators: false,
  images: {
    // Turf photos are plain URLs in the DB; Google avatars come from lh3.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      /**
       * HSTS only where it means anything. Served over plain http — a
       * production build opened at http://192.168.x.x to test on a phone —
       * the browser records the policy for the origin and then upgrades every
       * asset request to https, which this server does not speak: the page
       * paints and every script dies with ERR_SSL_PROTOCOL_ERROR. Behind
       * Vercel's TLS termination `x-forwarded-proto` is `https`, so the
       * header goes out on every real request.
       */
      {
        source: '/(.*)',
        has: [{ type: 'header', key: 'x-forwarded-proto', value: 'https' }],
        headers: [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }],
      },
    ];
  },
};

export default nextConfig;

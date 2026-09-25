import { NextResponse, type NextRequest } from 'next/server';

/**
 * Proxy (Next 16's name for middleware). Two jobs, both cheap:
 *
 * 1. Per-request CSP nonce. Next attaches it to its own scripts; we pass it
 *    to the Razorpay <Script> via the `x-nonce` request header.
 * 2. Optimistic redirect: /owner/* without a session cookie → sign-in.
 *    This is a UX shortcut only — the real role check happens in
 *    app/owner/layout.tsx and every owner API route via requireOwner().
 *
 * No Prisma here. Proxy runs on every page request.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/owner')) {
    const hasSession =
      request.cookies.has('__Secure-authjs.session-token') || request.cookies.has('authjs.session-token');
    if (!hasSession) {
      const url = new URL('/api/auth/signin', request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  /**
   * `upgrade-insecure-requests` belongs on an https origin and nowhere else.
   * Sent over plain http — a production build opened at http://192.168.x.x for
   * phone testing — it rewrites every script URL to https, the server does not
   * speak TLS, and the whole bundle dies with ERR_SSL_PROTOCOL_ERROR: the HTML
   * paints and nothing works. On Vercel the proxy sits behind TLS termination,
   * so the scheme is read from `x-forwarded-proto` first.
   */
  const isHttps =
    (request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '')).split(',')[0].trim() ===
    'https';
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Tailwind injects no inline styles at runtime, but Razorpay's checkout
    // bootstrap and Next's own style tags do.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://checkout.razorpay.com`,
    `frame-src https://api.razorpay.com https://checkout.razorpay.com https://maps.google.com https://www.google.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self' https://accounts.google.com`,
    `frame-ancestors 'none'`,
    ...(!isDev && isHttps ? ['upgrade-insecure-requests'] : []),
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      // `_next` is excluded whole, not just `_next/static` and `_next/image`.
      // It also carries the dev HMR websocket (`/_next/hmr`): running the
      // proxy over that upgrade request answers it with an ordinary response,
      // the handshake fails with ERR_INVALID_HTTP_RESPONSE, and the dev
      // runtime retries forever without ever hydrating the page.
      source: '/((?!api|_next|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};

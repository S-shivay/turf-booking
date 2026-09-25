import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MobileCTA } from '@/components/MobileCTA';
import { GlobalLoader } from '@/components/loader/GlobalLoader';
import { site } from '@/lib/site';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'], display: 'swap' });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: 'Sports Turf — Cricket, Football & Badminton | Book Online', template: '%s' },
  description:
    'A premium sports turf for cricket, football and badminton. Check live availability, book your slot online and get on the turf in minutes.',
  robots: { index: true, follow: true },
  openGraph: { type: 'website', locale: 'en_IN', siteName: 'Sports Turf' },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en-IN"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/*
       * suppressHydrationWarning is here for browser extensions, not for our own
       * code. Grammarly and friends stamp attributes on <body> (data-gr-ext-installed,
       * data-new-gr-c-s-check-loaded) before React hydrates, and React reports the
       * mismatch — which in dev pops the error overlay and locks page scroll, so the
       * site looks broken to anyone running one. It applies one level deep: this
       * element's own attributes and text, never its children, so a real mismatch
       * inside the app is still reported.
       */}
      <body suppressHydrationWarning className="min-h-full bg-white font-sans text-ink">
        {/* Everything inside becomes inert (no clicks, no focus) while the global loader is up. */}
        <div data-app-root className="flex min-h-full flex-col">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to content
          </a>
          <Navbar />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <MobileCTA />
        </div>
        <GlobalLoader />
      </body>
    </html>
  );
}

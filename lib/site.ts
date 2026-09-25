// Non-secret site config. Safe on client and server.
// Turf name, address, phone, email come from the Turf row; these are the
// bits a DB row doesn't carry. Placeholders stay until real values are set.

export const site = {
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  city: process.env.NEXT_PUBLIC_TURF_CITY ?? '[CITY]',
  area: process.env.NEXT_PUBLIC_TURF_AREA ?? '[AREA]',
  state: process.env.NEXT_PUBLIC_TURF_STATE ?? '',
  /** Digits with country code, e.g. 919876543210. Falls back to the turf phone. */
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? '',
  /** Optional logo in /public. A placeholder mark is shown until it exists. */
  logoSrc: process.env.NEXT_PUBLIC_LOGO_SRC ?? '',
  /**
   * Optional registered business name, if the turf trades under a company
   * rather than its own name — e.g. "Acme Sports Pvt Ltd". Left empty, the
   * terms name the turf itself as the party you contract with, which is
   * correct for a turf run under its own name. Never invent one: a contract
   * that names the wrong business is worse than one that names none.
   */
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME ?? '',
} as const;

export function whatsappLink(fallbackPhone: string, text?: string): string {
  const raw = site.whatsapp || fallbackPhone;
  const digits = raw.replace(/\D/g, '');
  const intl = digits.length === 10 ? `91${digits}` : digits;
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${intl}${q}`;
}

/** Placeholder-aware display helpers. */
export const placeholder = {
  turf: '[TURF NAME]',
  phone: '[PHONE NUMBER]',
  email: '[EMAIL]',
  address: '[ADDRESS]',
};

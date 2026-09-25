import { ImageResponse } from 'next/og';
import { getTurf } from '@/lib/bookings';
import { site } from '@/lib/site';

export const alt = 'Box cricket turf — book slots online';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Shared-link card (WhatsApp, Instagram DMs). Brand gradient, name, city,
// price — the three things that make someone tap.
//
// Satori quirk: every text-bearing element must have exactly ONE string
// child. Mixed children like `text {expr}` crash the renderer, so all
// strings are pre-built with template literals.
export default async function Image() {
  const turf = await getTurf();
  const name = turf?.name ?? 'Box Cricket Turf';
  const price = turf?.pricePerPersonPerSlot ?? 50;
  const where = site.area ? `${site.area}, ${site.city}` : site.city;

  const eyebrow = `BOX CRICKET TURF · ${site.city.toUpperCase()}`;
  const tagline = `Floodlit cricket ground in ${where}`;
  const pill = `Book online · ₹${price} per player`;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 64,
        background: 'linear-gradient(135deg, #dbeeff 0%, #ffffff 45%, #d6f5e0 100%)',
        color: '#0f3a66',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 28, fontWeight: 700, color: '#248f55' }}>
        <div style={{ width: 14, height: 14, borderRadius: 99, background: '#3dcb7a' }} />
        <div>{eyebrow}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>{name}</div>
        <div style={{ fontSize: 40, fontWeight: 600, color: '#1f6fc2' }}>{tagline}</div>
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 30, fontWeight: 700 }}>
        <div style={{ padding: '14px 28px', borderRadius: 99, background: '#3b9eff', color: '#fff' }}>{pill}</div>
        <div style={{ padding: '14px 28px', borderRadius: 99, background: '#fff', border: '3px solid #bfe0ff' }}>
          6 AM – 1 AM
        </div>
      </div>
    </div>,
    { ...size },
  );
}

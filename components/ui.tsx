import Image from 'next/image';
import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------- Button

type Variant = 'gradient' | 'dark' | 'outline' | 'ghost' | 'white';
type Size = 'sm' | 'md' | 'lg' | 'xl';

const variantClass: Record<Variant, string> = {
  gradient:
    'btn-gradient text-white shadow-[0_14px_36px_-12px_rgba(34,197,94,.7)] hover:shadow-[0_18px_44px_-12px_rgba(56,189,248,.8)]',
  dark: 'bg-ink text-white hover:bg-ink/90',
  outline: 'bg-white/70 text-ink inset-ring-1 inset-ring-ink/15 hover:inset-ring-ink/40 hover:bg-white',
  ghost: 'text-ink hover:bg-ink/5',
  white: 'bg-white text-ink shadow-[0_14px_36px_-16px_rgba(255,255,255,.8)] hover:bg-soft-green',
};

const sizeClass: Record<Size, string> = {
  sm: 'h-10 px-4 text-[13px]',
  md: 'h-12 px-6 text-sm',
  lg: 'h-14 px-8 text-[15px]',
  xl: 'h-16 px-10 text-base',
};

const base =
  'inline-flex select-none items-center justify-center gap-2 rounded-full font-bold uppercase tracking-wide leading-none transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60';

export function buttonClasses(variant: Variant = 'gradient', size: Size = 'md', className?: string) {
  return cn(base, variantClass[variant], sizeClass[size], className);
}

export function Button({
  variant = 'gradient',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button {...props} className={buttonClasses(variant, size, className)} />;
}

export function ButtonLink({
  variant = 'gradient',
  size = 'md',
  className,
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; size?: Size; href: string }) {
  const cls = buttonClasses(variant, size, className);
  if (href.startsWith('/')) return <Link href={href} {...props} className={cls} />;
  return <a href={href} {...props} className={cls} />;
}

// --------------------------------------------------------------- Section

type Tone = 'white' | 'green' | 'blue' | 'arena' | 'dark';

const toneClass: Record<Tone, string> = {
  white: 'bg-white text-ink',
  green: 'bg-soft-green text-ink',
  blue: 'bg-soft-blue text-ink',
  arena: 'bg-arena text-ink',
  dark: 'bg-ink text-white',
};

export function Section({
  tone = 'white',
  className,
  inner,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { tone?: Tone; inner?: string }) {
  return (
    <section {...props} className={cn(toneClass[tone], 'py-16 sm:py-24', className)}>
      <div className={cn('mx-auto w-full max-w-6xl px-5 sm:px-8', inner)}>{children}</div>
    </section>
  );
}

export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      {...props}
      className={cn(
        'inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-green-deep',
        className,
      )}
    />
  );
}

export function H2({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      {...props}
      className={cn('text-[2rem] font-black uppercase leading-[0.98] tracking-tight sm:text-5xl', className)}
    />
  );
}

export function Lead({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      {...props}
      className={cn('mt-4 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg sm:leading-8', className)}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'rounded-3xl bg-white p-6 inset-ring-1 inset-ring-ink/[0.06] shadow-[0_1px_0_rgba(16,24,23,.03),0_20px_50px_-30px_rgba(16,24,23,.25)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(16,24,23,.35)]',
        className,
      )}
    />
  );
}

// ----------------------------------------------------------------- Photo

/**
 * Renders a real photo when `src` exists, otherwise a soft placeholder at
 * the final size so nothing shifts when live images are uploaded later.
 */
export function Photo({
  src,
  alt,
  caption,
  ratio = '4/3',
  sizes = '(max-width: 640px) 100vw, 640px',
  priority = false,
  className,
}: {
  src?: string | null;
  alt: string;
  caption?: string;
  ratio?: '16/9' | '4/3' | '1/1' | '3/4';
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const ratioClass = { '16/9': 'aspect-video', '4/3': 'aspect-[4/3]', '1/1': 'aspect-square', '3/4': 'aspect-[3/4]' }[
    ratio
  ];
  return (
    <figure
      className={cn(
        'group relative overflow-hidden rounded-3xl inset-ring-1 inset-ring-ink/[0.06]',
        ratioClass,
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-linear-to-br from-soft-green via-white to-soft-blue">
          <div className="absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center gap-2 text-ink/45">
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <circle cx="8.5" cy="10" r="1.5" />
                <path d="m21 16-5-5-8 8" />
              </svg>
              {caption && <span className="text-[11px] font-bold uppercase tracking-[0.14em]">{caption}</span>}
            </div>
          </div>
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/60">
            <span className="h-1.5 w-1.5 rounded-full bg-green" /> Live soon
          </span>
        </div>
      )}
      {src && caption && (
        <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/70 to-transparent px-4 pb-3 pt-10 text-xs font-bold uppercase tracking-wider text-white">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

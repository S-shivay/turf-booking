'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { nav } from '@/content/home';
import { cn } from '@/lib/utils';

/** True for the page you are on — `/` only matches itself, never every route. */
export function isCurrent(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The centre links in the navbar. Client-side only so the page you are on can
 * mark itself; the routing itself is plain `<Link>`, so every item is a real
 * navigation with a real URL (and opens in a new tab on middle-click).
 */
export function NavLinks({ onNavigate, className, itemClassName, activeClassName }: {
  onNavigate?: () => void;
  className?: string;
  itemClassName?: string;
  activeClassName?: string;
}) {
  const pathname = usePathname();

  return (
    <ul className={className}>
      {nav.map((item) => {
        const current = isCurrent(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={current ? 'page' : undefined}
              className={cn(itemClassName, current && activeClassName)}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

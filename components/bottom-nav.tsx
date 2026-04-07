/**
 * components/bottom-nav.tsx
 *
 * Mobile-first bottom tab bar. Same on desktop — no responsive switch.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, PieChart, TrendingUp, Users } from 'lucide-react';

import { cn } from '@/lib/utils';

const TABS = [
  { href: '/today', label: 'Today', icon: Calendar },
  { href: '/curve', label: 'Curve', icon: TrendingUp },
  { href: '/portfolio', label: 'Portfolio', icon: PieChart },
  { href: '/council', label: 'Council', icon: Users },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-30 grid grid-cols-4 border-t bg-background">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-3 text-xs',
              active
                ? 'border-t-2 border-foreground text-foreground'
                : 'border-t-2 border-transparent text-muted-foreground',
            )}
          >
            <Icon className={cn('h-5 w-5', active && 'fill-foreground/10')} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

'use client';

import type { ElementType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  LayoutDashboard,
  Package,
  Scissors,
  Settings,
  Users,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/bookings', label: 'Bookings', icon: CalendarDays },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/team', label: 'Team', icon: UserCog },
  { href: '/services', label: 'Services', icon: Scissors },
  { href: '/products', label: 'Products', icon: Package },
];

const bottomNavItems = [{ href: '/settings', label: 'Settings', icon: Settings }];

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: ElementType;
  pathname: string;
}) {
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex h-[calc(100vh-4rem)] flex-col gap-1 px-3 py-4">
      <div className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} pathname={pathname} />
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-1 border-t pt-3">
        {bottomNavItems.map((item) => (
          <NavLink key={item.href} {...item} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}

export { navItems, bottomNavItems };

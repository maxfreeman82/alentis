'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Compass,
  Users,
  TrendingUp,
  DollarSign,
  GraduationCap,
  FileText,
  Star,
  Heart,
  ShieldCheck,
  Scale,
  LayoutGrid,
  MessageSquare,
  Calendar,
  BookUser,
  BarChart3,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',       label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/boussole',        label: 'Boussole',      icon: Compass,       color: 'text-violet' },
  { href: '/recrutement',     label: 'Recrutement',   icon: Users },
  { href: '/performance',     label: 'Performance',   icon: TrendingUp,    color: 'text-orange' },
  { href: '/remuneration',    label: 'Rémunération',  icon: DollarSign,    color: 'text-emerald' },
  { href: '/formation',       label: 'Formation',     icon: GraduationCap, color: 'text-sky' },
  { href: '/admin-rh',        label: 'Admin RH',      icon: FileText },
  { href: '/talents',         label: 'Talents',       icon: Star,          color: 'text-amber' },
  { href: '/bien-etre',       label: 'Bien-être',     icon: Heart,         color: 'text-rose' },
  { href: '/conformite',      label: 'Conformité',    icon: ShieldCheck },
  { href: '/dei',             label: 'DEI',           icon: Scale },
  { href: '/workspace',       label: 'Workspace',     icon: LayoutGrid },
  { href: '/chat',            label: 'Messages',      icon: MessageSquare },
  { href: '/calendar',        label: 'Calendrier',    icon: Calendar },
  { href: '/directory',       label: 'Annuaire',      icon: BookUser },
  { href: '/analytics',       label: 'Analytics',     icon: BarChart3,     color: 'text-cyan' },
  { href: '/certification',   label: 'Certification', icon: Award,         color: 'text-amber' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 h-screen bg-bg-card border-r border-white/[0.04] flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-white/[0.04]">
        <div className="w-7 h-7 bg-emerald rounded-md flex items-center justify-center flex-shrink-0">
          <span className="font-display text-white font-bold text-sm">TA</span>
        </div>
        <div>
          <p className="font-display text-white text-sm font-semibold">Teranga Align</p>
          <p className="text-slate-500 text-[10px]">Alignement stratégique</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 mx-2 rounded-lg text-sm transition-all duration-150',
                isActive
                  ? 'bg-emerald/10 text-emerald font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              )}
            >
              <Icon
                size={16}
                className={cn(
                  isActive ? 'text-emerald' : (item.color ?? 'text-slate-500')
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.04]">
        <p className="text-slate-600 text-[10px] text-center">
          v1.0.0 · Teranga Align © 2026
        </p>
      </div>
    </aside>
  );
}

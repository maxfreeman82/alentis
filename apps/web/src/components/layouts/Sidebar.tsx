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
  Radio,
  TableProperties,
  BarChart2,
  CreditCard,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOutAction } from '@/app/actions/auth';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color?: string;
  children?: { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',       label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/boussole',        label: 'Boussole',      icon: Compass,       color: 'text-violet' },
  { href: '/vision-pulse',    label: 'Vision Pulse',  icon: Radio,         color: 'text-emerald' },
  { href: '/recrutement',     label: 'Recrutement',   icon: Users },
  { href: '/performance',     label: 'Performance',   icon: TrendingUp,    color: 'text-orange', children: [
    { href: '/performance/tour-de-table', label: 'Tour de Table',   icon: TableProperties },
    { href: '/performance/tour-de-table/mes-resultats', label: 'Mes résultats', icon: BarChart2 },
  ]},
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
  { href: '/abonnement',     label: 'Abonnement',    icon: CreditCard,    color: 'text-emerald' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 h-screen bg-bg-card border-r border-slate-200 flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-200">
        <div className="w-7 h-7 bg-emerald rounded-md flex items-center justify-center flex-shrink-0">
          <span className="font-display text-slate-900 font-bold text-sm">TA</span>
        </div>
        <div>
          <p className="font-display text-slate-900 text-sm font-semibold">Teranga Align</p>
          <p className="text-slate-500 text-[10px]">Alignement stratégique</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map((item) => {
          const isActive    = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon        = item.icon;
          const showChildren = isActive && item.children && item.children.length > 0;

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 mx-2 rounded-lg text-sm transition-all duration-150',
                  isActive
                    ? 'bg-emerald/10 text-emerald font-semibold'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
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

              {showChildren && (
                <div className="ml-4 mt-0.5 mb-1 border-l border-slate-200 pl-3 space-y-0.5">
                  {item.children!.map((child) => {
                    const childActive = pathname === child.href || pathname.startsWith(`${child.href}/`);
                    const ChildIcon   = child.icon;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1.5 mx-1 rounded-md text-xs transition-all duration-150',
                          childActive
                            ? 'text-orange font-semibold bg-orange/5'
                            : 'text-slate-500 hover:text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        <ChildIcon size={13} className={childActive ? 'text-orange' : 'text-slate-600'} />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 space-y-2">
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-400/5 transition-all text-xs"
          >
            <LogOut size={13} />
            Se déconnecter
          </button>
        </form>
        <p className="text-slate-700 text-[10px] text-center">
          v1.0.0 · Teranga Align © 2026
        </p>
      </div>
    </aside>
  );
}

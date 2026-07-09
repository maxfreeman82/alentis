'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Eye,
  Shield,
  BarChart3,
  ShieldAlert,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOutAction } from '@/app/actions/auth';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const ADMIN_NAV: NavItem[] = [
  { href: '/admin',              label: 'Vue globale',    icon: LayoutDashboard },
  { href: '/admin/organisations', label: 'Organisations',  icon: Building2 },
  { href: '/admin/abonnements',  label: 'Abonnements',    icon: CreditCard },
  { href: '/admin/vision',       label: 'Vision des orgs', icon: Eye },
  { href: '/admin/permissions',  label: 'Rôles & Accès',  icon: Shield },
  { href: '/admin/metriques',    label: 'Métriques',      icon: BarChart3 },
  { href: '/admin/integrite',    label: 'Intégrité',      icon: ShieldAlert },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 h-screen bg-bg-card border-r border-slate-200 flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-200">
        <div className="w-7 h-7 bg-violet rounded-md flex items-center justify-center flex-shrink-0">
          <span className="font-display text-white font-bold text-sm">SA</span>
        </div>
        <div>
          <p className="font-display text-slate-900 text-sm font-semibold">Super Admin</p>
          <p className="text-slate-500 text-[10px]">Teranga Align · Plateforme</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {ADMIN_NAV.map((item) => {
          // Exact match pour /admin, prefix match pour les sous-routes
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 mx-2 rounded-lg text-sm transition-all duration-150',
                isActive
                  ? 'bg-violet/10 text-violet font-semibold'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
              )}
            >
              <Icon
                size={16}
                className={cn(isActive ? 'text-violet' : 'text-slate-500')}
              />
              {item.label}
            </Link>
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

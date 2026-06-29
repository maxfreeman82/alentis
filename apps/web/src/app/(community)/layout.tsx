import type { ReactNode } from 'react';
import Link from 'next/link';
import { Rss, Users, CalendarDays, ShoppingBag, MessageSquare, Briefcase } from 'lucide-react';

const NAV = [
  { href: '/community/feed',        icon: Rss,           label: 'Feed'       },
  { href: '/community/mentoring',   icon: Users,         label: 'Mentoring'  },
  { href: '/community/events',      icon: CalendarDays,  label: 'Événements' },
  { href: '/community/marketplace', icon: ShoppingBag,   label: 'Marché'     },
  { href: '/community/forum',       icon: MessageSquare, label: 'Forum'      },
  { href: '/community/jobs',        icon: Briefcase,     label: 'Emplois'    },
];

export default function CommunityLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top bar */}
      <header className="border-b border-white/[0.04] bg-bg-card sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <Link href="/community" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-6 h-6 bg-violet-600 rounded flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">C</span>
            </div>
            <span className="font-display text-white text-sm font-semibold hidden sm:block">Communauté</span>
          </Link>
          <nav className="flex items-center gap-0.5 overflow-x-auto">
            {NAV.map(item => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all text-xs flex-shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-400 text-xs flex-shrink-0 hidden sm:block">
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}

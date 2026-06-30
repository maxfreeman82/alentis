import type { ReactNode } from 'react';
import Link from 'next/link';
import { User, Lightbulb, ClipboardList } from 'lucide-react';

export default function TalentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-white/[0.04] bg-bg-card sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/talent" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald rounded-md flex items-center justify-center flex-shrink-0">
              <span className="font-display text-white font-bold text-sm">TA</span>
            </div>
            <span className="font-display text-white text-sm font-semibold">Teranga Align</span>
            <span className="text-slate-600 text-xs ml-1">· Espace Talent</span>
          </Link>

          <nav className="flex items-center gap-1">
            {[
              { href: '/assessment',  icon: ClipboardList, label: 'Évaluation' },
              { href: '/passport',   icon: User,          label: 'Mon Passport' },
              { href: '/suggestions', icon: Lightbulb,   label: 'Opportunités' },
            ].map(item => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all text-xs">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Contenu */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-white/[0.04] py-6 text-center">
        <p className="text-slate-700 text-xs">Teranga Align · teranga-align.com · Vos données sont sécurisées et chiffrées</p>
      </footer>
    </div>
  );
}

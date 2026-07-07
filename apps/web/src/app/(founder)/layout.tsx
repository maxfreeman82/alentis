import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

const STEPS = [
  { href: '/demarrer',        label: 'Boussole',       step: 1 },
  { href: '/creation',        label: 'Création',        step: 2 },
  { href: '/business-plan',   label: 'Business Plan',  step: 3 },
  { href: '/premier-employe', label: '1er employé',    step: 4 },
  { href: '/mon-equipe',      label: 'Mon équipe',     step: 5 },
];

export default function FounderLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 bg-bg-card sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/demarrer" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
              <span className="text-slate-900 text-xs font-bold">F</span>
            </div>
            <div>
              <span className="font-display text-slate-900 text-sm font-semibold">Mode Fondateur</span>
              <span className="text-slate-600 text-xs ml-1.5">· gratuit</span>
            </div>
          </Link>

          {/* Étapes desktop */}
          <nav className="hidden md:flex items-center gap-1 text-xs">
            {STEPS.map((s, i) => (
              <div key={s.href} className="flex items-center gap-1">
                <Link href={s.href}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-600 hover:bg-slate-50 transition-all">
                  <span className="w-4 h-4 rounded-full bg-slate-50 flex items-center justify-center text-[9px] font-bold text-slate-500">
                    {s.step}
                  </span>
                  {s.label}
                </Link>
                {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-slate-700" />}
              </div>
            ))}
          </nav>

          <Link href="/dashboard" className="text-slate-600 hover:text-slate-400 text-xs flex-shrink-0">
            ← Dashboard RH
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-slate-200 py-4 text-center">
        <p className="text-slate-700 text-xs">Teranga Align · Mode Fondateur · 100% gratuit jusqu'à 5 employés</p>
      </footer>
    </div>
  );
}

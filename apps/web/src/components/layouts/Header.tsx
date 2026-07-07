'use client';

import { Bell, Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { scoreColor } from '@teranga/scoring';

interface HeaderProps {
  userFirstName?: string | undefined;
  userEmail?: string | undefined;
  orgName?: string | undefined;
  iasScore?: number | undefined;
}

export function Header({ userFirstName, orgName, iasScore }: HeaderProps) {
  const iasColor = iasScore != null ? scoreColor(iasScore) : null;

  return (
    <header className="h-14 bg-bg-card border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Recherche */}
      <div className="flex items-center gap-2 bg-bg-surface border border-slate-200 rounded-lg px-3 py-1.5 w-72">
        <Search size={14} className="text-slate-500" />
        <input
          type="text"
          placeholder="Rechercher un employé, un OKR..."
          className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none w-full"
        />
      </div>

      {/* Droite */}
      <div className="flex items-center gap-4">
        {/* IAS badge si dispo */}
        {iasScore != null && iasColor && (
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono font-semibold',
            iasColor === 'emerald' && 'border-emerald/30 bg-emerald/10 text-emerald',
            iasColor === 'amber'   && 'border-amber/30 bg-amber/10 text-amber',
            iasColor === 'rose'    && 'border-rose/30 bg-rose/10 text-rose',
            iasColor === 'sky'     && 'border-sky/30 bg-sky/10 text-sky',
          )}>
            <span className="text-slate-400 font-normal font-body">IAS</span>
            {iasScore}
          </div>
        )}

        {/* Notifications */}
        <button className="relative p-1.5 rounded-lg hover:bg-bg-surface transition-colors">
          <Bell size={18} className="text-slate-400" />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-rose rounded-full" />
        </button>

        {/* Profil */}
        <button className="flex items-center gap-2 hover:bg-bg-surface rounded-lg px-2 py-1 transition-colors">
          <div className="w-7 h-7 bg-emerald/20 border border-emerald/30 rounded-full flex items-center justify-center">
            <span className="text-emerald text-xs font-semibold">
              {userFirstName?.[0]?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-slate-700 text-xs font-medium">{userFirstName ?? 'Utilisateur'}</p>
            <p className="text-slate-500 text-[10px]">{orgName ?? 'Organisation'}</p>
          </div>
          <ChevronDown size={12} className="text-slate-500" />
        </button>
      </div>
    </header>
  );
}

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KeyResult {
  title: string;
  progress: number;
  target: number;
}

interface OKRItem {
  id: string;
  title: string;
  progress: number;
  on_track: boolean;
  year: number;
  key_results?: KeyResult[];
}

interface OKRBoardProps {
  okrs: OKRItem[];
}

export function OKRBoard({ okrs }: OKRBoardProps) {
  const [expanded, setExpanded] = useState<string | null>(okrs[0]?.id ?? null);

  const totalOnTrack = okrs.filter((o) => o.on_track).length;
  const avgProgress = Math.round(okrs.reduce((s, o) => s + o.progress, 0) / Math.max(1, okrs.length));

  return (
    <div className="space-y-4">
      {/* Résumé */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="font-display text-2xl text-violet">{okrs.length}</p>
          <p className="text-slate-400 text-xs mt-1">Objectifs</p>
        </div>
        <div className="card text-center">
          <p className="font-display text-2xl text-emerald">{totalOnTrack}</p>
          <p className="text-slate-400 text-xs mt-1">On track</p>
        </div>
        <div className="card text-center">
          <p className={cn('font-display text-2xl', avgProgress >= 70 ? 'text-emerald' : avgProgress >= 50 ? 'text-amber' : 'text-rose')}>
            {avgProgress}%
          </p>
          <p className="text-slate-400 text-xs mt-1">Progression moy.</p>
        </div>
      </div>

      {/* Liste OKRs */}
      {okrs.map((okr) => {
        const isExpanded = expanded === okr.id;
        const progressColor = okr.progress >= 70 ? '#10B981' : okr.progress >= 50 ? '#F59E0B' : '#F43F5E';

        return (
          <div
            key={okr.id}
            className={cn(
              'card border-l-4 transition-all',
              okr.on_track ? 'border-l-emerald' : 'border-l-rose'
            )}
          >
            {/* En-tête OKR */}
            <button
              className="w-full flex items-center justify-between"
              onClick={() => setExpanded(isExpanded ? null : okr.id)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {okr.on_track
                  ? <TrendingUp size={14} className="text-emerald flex-shrink-0" />
                  : <TrendingDown size={14} className="text-rose flex-shrink-0" />
                }
                <span className="text-white font-medium text-sm truncate">{okr.title}</span>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 ml-3">
                <span
                  className="font-mono text-sm font-bold"
                  style={{ color: progressColor }}
                >
                  {okr.progress}%
                </span>
                {isExpanded
                  ? <ChevronUp size={14} className="text-slate-500" />
                  : <ChevronDown size={14} className="text-slate-500" />
                }
              </div>
            </button>

            {/* Barre progression OKR */}
            <div className="mt-3 h-1 bg-bg rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${okr.progress}%`, backgroundColor: progressColor }}
              />
            </div>

            {/* Key Results */}
            {isExpanded && okr.key_results && (
              <div className="mt-4 space-y-3 border-t border-white/[0.04] pt-4">
                <p className="section-tag text-slate-500 mb-2">KEY RESULTS</p>
                {okr.key_results.map((kr, i) => {
                  const krColor = kr.progress >= 70 ? '#10B981' : kr.progress >= 50 ? '#F59E0B' : '#F43F5E';
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <Circle size={6} className="flex-shrink-0" style={{ color: krColor, fill: krColor }} />
                      <p className="text-slate-300 text-xs flex-1 truncate">{kr.title}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-20 h-1 bg-bg rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(100, kr.progress)}%`, backgroundColor: krColor }}
                          />
                        </div>
                        <span className="font-mono text-[10px] w-8 text-right" style={{ color: krColor }}>
                          {Math.round(kr.progress)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

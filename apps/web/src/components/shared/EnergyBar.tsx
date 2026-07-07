import { cn } from '@/lib/utils';
import type { EnergyFamily } from '@teranga/scoring';

const ENERGY_COLORS: Record<EnergyFamily, string> = {
  Pilotes:        '#F97316',
  Initialiseurs:  '#8B5CF6',
  Accomplisseurs: '#10B981',
  Dynamiseurs:    '#0EA5E9',
  Regulateurs:    '#F59E0B',
};

interface EnergyBarProps {
  family: EnergyFamily;
  value: number;          // 0-100
  required?: number;      // valeur cible (trait vertical)
  className?: string;
}

export function EnergyBar({ family, value, required, className }: EnergyBarProps) {
  const color = ENERGY_COLORS[family];
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="text-slate-600 text-sm w-28 flex-shrink-0">{family}</span>
      <div className="flex-1 relative h-2 bg-bg rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
        {/* Trait de l'objectif si requis */}
        {required != null && (
          <div
            className="absolute top-0 w-0.5 h-full bg-white/30"
            style={{ left: `${required}%` }}
          />
        )}
      </div>
      <span className="font-mono text-xs font-semibold w-10 text-right" style={{ color }}>
        {Math.round(pct)}%
      </span>
    </div>
  );
}

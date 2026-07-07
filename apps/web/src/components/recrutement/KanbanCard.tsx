'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { scoreHex } from '@/lib/utils';
import { scoreColor } from '@teranga/scoring';
import type { Candidate } from './PipelineBoard';

const ENERGY_COLORS: Record<string, string> = {
  Pilotes:        '#F97316',
  Initialiseurs:  '#8B5CF6',
  Accomplisseurs: '#10B981',
  Dynamiseurs:    '#0EA5E9',
  Regulateurs:    '#F59E0B',
};

interface KanbanCardProps {
  candidate: Candidate;
  isOverlay?: boolean;
}

export function KanbanCard({ candidate, isOverlay = false }: KanbanCardProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: candidate.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const color = scoreColor(candidate.score);
  const hex   = scoreHex(color);
  const energyColor = ENERGY_COLORS[candidate.energy] ?? '#64748B';
  const riskColor = candidate.departure_risk > 60 ? '#F43F5E' : candidate.departure_risk > 40 ? '#F59E0B' : '#10B981';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-bg-card border border-slate-200 rounded-lg p-3 cursor-grab active:cursor-grabbing',
        'hover:border-slate-200 hover:-translate-y-0.5 transition-all duration-150',
        isOverlay && 'shadow-xl shadow-black/50 rotate-1 scale-105 cursor-grabbing'
      )}
    >
      {/* Avatar + nom */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: `${hex}20`, color: hex, border: `1px solid ${hex}40` }}
        >
          {candidate.avatar_letter}
        </div>
        <div className="min-w-0">
          <p className="text-slate-900 text-xs font-semibold truncate">{candidate.name}</p>
          <p className="text-slate-500 text-[10px] truncate">{candidate.role}</p>
        </div>
      </div>

      {/* Score + métriques */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {/* Score 6D */}
          <span
            className="font-mono text-xs font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: `${hex}15`, color: hex }}
          >
            {candidate.score}
          </span>
          {/* Énergie */}
          <span
            className="text-[9px] font-medium px-1.5 py-0.5 rounded"
            style={{ backgroundColor: `${energyColor}15`, color: energyColor }}
          >
            {candidate.energy}
          </span>
        </div>
        {/* Risque départ */}
        <span
          className="font-mono text-[9px] font-bold"
          style={{ color: riskColor }}
          title={`Risque départ : ${candidate.departure_risk}%`}
        >
          ↗{candidate.departure_risk}%
        </span>
      </div>
    </div>
  );
}

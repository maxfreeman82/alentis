'use client';

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  id: string;
  label: string;
  color: string;
  count: number;
  children: React.ReactNode;
}

export function KanbanColumn({ id, label, color, count, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-60 flex flex-col rounded-xl border transition-all duration-200',
        isOver ? 'border-white/20' : 'border-white/[0.06]'
      )}
      style={{
        backgroundColor: isOver ? `${color}08` : 'transparent',
      }}
    >
      {/* En-tête colonne */}
      <div
        className="flex items-center justify-between px-3 py-2.5 rounded-t-xl border-b"
        style={{
          backgroundColor: `${color}12`,
          borderColor: `${color}25`,
        }}
      >
        <span className="text-xs font-semibold" style={{ color }}>
          {label}
        </span>
        <span
          className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-bg"
          style={{ color }}
        >
          {count}
        </span>
      </div>

      {/* Cartes */}
      <div className="flex flex-col gap-2 p-2 min-h-[120px]">
        {children}
        {count === 0 && (
          <div
            className="flex-1 rounded-lg border-2 border-dashed flex items-center justify-center py-6 text-xs"
            style={{ borderColor: `${color}20`, color: `${color}50` }}
          >
            Déposer ici
          </div>
        )}
      </div>
    </div>
  );
}

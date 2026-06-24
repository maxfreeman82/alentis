import { cn } from '@/lib/utils';
import type { Score6DResult } from '@teranga/scoring';

interface ScoreBreakdownProps {
  result: Score6DResult;
  className?: string;
}

const DIMENSION_LABELS = {
  H: 'Hard Skills',
  S: 'Soft Skills',
  X: 'Expérience',
  L: 'Life Score',
  E: 'Energy Fit',
  R: 'Risque',
};

const DIMENSION_COLORS = {
  H: '#0EA5E9',
  S: '#8B5CF6',
  X: '#F59E0B',
  L: '#10B981',
  E: '#F97316',
  R: '#F43F5E',
};

type Dimension = keyof typeof DIMENSION_LABELS;

export function ScoreBreakdown({ result, className }: ScoreBreakdownProps) {
  const dims = Object.keys(DIMENSION_LABELS) as Dimension[];

  return (
    <div className={cn('space-y-2', className)}>
      {dims.map((dim) => {
        const value = result.breakdown[dim];
        const color = DIMENSION_COLORS[dim];
        // R est inversé (bas = bon)
        const displayValue = dim === 'R' ? 100 - value : value;

        return (
          <div key={dim} className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold w-4 flex-shrink-0" style={{ color }}>
              {dim}
            </span>
            <span className="text-slate-400 text-xs w-24 flex-shrink-0">
              {DIMENSION_LABELS[dim]}
            </span>
            <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${displayValue}%`, backgroundColor: color }}
              />
            </div>
            <span className="font-mono text-xs font-semibold w-8 text-right" style={{ color }}>
              {Math.round(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

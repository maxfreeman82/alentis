import { cn, scoreHex } from '@/lib/utils';
import { scoreColor } from '@teranga/scoring';

interface ScoreCircleProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const SIZE_MAP = {
  sm: { outer: 48, inner: 36, font: 'text-sm', labelFont: 'text-[10px]' },
  md: { outer: 64, inner: 48, font: 'text-base', labelFont: 'text-xs' },
  lg: { outer: 80, inner: 60, font: 'text-xl', labelFont: 'text-xs' },
};

export function ScoreCircle({ value, size = 'md', label, className }: ScoreCircleProps) {
  const color = scoreColor(value);
  const hex = scoreHex(color);
  const { outer, inner, font, labelFont } = SIZE_MAP[size];

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div
        className="flex items-center justify-center rounded-full border-2"
        style={{
          width:  outer,
          height: outer,
          background: `radial-gradient(circle, ${hex}18, transparent)`,
          borderColor: `${hex}40`,
        }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: inner, height: inner }}
        >
          <span className={cn('font-display font-bold', font)} style={{ color: hex }}>
            {Math.round(value)}
          </span>
        </div>
      </div>
      {label && (
        <span className={cn('text-slate-400', labelFont)}>{label}</span>
      )}
    </div>
  );
}

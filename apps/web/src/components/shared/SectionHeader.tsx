import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  tag?: string;
  tagColor?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ tag, tagColor = 'text-emerald', title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between mb-6', className)}>
      <div>
        {tag && (
          <p className={cn('section-tag mb-1', tagColor)}>{tag}</p>
        )}
        <h1 className="font-display text-2xl text-slate-900">{title}</h1>
        {subtitle && (
          <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

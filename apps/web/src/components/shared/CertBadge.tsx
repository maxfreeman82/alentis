import { Medal, Star, Diamond } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CertLevel } from '@teranga/types';

interface CertBadgeProps {
  level: CertLevel;
  showLabel?: boolean;
  className?: string;
}

const CERT_CONFIG = {
  1: { label: 'Alignée',        icon: Medal,   style: 'bg-violet/20 text-violet border-violet/30' },
  2: { label: 'Engagée',        icon: Medal,   style: 'bg-slate-700/50 text-slate-300 border-slate-600' },
  3: { label: 'Exemplaire',     icon: Star,    style: 'bg-amber/20 text-amber border-amber/30' },
  4: { label: 'Transformatrice',icon: Diamond, style: 'bg-emerald/20 text-emerald border-emerald/30' },
} satisfies Record<CertLevel, { label: string; icon: React.ComponentType<{ size?: number }>; style: string }>;

export function CertBadge({ level, showLabel = true, className }: CertBadgeProps) {
  const config = CERT_CONFIG[level];
  const Icon = config.icon;

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium',
      config.style,
      className
    )}>
      <Icon size={12} />
      {showLabel && config.label}
    </div>
  );
}

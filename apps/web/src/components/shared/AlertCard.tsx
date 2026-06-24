import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertCardProps {
  title: string;
  description?: string;
  severity?: 'critical' | 'warning' | 'info';
  className?: string;
}

const SEVERITY_STYLES = {
  critical: 'border-l-rose text-rose',
  warning:  'border-l-amber text-amber',
  info:     'border-l-sky text-sky',
};

export function AlertCard({ title, description, severity = 'critical', className }: AlertCardProps) {
  return (
    <div className={cn('card border-l-4', SEVERITY_STYLES[severity], className)}>
      <div className="flex items-start gap-2">
        <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {description && (
            <p className="text-slate-400 text-xs mt-0.5">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

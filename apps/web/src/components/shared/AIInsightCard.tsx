import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AIInsightCardProps {
  content?: string;
  insights?: string[];
  title?: string;
  className?: string;
}

export function AIInsightCard({ content, insights, title = 'Analyse IA', className }: AIInsightCardProps) {
  return (
    <div className={cn('ai-insight', className)}>
      <div className="flex items-center gap-2 mb-2">
        <Bot size={14} className="text-violet" />
        <span className="section-tag text-violet">{title}</span>
      </div>
      {content && <p className="text-slate-600 text-sm leading-relaxed">{content}</p>}
      {insights && (
        <ul className="space-y-2">
          {insights.map((ins, i) => (
            <li key={i} className="text-slate-600 text-sm leading-relaxed flex gap-2">
              <span className="text-violet shrink-0 mt-0.5">·</span>
              <span>{ins}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

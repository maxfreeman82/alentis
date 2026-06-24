import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIInsightCardProps {
  content: string;
  title?: string;
  className?: string;
}

export function AIInsightCard({ content, title = 'Analyse IA', className }: AIInsightCardProps) {
  return (
    <div className={cn('ai-insight', className)}>
      <div className="flex items-center gap-2 mb-2">
        <Bot size={14} className="text-violet" />
        <span className="section-tag text-violet">{title}</span>
      </div>
      <p className="text-slate-300 text-sm leading-relaxed">{content}</p>
    </div>
  );
}

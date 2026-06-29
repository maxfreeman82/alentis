'use client';

import { useState } from 'react';
import { CheckCircle, Circle } from 'lucide-react';

interface Step { id: string; label: string; desc: string; }

export default function CreationChecklist({ steps }: { steps: Step[] }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const pct = Math.round((checked.size / steps.length) * 100);

  return (
    <div className="card space-y-4">
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>{checked.size}/{steps.length} étapes complétées</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-bg rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="space-y-2">
        {steps.map(s => {
          const done = checked.has(s.id);
          return (
            <button key={s.id} onClick={() => toggle(s.id)}
              className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                done ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-white/[0.02] border border-white/[0.04] hover:border-white/10'
              }`}>
              {done
                ? <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                : <Circle className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
              }
              <div>
                <p className={`text-sm font-medium ${done ? 'text-emerald-400 line-through' : 'text-white'}`}>{s.label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{s.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

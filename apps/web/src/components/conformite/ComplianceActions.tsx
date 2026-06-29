'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Minus } from 'lucide-react';

interface Props { itemId: string; currentStatus: string; }

export default function ComplianceActions({ itemId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function update(status: string) {
    setLoading(true);
    await fetch('/api/conformite/item', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, status, last_completed: status === 'completed' ? new Date().toISOString().split('T')[0] : undefined }),
    });
    setLoading(false);
    router.refresh();
  }

  if (loading) return <div className="w-20 flex justify-center"><span className="text-slate-600 text-xs">…</span></div>;

  return (
    <div className="flex gap-1 flex-shrink-0">
      {currentStatus !== 'completed' && (
        <button onClick={() => update('completed')} title="Marquer complété"
          className="w-7 h-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center transition-colors">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        </button>
      )}
      {currentStatus !== 'overdue' && (
        <button onClick={() => update('overdue')} title="Marquer en retard"
          className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition-colors">
          <X className="w-3.5 h-3.5 text-rose-400" />
        </button>
      )}
      {currentStatus !== 'not_applicable' && (
        <button onClick={() => update('not_applicable')} title="Non applicable"
          className="w-7 h-7 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 flex items-center justify-center transition-colors">
          <Minus className="w-3.5 h-3.5 text-slate-500" />
        </button>
      )}
      {currentStatus !== 'pending' && (
        <button onClick={() => update('pending')} title="Remettre en attente"
          className="w-7 h-7 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 flex items-center justify-center transition-colors">
          <span className="text-amber-400 text-xs font-bold">↺</span>
        </button>
      )}
    </div>
  );
}

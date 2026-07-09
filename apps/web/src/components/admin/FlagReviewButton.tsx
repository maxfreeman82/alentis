'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

interface Props {
  sessionId:  string;
  isReviewed: boolean;
}

export function FlagReviewButton({ sessionId, isReviewed }: Props) {
  const [done,    setDone]    = useState(isReviewed);
  const [loading, setLoading] = useState(false);

  if (done) {
    return (
      <div className="flex items-center gap-1 text-emerald text-xs font-semibold">
        <CheckCircle2 size={12} />
        Révisé
      </div>
    );
  }

  async function markReviewed() {
    setLoading(true);
    const res = await fetch('/api/admin/flag-review', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sessionId }),
    });
    if (res.ok) setDone(true);
    else setLoading(false);
  }

  return (
    <button
      onClick={markReviewed}
      disabled={loading}
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald/10 border border-emerald/20 text-emerald text-xs font-semibold hover:bg-emerald/15 transition-all disabled:opacity-50"
    >
      {loading
        ? <Loader2 size={11} className="animate-spin" />
        : <ShieldCheck size={11} />
      }
      Marquer révisé
    </button>
  );
}

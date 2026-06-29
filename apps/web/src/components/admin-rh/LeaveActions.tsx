'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Props { leaveId: string }

export default function LeaveActions({ leaveId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<'approved' | 'rejected' | null>(null);
  const [error, setError]     = useState<string | null>(null);

  async function act(action: 'approved' | 'rejected') {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch('/api/admin-rh/conges', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leaveId, action }),
      });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      router.push('/admin-rh');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => act('approved')}
          disabled={loading !== null}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 font-semibold text-sm"
        >
          {loading === 'approved' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Approuver
        </button>
        <button
          onClick={() => act('rejected')}
          disabled={loading !== null}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors disabled:opacity-50 font-semibold text-sm"
        >
          {loading === 'rejected' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
          Refuser
        </button>
      </div>
      {error && <p className="text-rose-400 text-xs text-center">{error}</p>}
    </div>
  );
}

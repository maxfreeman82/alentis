'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Lock, Sparkles, Loader2 } from 'lucide-react';

interface Session {
  id:     string;
  status: string;
  quarter: number;
  year:    number;
}

interface Props { session: Session; organizationId: string; }

export default function SessionActions({ session, organizationId: _ }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function callAction(action: 'launch' | 'close' | 'aggregate' | 'consolidate') {
    setLoading(action);
    const res = await fetch('/api/tour-de-table/session', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sessionId: session.id, action }),
    });
    if (res.ok) router.refresh();
    setLoading(null);
  }

  const isLoading = (a: string) => loading === a;

  return (
    <div className="flex items-center gap-2">
      {session.status === 'draft' && (
        <button onClick={() => callAction('launch')} disabled={!!loading}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-40 transition-all">
          {isLoading('launch') ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Lancer
        </button>
      )}

      {session.status === 'active' && (
        <button onClick={() => callAction('close')} disabled={!!loading}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl text-sm font-semibold hover:bg-sky-700 disabled:opacity-40 transition-all">
          {isLoading('close') ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          Clôturer
        </button>
      )}

      {session.status === 'closed' && (
        <button onClick={() => callAction('aggregate')} disabled={!!loading}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 transition-all">
          {isLoading('aggregate') ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Calculer les agrégats
        </button>
      )}

      {session.status === 'closed' && (
        <button onClick={() => callAction('consolidate')} disabled={!!loading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-all">
          {isLoading('consolidate') ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Consolider dans les Passports
        </button>
      )}
    </div>
  );
}

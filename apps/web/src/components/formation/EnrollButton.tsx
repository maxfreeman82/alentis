'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Loader2 } from 'lucide-react';
import type { EnrollmentStatus } from '@/lib/formation/training';

interface Props {
  trainingId:    string;
  currentStatus: EnrollmentStatus | undefined;
  progress:      number;
  spotsLeft:     number | null;
}

export default function EnrollButton({ trainingId, currentStatus, progress, spotsLeft }: Props) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const isFull = spotsLeft !== null && spotsLeft <= 0;

  async function handleEnroll() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/formation/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainingId }),
      });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  if (currentStatus === 'completed') {
    return (
      <div className="card flex items-center gap-3 border border-emerald-500/20 bg-emerald-500/5">
        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <div>
          <p className="text-emerald-400 font-semibold text-sm">Formation complétée</p>
          <p className="text-slate-400 text-xs">Progression : {progress}%</p>
        </div>
      </div>
    );
  }

  if (currentStatus === 'in_progress' || currentStatus === 'enrolled') {
    return (
      <div className="card space-y-2 border border-violet-500/20 bg-violet-500/5">
        <div className="flex items-center justify-between">
          <p className="text-violet-400 font-semibold text-sm">
            {currentStatus === 'in_progress' ? 'Formation en cours' : 'Inscrit'}
          </p>
          <span className="text-violet-400 font-mono text-sm">{progress}%</span>
        </div>
        <div className="h-1.5 bg-bg rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleEnroll}
        disabled={loading || isFull}
        className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {isFull ? 'Complet' : 'S\'inscrire à cette formation'}
      </button>
      {error && <p className="text-rose-400 text-xs text-center">{error}</p>}
    </div>
  );
}

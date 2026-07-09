'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';

interface Props {
  jobId:   string;
  ctaStyle?: string;
}

type Status = 'idle' | 'loading' | 'success' | 'already' | 'error';

export function ApplyButton({ jobId, ctaStyle }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [error,  setError]  = useState('');

  async function handleApply() {
    setStatus('loading');
    setError('');
    try {
      const res  = await fetch('/api/talent/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json() as { ok?: boolean; alreadyApplied?: boolean; error?: string };

      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur');
      setStatus(data.alreadyApplied ? 'already' : 'success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald/10 border border-emerald/30 text-emerald text-sm font-semibold">
        <CheckCircle2 className="w-4 h-4" />
        Candidature envoyée !
      </div>
    );
  }

  if (status === 'already') {
    return (
      <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm">
        <CheckCircle2 className="w-4 h-4" />
        Déjà candidaté
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleApply}
        disabled={status === 'loading'}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${
          ctaStyle ?? 'bg-emerald text-bg hover:bg-emerald/90'
        }`}
      >
        {status === 'loading'
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
          : <><Send className="w-4 h-4" /> Postuler maintenant</>
        }
      </button>
      {status === 'error' && error && (
        <p className="text-rose text-xs text-center">{error}</p>
      )}
    </div>
  );
}

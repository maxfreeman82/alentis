'use client';

import { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, UserPlus } from 'lucide-react';

interface Props {
  passportId: string;
  jobId:      string;
}

type Status = 'idle' | 'loading' | 'done' | 'already' | 'error';

export function InviteButton({ passportId, jobId }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [score,  setScore]  = useState<number | null>(null);
  const [err,    setErr]    = useState('');

  async function invite() {
    setStatus('loading');
    setErr('');
    try {
      const res  = await fetch('/api/recrutement/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passportId, jobId }),
      });
      const data = await res.json() as { ok?: boolean; alreadyInvited?: boolean; score_6d?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      if (data.alreadyInvited) { setStatus('already'); return; }
      setScore(data.score_6d ?? null);
      setStatus('done');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="flex items-center gap-1.5 text-emerald text-xs font-semibold">
        <CheckCircle2 size={13} />
        Ajouté au pipeline
        {score !== null && <span className="font-mono ml-1">({score})</span>}
      </div>
    );
  }

  if (status === 'already') {
    return (
      <div className="flex items-center gap-1.5 text-slate-400 text-xs">
        <CheckCircle2 size={13} />
        Déjà dans le pipeline
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={invite}
        disabled={status === 'loading'}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet/10 border border-violet/20 text-violet text-xs font-semibold hover:bg-violet/15 transition-all disabled:opacity-50"
      >
        {status === 'loading'
          ? <Loader2 size={12} className="animate-spin" />
          : <UserPlus size={12} />
        }
        {status === 'loading' ? 'Invitation…' : 'Inviter au poste'}
      </button>
      {status === 'error' && <p className="text-rose text-[10px]">{err}</p>}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ApplyFormProps {
  jobId: string;
  jobTitle: string;
  orgName: string;
}

export function ApplyForm({ jobId, jobTitle, orgName }: ApplyFormProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    const form = new FormData(e.currentTarget);
    const payload = {
      jobId,
      firstName:   form.get('firstName') as string,
      lastName:    form.get('lastName') as string,
      email:       form.get('email') as string,
      phone:       form.get('phone') as string,
      linkedin:    form.get('linkedin') as string,
      motivation:  form.get('motivation') as string,
    };

    try {
      const res = await fetch('/api/public/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Une erreur est survenue');
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle size={48} className="text-emerald" />
        <h3 className="text-white font-display text-xl font-bold">Candidature envoyée !</h3>
        <p className="text-slate-400 max-w-md">
          L&apos;équipe RH de <strong className="text-white">{orgName}</strong> a bien reçu votre dossier pour le poste de <strong className="text-white">{jobTitle}</strong>. Vous serez contacté par email sous 72h.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Prénom *</label>
          <input
            name="firstName" required
            placeholder="Moussa"
            className="w-full bg-bg border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald/40 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Nom *</label>
          <input
            name="lastName" required
            placeholder="Diallo"
            className="w-full bg-bg border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald/40 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Email professionnel *</label>
        <input
          name="email" type="email" required
          placeholder="m.diallo@email.com"
          className="w-full bg-bg border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald/40 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Téléphone</label>
          <input
            name="phone"
            placeholder="+221 77 000 00 00"
            className="w-full bg-bg border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald/40 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">LinkedIn / CV en ligne</label>
          <input
            name="linkedin"
            placeholder="linkedin.com/in/..."
            className="w-full bg-bg border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald/40 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Lettre de motivation *</label>
        <textarea
          name="motivation" required
          rows={5}
          placeholder="Décrivez votre parcours, vos motivations et ce que vous apporteriez à cette équipe..."
          className="w-full bg-bg border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald/40 transition-colors resize-none"
        />
      </div>

      {status === 'error' && (
        <div className="flex items-center gap-2 text-rose text-sm">
          <AlertCircle size={14} />
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald text-bg font-semibold text-sm hover:bg-emerald/90 disabled:opacity-60 transition-all"
      >
        {status === 'loading' ? (
          <><Loader2 size={16} className="animate-spin" /> Envoi en cours...</>
        ) : (
          <><Send size={16} /> Soumettre ma candidature</>
        )}
      </button>
    </form>
  );
}

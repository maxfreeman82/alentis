'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ArrowRight } from 'lucide-react';

const SECTORS = [
  { value: 'tech',       label: 'Technologie / Digital' },
  { value: 'finance',    label: 'Finance / Banque' },
  { value: 'sante',      label: 'Santé' },
  { value: 'education',  label: 'Éducation' },
  { value: 'commerce',   label: 'Commerce / Retail' },
  { value: 'industrie',  label: 'Industrie / Manufacturing' },
  { value: 'services',   label: 'Services aux entreprises' },
  { value: 'autre',      label: 'Autre' },
];

const SIZES = [
  { value: '1-10',    label: '1 – 10 employés' },
  { value: '11-50',   label: '11 – 50 employés' },
  { value: '51-200',  label: '51 – 200 employés' },
  { value: '201-500', label: '201 – 500 employés' },
  { value: '500+',    label: '500+ employés' },
];

export default function SetupOrgPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name,   setName]   = useState('');
  const [sector, setSector] = useState('autre');
  const [size,   setSize]   = useState('1-10');
  const [error,  setError]  = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await fetch('/api/workspace/setup-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, sector, size }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(json.error ?? 'Erreur serveur'); return; }
      router.push('/dashboard');
      router.refresh();
    });
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-emerald/10 border border-emerald/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Building2 className="w-6 h-6 text-emerald" />
          </div>
          <h1 className="font-display text-slate-900 text-2xl mb-2">Configurer votre organisation</h1>
          <p className="text-slate-400 text-sm">Quelques informations pour démarrer.</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">Nom de l'organisation</label>
            <input
              type="text" required value={name} onChange={e => setName(e.target.value)}
              placeholder="Mon Entreprise SARL"
              className="w-full bg-bg border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-emerald/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1.5">Secteur d'activité</label>
            <select
              value={sector} onChange={e => setSector(e.target.value)}
              className="w-full bg-bg border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm outline-none focus:border-emerald/50 transition-colors"
            >
              {SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1.5">Taille de l'équipe</label>
            <select
              value={size} onChange={e => setSize(e.target.value)}
              className="w-full bg-bg border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm outline-none focus:border-emerald/50 transition-colors"
            >
              {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <button
            type="submit" disabled={isPending || !name.trim()}
            className="w-full flex items-center justify-center gap-2 bg-emerald text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Création…' : 'Créer mon organisation'}
            {!isPending && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}

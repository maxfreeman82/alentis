'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Field<T extends string> = { label: string; value: T };
const GENDERS: Field<string>[]    = [{ label: 'Homme', value: 'homme' }, { label: 'Femme', value: 'femme' }, { label: 'Autre', value: 'autre' }, { label: 'Je ne souhaite pas répondre', value: 'non_precise' }];
const AGES: Field<string>[]       = ['18-25','26-35','36-45','46-55','55+'].map(v => ({ label: `${v} ans`, value: v }));
const BANDS: Field<string>[]      = [{ label: 'Junior', value: 'junior' }, { label: 'Intermédiaire', value: 'intermediaire' }, { label: 'Senior', value: 'senior' }, { label: 'Expert', value: 'expert' }, { label: 'Direction', value: 'direction' }];

export default function DeiProfileForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    gender:         '',
    age_range:      '',
    nationality:    '',
    department:     '',
    salary_band:    '',
    is_manager:     false,
    disability:     false,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/dei/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setLoading(false);
    if (res.ok) { setDone(true); setTimeout(() => router.push('/dei'), 1800); }
  }

  if (done) return (
    <div className="card py-12 text-center">
      <p className="text-emerald-400 text-2xl font-display mb-2">Merci !</p>
      <p className="text-slate-400">Votre profil DEI a été enregistré de façon anonymisée.</p>
    </div>
  );

  return (
    <form onSubmit={submit} className="card space-y-5">
      <p className="text-slate-500 text-xs border border-amber-500/20 bg-amber-500/5 rounded-lg px-3 py-2">
        Toutes les questions sont facultatives. Ces données sont anonymisées et agrégées — elles ne permettent pas de vous identifier individuellement.
      </p>

      <div className="space-y-1">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Genre</label>
        <div className="grid grid-cols-2 gap-2">
          {GENDERS.map(g => (
            <button key={g.value} type="button"
              className={`px-3 py-2 rounded-lg text-sm text-left transition-all border ${form.gender === g.value ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-white/5 text-slate-400 hover:border-white/10'}`}
              onClick={() => setForm(f => ({ ...f, gender: g.value }))}>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Tranche d&apos;âge</label>
        <div className="flex flex-wrap gap-2">
          {AGES.map(a => (
            <button key={a.value} type="button"
              className={`px-3 py-2 rounded-lg text-sm transition-all border ${form.age_range === a.value ? 'border-sky-500 bg-sky-500/10 text-sky-400' : 'border-white/5 text-slate-400 hover:border-white/10'}`}
              onClick={() => setForm(f => ({ ...f, age_range: a.value }))}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Nationalité (optionnel)</label>
        <input type="text" placeholder="Ex : Sénégalaise, Ivoirienne…"
          className="input-field w-full" value={form.nationality}
          onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Département / équipe</label>
        <input type="text" placeholder="Ex : Commercial, Finance, Tech…"
          className="input-field w-full" value={form.department}
          onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Bande salariale</label>
        <div className="flex flex-wrap gap-2">
          {BANDS.map(b => (
            <button key={b.value} type="button"
              className={`px-3 py-2 rounded-lg text-sm transition-all border ${form.salary_band === b.value ? 'border-violet-500 bg-violet-500/10 text-violet-400' : 'border-white/5 text-slate-400 hover:border-white/10'}`}
              onClick={() => setForm(f => ({ ...f, salary_band: b.value }))}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
          <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-card accent-emerald-500"
            checked={form.is_manager} onChange={e => setForm(f => ({ ...f, is_manager: e.target.checked }))} />
          Je suis manager
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
          <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-card accent-emerald-500"
            checked={form.disability} onChange={e => setForm(f => ({ ...f, disability: e.target.checked }))} />
          Situation de handicap
        </label>
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Enregistrement…' : 'Enregistrer mon profil DEI'}
      </button>
    </form>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, X, Loader2, ChevronDown } from 'lucide-react';
import { formatFCFA } from '@/lib/utils';
import { z } from 'zod';

interface Profile {
  id: string;
  first_name: string | null;
  last_name:  string | null;
  role:       string | null;
}

const schema = z.object({
  profile_id:         z.string().uuid(),
  salaire_brut:       z.number().positive('Salaire requis'),
  situation:          z.enum(['celibataire', 'marie', 'marie_1', 'marie_2', 'marie_3']),
  enfants:            z.number().int().min(0).max(20),
  sector_risk:        z.enum(['low', 'medium', 'high']),
  primes_mensuelles:  z.number().min(0),
  avantages_nature:   z.number().min(0),
  retenue_prevoyance: z.number().min(0),
  est_cadre:          z.boolean(),
});

const SITUATION_LABELS: Record<string, string> = {
  celibataire: 'Célibataire',
  marie:       'Marié(e) sans enfant',
  marie_1:     'Marié(e) + 1 enfant',
  marie_2:     'Marié(e) + 2 enfants',
  marie_3:     'Marié(e) + 3 enfants',
};

export function PayrollConfigButton({ profiles }: { profiles: Profile[] }) {
  const router   = useRouter();
  const [open,   setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,  setError]   = useState<string | null>(null);

  const [form, setForm] = useState({
    profile_id:         '',
    salaire_brut:       '',
    situation:          'celibataire',
    enfants:            0,
    sector_risk:        'low',
    primes_mensuelles:  0,
    avantages_nature:   0,
    retenue_prevoyance: 0,
    est_cadre:          false,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = schema.safeParse({
      ...form,
      salaire_brut: parseFloat(form.salaire_brut) || 0,
    });

    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Données invalides');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/remuneration/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? 'Erreur serveur');
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2 text-sm flex-shrink-0">
        <Settings size={14} />
        Configurer
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-bg-card border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <p className="section-tag text-emerald mb-0.5">RÉMUNÉRATION</p>
                <h2 className="font-display text-slate-900 text-lg">Paramètres de paie</h2>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Sélection collaborateur */}
              <div>
                <label className="block text-slate-400 text-xs mb-1.5">Collaborateur *</label>
                <div className="relative">
                  <select
                    value={form.profile_id}
                    onChange={e => setForm(f => ({ ...f, profile_id: e.target.value }))}
                    className="w-full bg-bg border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-emerald/40 appearance-none"
                  >
                    <option value="">Choisir un collaborateur…</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {`${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Sans nom'} — {p.role ?? ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Salaire brut */}
              <div>
                <label className="block text-slate-400 text-xs mb-1.5">Salaire brut mensuel (FCFA) *</label>
                <input
                  type="number"
                  value={form.salaire_brut}
                  onChange={e => setForm(f => ({ ...f, salaire_brut: e.target.value }))}
                  placeholder="ex : 750000"
                  min={0}
                  className="w-full bg-bg border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald/40"
                />
                {form.salaire_brut && (
                  <p className="text-slate-500 text-[11px] mt-1">{formatFCFA(parseFloat(form.salaire_brut) || 0)} / mois</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Situation familiale */}
                <div>
                  <label className="block text-slate-400 text-xs mb-1.5">Situation familiale</label>
                  <div className="relative">
                    <select
                      value={form.situation}
                      onChange={e => setForm(f => ({ ...f, situation: e.target.value }))}
                      className="w-full bg-bg border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-emerald/40 appearance-none"
                    >
                      {Object.entries(SITUATION_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                {/* Risque sectoriel (CSS) */}
                <div>
                  <label className="block text-slate-400 text-xs mb-1.5">Risque sectoriel (CSS)</label>
                  <div className="relative">
                    <select
                      value={form.sector_risk}
                      onChange={e => setForm(f => ({ ...f, sector_risk: e.target.value }))}
                      className="w-full bg-bg border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-emerald/40 appearance-none"
                    >
                      <option value="low">Faible (1%)</option>
                      <option value="medium">Moyen (3%)</option>
                      <option value="high">Élevé (5%)</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Primes */}
                <div>
                  <label className="block text-slate-400 text-xs mb-1.5">Primes mensuelles (FCFA)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.primes_mensuelles}
                    onChange={e => setForm(f => ({ ...f, primes_mensuelles: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-bg border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-emerald/40"
                  />
                </div>

                {/* Avantages en nature */}
                <div>
                  <label className="block text-slate-400 text-xs mb-1.5">Avantages en nature (FCFA)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.avantages_nature}
                    onChange={e => setForm(f => ({ ...f, avantages_nature: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-bg border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-emerald/40"
                  />
                </div>
              </div>

              {/* Cadre */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm(f => ({ ...f, est_cadre: !f.est_cadre }))}
                  className={`w-10 h-5 rounded-full transition-colors flex items-center ${form.est_cadre ? 'bg-emerald' : 'bg-white/10'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${form.est_cadre ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className="text-slate-600 text-sm">Statut cadre (IPRES-RC 3,6%)</span>
              </label>

              {error && <p className="text-rose-400 text-xs">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-400 text-sm hover:text-slate-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || !form.profile_id || !form.salaire_brut}
                  className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

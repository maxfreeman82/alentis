'use client';

import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

const ENERGY_FAMILIES = ['Pilotes', 'Initialiseurs', 'Accomplisseurs', 'Dynamiseurs', 'Régulateurs'];

const schema = z.object({
  title:            z.string().min(2, 'Titre requis'),
  description:      z.string().optional(),
  required_family:  z.string().optional(),
  min_score_global: z.number().min(0).max(100),
  ias_impact:       z.number().optional(),
});

export function CreateJobButton() {
  const router   = useRouter();
  const [open,   setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,  setError]   = useState<string | null>(null);

  const [form, setForm] = useState({
    title:            '',
    description:      '',
    required_family:  '',
    min_score_global: 60,
    ias_impact:       '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = schema.safeParse({
      ...form,
      ias_impact: form.ias_impact ? parseFloat(form.ias_impact) : undefined,
      required_family: form.required_family || undefined,
      description: form.description || undefined,
    });

    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Données invalides');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/recrutement/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? 'Erreur serveur');
      }
      setOpen(false);
      setForm({ title: '', description: '', required_family: '', min_score_global: 60, ias_impact: '' });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary flex items-center gap-2 text-sm"
      >
        <Plus size={14} />
        Nouveau poste
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-bg-card border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            {/* En-tête */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <div>
                <p className="section-tag text-emerald mb-0.5">RECRUTEMENT</p>
                <h2 className="font-display text-white text-lg">Nouveau poste</h2>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Titre */}
              <div>
                <label className="block text-slate-400 text-xs mb-1.5">Intitulé du poste *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="ex : Lead Product Manager"
                  className="w-full bg-bg border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald/40"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-400 text-xs mb-1.5">Description courte</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Missions principales, contexte…"
                  rows={3}
                  className="w-full bg-bg border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald/40 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Famille énergétique */}
                <div>
                  <label className="block text-slate-400 text-xs mb-1.5">Famille souhaitée</label>
                  <select
                    value={form.required_family}
                    onChange={e => setForm(f => ({ ...f, required_family: e.target.value }))}
                    className="w-full bg-bg border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald/40"
                  >
                    <option value="">Toutes</option>
                    {ENERGY_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                {/* Score minimum */}
                <div>
                  <label className="block text-slate-400 text-xs mb-1.5">Score min 6D</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.min_score_global}
                    onChange={e => setForm(f => ({ ...f, min_score_global: parseInt(e.target.value) || 60 }))}
                    className="w-full bg-bg border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald/40"
                  />
                </div>
              </div>

              {/* Impact IAS */}
              <div>
                <label className="block text-slate-400 text-xs mb-1.5">Impact IAS estimé (pts)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.ias_impact}
                  onChange={e => setForm(f => ({ ...f, ias_impact: e.target.value }))}
                  placeholder="ex : 2.5"
                  className="w-full bg-bg border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald/40"
                />
              </div>

              {error && <p className="text-rose-400 text-xs">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || !form.title.trim()}
                  className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : 'Créer le poste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { Plus, X, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

const FAMILY_KEYWORDS: Record<string, string[]> = {
  Pilotes:       ['directeur','director','manager','lead','chef','responsable','head','ceo','cto','dg','president'],
  Initialiseurs: ['innovation','créatif','creative','r&d','recherche','product','design','ux','stratégie','business developer'],
  Accomplisseurs:['opérations','production','qualité','ingénieur','technique','développeur','dev','engineer','logistique','supply'],
  Dynamiseurs:   ['commercial','vente','sales','marketing','communication','relation','client','business dev','growth','brand'],
  Régulateurs:   ['finance','comptable','audit','conformité','rh','juridique','contrôle','analyste','data','compliance','assistant'],
};

function suggestFamily(title: string): string | null {
  const t = title.toLowerCase();
  for (const [family, keywords] of Object.entries(FAMILY_KEYWORDS)) {
    if (keywords.some(k => t.includes(k))) return family;
  }
  return null;
}

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
    min_score_global: 60,
    ias_impact:       '',
  });

  const suggestedFamily = useMemo(() => suggestFamily(form.title), [form.title]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = schema.safeParse({
      ...form,
      ias_impact: form.ias_impact ? parseFloat(form.ias_impact) : undefined,
      required_family: suggestedFamily ?? undefined,
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
      setForm({ title: '', description: '', min_score_global: 60, ias_impact: '' });
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
          <div className="bg-bg-card border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl">
            {/* En-tête */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <p className="section-tag text-emerald mb-0.5">RECRUTEMENT</p>
                <h2 className="font-display text-slate-900 text-lg">Nouveau poste</h2>
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
                  className="w-full bg-bg border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald/40"
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
                  className="w-full bg-bg border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald/40 resize-none"
                />
              </div>

              {/* Suggestion IA famille énergétique */}
              {form.title.trim().length > 3 && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-violet/5 border border-violet/20">
                  <Sparkles size={13} className="text-violet flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-violet text-[10px] font-semibold uppercase tracking-wider mb-0.5">Suggestion IA — Profil énergétique</p>
                    <p className="text-slate-900 text-sm font-medium">
                      {suggestedFamily ?? 'Analyse en cours…'}
                    </p>
                  </div>
                </div>
              )}

              {/* Score minimum */}
              <div>
                <label className="block text-slate-400 text-xs mb-1.5">Score min 6D</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.min_score_global}
                  onChange={e => setForm(f => ({ ...f, min_score_global: parseInt(e.target.value) || 60 }))}
                  className="w-full bg-bg border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-emerald/40"
                />
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
                  className="w-full bg-bg border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald/40"
                />
              </div>

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

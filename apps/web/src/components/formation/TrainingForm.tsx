'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  { value: 'technique',     label: 'Technique' },
  { value: 'management',   label: 'Management' },
  { value: 'soft_skills',  label: 'Soft Skills' },
  { value: 'reglementaire', label: 'Réglementaire' },
  { value: 'metier',       label: 'Métier' },
];

const FORMATS = [
  { value: 'presentiel',  label: 'Présentiel' },
  { value: 'distanciel',  label: 'Distanciel' },
  { value: 'blended',     label: 'Hybride' },
  { value: 'e_learning',  label: 'E-learning' },
];

export default function TrainingForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const [form, setForm] = useState({
    title:            '',
    description:      '',
    category:         'technique',
    format:           'presentiel',
    duration_hours:   '',
    instructor:       '',
    max_participants: '',
    start_date:       '',
    end_date:         '',
  });

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/formation/catalogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          duration_hours:   form.duration_hours   ? Number(form.duration_hours)   : null,
          max_participants: form.max_participants ? Number(form.max_participants) : null,
          start_date:       form.start_date || null,
          end_date:         form.end_date   || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      router.push('/formation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      {/* Titre */}
      <div className="space-y-1.5">
        <label className="text-slate-600 text-sm font-medium">Titre de la formation *</label>
        <input
          required
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="ex : Leadership & Management d'équipe"
          className="input w-full"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-slate-600 text-sm font-medium">Description</label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          rows={3}
          placeholder="Objectifs, contenu, prérequis…"
          className="input w-full resize-none"
        />
      </div>

      {/* Catégorie + Format */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-slate-600 text-sm font-medium">Catégorie</label>
          <select value={form.category} onChange={e => set('category', e.target.value)} className="input w-full">
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-slate-600 text-sm font-medium">Format</label>
          <select value={form.format} onChange={e => set('format', e.target.value)} className="input w-full">
            {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      {/* Durée + Max participants */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-slate-600 text-sm font-medium">Durée (heures)</label>
          <input
            type="number" min="0.5" step="0.5"
            value={form.duration_hours}
            onChange={e => set('duration_hours', e.target.value)}
            placeholder="ex : 8"
            className="input w-full"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-slate-600 text-sm font-medium">Participants max</label>
          <input
            type="number" min="1"
            value={form.max_participants}
            onChange={e => set('max_participants', e.target.value)}
            placeholder="ex : 15"
            className="input w-full"
          />
        </div>
      </div>

      {/* Formateur */}
      <div className="space-y-1.5">
        <label className="text-slate-600 text-sm font-medium">Formateur / Intervenant</label>
        <input
          value={form.instructor}
          onChange={e => set('instructor', e.target.value)}
          placeholder="Nom du formateur ou organisme"
          className="input w-full"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-slate-600 text-sm font-medium">Date de début</label>
          <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className="input w-full" />
        </div>
        <div className="space-y-1.5">
          <label className="text-slate-600 text-sm font-medium">Date de fin</label>
          <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className="input w-full" />
        </div>
      </div>

      {error && <p className="text-rose-400 text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">
          Annuler
        </button>
        <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Créer la formation'}
        </button>
      </div>
    </form>
  );
}

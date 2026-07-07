'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

const CATEGORIES = ['Recrutement','Formation','Conseil RH','Audit social','Paie & Admin','Tech RH','Coaching Leadership','autre'];

export default function MarketplaceCreateBtn({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [open, setOpen]   = useState(false);
  const [form, setForm]   = useState({
    title: '', description: '', category: 'Conseil RH',
    price_fcfa: '', price_type: 'negotiable', delivery_days: '', skills: '',
  });
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) { setForm(prev => ({ ...prev, [k]: v })); }

  async function submit() {
    if (!form.title.trim()) return;
    setLoading(true);
    await fetch('/api/community/marketplace', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        ...form,
        price_fcfa:    form.price_fcfa    ? parseInt(form.price_fcfa)    : null,
        delivery_days: form.delivery_days ? parseInt(form.delivery_days) : null,
        skills:        form.skills.split(',').map(s => s.trim()).filter(Boolean),
      }),
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors">
      <Plus className="w-3.5 h-3.5" /> Proposer un service
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div className="bg-bg-card rounded-2xl border border-slate-200 w-full max-w-md space-y-4 p-6"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-slate-900">Nouveau service</h3>
          <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-slate-500" /></button>
        </div>

        {[
          { k: 'title',       label: 'Titre *',   type: 'text',     ph: 'Formation Excel RH, Audit social…' },
          { k: 'description', label: 'Description', type: 'textarea', ph: 'Décrivez votre service…' },
          { k: 'price_fcfa',  label: 'Prix (FCFA)', type: 'number',  ph: 'Laisser vide si négociable' },
          { k: 'delivery_days', label: 'Délai (jours)', type: 'number', ph: '' },
          { k: 'skills',      label: 'Compétences (virgule)', type: 'text', ph: 'Excel, RH, SIRH…' },
        ].map(f => (
          <div key={f.k} className="space-y-1">
            <label className="text-slate-400 text-xs">{f.label}</label>
            {f.type === 'textarea' ? (
              <textarea value={form[f.k as keyof typeof form]} onChange={e => set(f.k, e.target.value)}
                placeholder={f.ph} rows={2}
                className="w-full bg-bg rounded-lg px-3 py-2 text-slate-600 text-xs border border-slate-200 focus:outline-none resize-none" />
            ) : (
              <input type={f.type} value={form[f.k as keyof typeof form]} onChange={e => set(f.k, e.target.value)}
                placeholder={f.ph}
                className="w-full bg-bg rounded-lg px-3 py-2 text-slate-600 text-xs border border-slate-200 focus:outline-none" />
            )}
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-slate-400 text-xs">Catégorie</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              className="w-full bg-bg rounded-lg px-2 py-2 text-slate-600 text-xs border border-slate-200 focus:outline-none">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-slate-400 text-xs">Type de prix</label>
            <select value={form.price_type} onChange={e => set('price_type', e.target.value)}
              className="w-full bg-bg rounded-lg px-2 py-2 text-slate-600 text-xs border border-slate-200 focus:outline-none">
              <option value="fixed">Prix fixe</option>
              <option value="hourly">Par heure</option>
              <option value="negotiable">Négociable</option>
            </select>
          </div>
        </div>

        <button onClick={submit} disabled={!form.title.trim() || loading}
          className="w-full py-2.5 bg-emerald-500 text-slate-900 rounded-xl text-sm font-semibold hover:bg-emerald-600 disabled:opacity-40 transition-all">
          {loading ? 'Publication…' : 'Publier le service'}
        </button>
      </div>
    </div>
  );
}

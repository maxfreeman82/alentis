'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

export default function EventCreateBtn({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [open, setOpen]   = useState(false);
  const [form, setForm]   = useState({
    title: '', description: '', event_type: 'online', location: '',
    start_at: '', end_at: '', max_attendees: '', is_free: true, price_fcfa: '',
  });
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string | boolean) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function submit() {
    if (!form.title || !form.start_at) return;
    setLoading(true);
    await fetch('/api/community/event', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        ...form,
        max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null,
        price_fcfa:    form.price_fcfa    ? parseInt(form.price_fcfa)    : null,
      }),
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500/10 text-sky-400 text-xs font-semibold hover:bg-sky-500/20 transition-colors">
      <Plus className="w-3.5 h-3.5" /> Créer un événement
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div className="bg-bg-card rounded-2xl border border-slate-200 w-full max-w-md space-y-4 p-6"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-slate-900">Nouvel événement</h3>
          <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-slate-500" /></button>
        </div>

        {[
          { k: 'title',       label: 'Titre *',       type: 'text', ph: 'Webinar RH, Meetup DRH Dakar…' },
          { k: 'description', label: 'Description',   type: 'textarea', ph: 'Détails, programme…' },
          { k: 'start_at',    label: 'Date & heure *', type: 'datetime-local', ph: '' },
          { k: 'end_at',      label: 'Fin (optionnel)', type: 'datetime-local', ph: '' },
          { k: 'location',    label: 'Lieu / Lien',   type: 'text', ph: 'Google Meet, Dakar, Abidjan…' },
          { k: 'max_attendees', label: 'Places max',  type: 'number', ph: 'Illimité si vide' },
        ].map(f => (
          <div key={f.k} className="space-y-1">
            <label className="text-slate-400 text-xs">{f.label}</label>
            {f.type === 'textarea' ? (
              <textarea value={String((form as Record<string, unknown>)[f.k] ?? '')} onChange={e => set(f.k, e.target.value)}
                placeholder={f.ph} rows={2}
                className="w-full bg-bg rounded-lg px-3 py-2 text-slate-600 text-xs border border-slate-200 focus:outline-none resize-none" />
            ) : (
              <input type={f.type} value={String((form as Record<string, unknown>)[f.k] ?? '')} onChange={e => set(f.k, e.target.value)}
                placeholder={f.ph}
                className="w-full bg-bg rounded-lg px-3 py-2 text-slate-600 text-xs border border-slate-200 focus:outline-none" />
            )}
          </div>
        ))}

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(['online','in-person','hybrid'] as const).map(t => (
              <button key={t} onClick={() => set('event_type', t)}
                className={`text-[10px] px-2 py-1 rounded-lg capitalize transition-all ${form.event_type === t ? 'bg-sky-500/20 text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}>
                {t}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-slate-400 text-xs cursor-pointer">
            <input type="checkbox" checked={form.is_free} onChange={e => set('is_free', e.target.checked)} className="accent-emerald-500" />
            Gratuit
          </label>
        </div>

        <button onClick={submit} disabled={!form.title || !form.start_at || loading}
          className="w-full py-2.5 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 disabled:opacity-40 transition-all">
          {loading ? 'Création…' : 'Créer l\'événement'}
        </button>
      </div>
    </div>
  );
}

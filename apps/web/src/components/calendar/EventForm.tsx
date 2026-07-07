'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

export default function EventForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title:       '',
    description: '',
    event_type:  'reunion',
    start_date:  '',
    end_date:    '',
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/calendar/event', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    });
    setLoading(false);
    setOpen(false);
    setForm({ title: '', description: '', event_type: 'reunion', start_date: '', end_date: '' });
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary text-sm flex items-center gap-2">
        <Plus className="w-4 h-4" /> Événement
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-slate-900">Nouvel événement</h3>
              <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <input required placeholder="Titre de l'événement" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="input-field w-full" />
              <div>
                <label className="block text-xs text-slate-500 mb-1">Type</label>
                <select className="input-field w-full" value={form.event_type}
                  onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}>
                  <option value="reunion">Réunion</option>
                  <option value="formation">Formation</option>
                  <option value="echeance">Échéance</option>
                  <option value="anniversaire">Anniversaire</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Date début</label>
                  <input required type="date" value={form.start_date}
                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Date fin (optionnel)</label>
                  <input type="date" value={form.end_date}
                    onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    className="input-field w-full" />
                </div>
              </div>
              <textarea placeholder="Description (optionnel)" rows={2} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="input-field w-full resize-none" />
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Création…' : 'Créer l\'événement'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

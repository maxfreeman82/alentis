'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

export default function AnnouncementForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', priority: 'normal', pinned: false });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/workspace/announce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setLoading(false);
    setOpen(false);
    setForm({ title: '', content: '', priority: 'normal', pinned: false });
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
        <Plus className="w-3.5 h-3.5" /> Publier
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-slate-900">Nouvelle annonce</h3>
              <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <input required placeholder="Titre" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="input-field w-full" />
              <textarea required placeholder="Contenu…" rows={4} value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                className="input-field w-full resize-none" />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Priorité</label>
                  <select className="input-field w-full" value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="low">Faible</option>
                    <option value="normal">Normal</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <label className="flex items-end gap-2 cursor-pointer pb-2">
                  <input type="checkbox" className="w-4 h-4 accent-emerald-500 rounded"
                    checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} />
                  <span className="text-slate-600 text-sm">Épingler</span>
                </label>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Publication…' : 'Publier l\'annonce'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

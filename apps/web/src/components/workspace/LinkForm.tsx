'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

export default function LinkForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', url: '', category: 'autre' });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/workspace/link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setLoading(false);
    setOpen(false);
    setForm({ title: '', url: '', category: 'autre' });
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-slate-500 hover:text-slate-600 transition-colors">
        <Plus className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-slate-900 text-sm">Ajouter un lien</h3>
              <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <input required placeholder="Titre" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="input-field w-full" />
              <input required type="url" placeholder="https://…" value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                className="input-field w-full" />
              <select className="input-field w-full" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="outil">Outil</option>
                <option value="doc">Document</option>
                <option value="rh">RH</option>
                <option value="finance">Finance</option>
                <option value="autre">Autre</option>
              </select>
              <button type="submit" disabled={loading} className="btn-primary w-full text-sm">
                {loading ? 'Ajout…' : 'Ajouter le lien'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

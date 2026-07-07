'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

interface Category { id: string; name: string; slug: string; }
interface Props { categories: Category[]; profileId: string; }

export default function ForumPostBtn({ categories, profileId }: Props) {
  const router = useRouter();
  const [open, setOpen]   = useState(false);
  const [form, setForm]   = useState({ title: '', content: '', category_id: categories[0]?.id ?? '', tags: '' });
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) { setForm(prev => ({ ...prev, [k]: v })); }

  async function submit() {
    if (!form.title.trim() || !form.content.trim()) return;
    setLoading(true);
    await fetch('/api/community/forum/post', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      }),
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500/10 text-violet-400 text-xs font-semibold hover:bg-violet-500/20 transition-colors">
      <Plus className="w-3.5 h-3.5" /> Nouvelle discussion
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div className="bg-bg-card rounded-2xl border border-slate-200 w-full max-w-lg space-y-4 p-6"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-slate-900">Nouvelle discussion</h3>
          <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-slate-500" /></button>
        </div>

        <div className="space-y-1">
          <label className="text-slate-400 text-xs">Catégorie</label>
          <select value={form.category_id} onChange={e => set('category_id', e.target.value)}
            className="w-full bg-bg rounded-lg px-3 py-2 text-slate-600 text-xs border border-slate-200 focus:outline-none">
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-slate-400 text-xs">Titre *</label>
          <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
            placeholder="Votre question ou sujet…"
            className="w-full bg-bg rounded-lg px-3 py-2 text-slate-600 text-xs border border-slate-200 focus:outline-none" />
        </div>

        <div className="space-y-1">
          <label className="text-slate-400 text-xs">Contenu *</label>
          <textarea value={form.content} onChange={e => set('content', e.target.value)}
            placeholder="Décrivez votre situation, votre question…" rows={5}
            className="w-full bg-bg rounded-lg px-3 py-2 text-slate-600 text-xs border border-slate-200 focus:outline-none resize-none" />
        </div>

        <div className="space-y-1">
          <label className="text-slate-400 text-xs">Tags (virgule)</label>
          <input type="text" value={form.tags} onChange={e => set('tags', e.target.value)}
            placeholder="recrutement, SIRH, Sénégal…"
            className="w-full bg-bg rounded-lg px-3 py-2 text-slate-600 text-xs border border-slate-200 focus:outline-none" />
        </div>

        <button onClick={submit} disabled={!form.title.trim() || !form.content.trim() || loading}
          className="w-full py-2.5 bg-violet-500 text-white rounded-xl text-sm font-semibold hover:bg-violet-600 disabled:opacity-40 transition-all">
          {loading ? 'Publication…' : 'Publier la discussion'}
        </button>
      </div>
    </div>
  );
}

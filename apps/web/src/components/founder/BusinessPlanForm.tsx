'use client';

import { useState, useTransition } from 'react';
import { Sparkles, Check, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface Section { id: string; label: string; desc: string; value: string; }

interface Props {
  sections:  Section[];
  archetype: string | null;
}

export default function BusinessPlanForm({ sections, archetype }: Props) {
  const [values, setValues]         = useState<Record<string, string>>(
    Object.fromEntries(sections.map(s => [s.id, s.value]))
  );
  const [expanded, setExpanded]     = useState<string | null>(sections[0]?.id ?? null);
  const [saving, setSaving]         = useState<string | null>(null);
  const [saved, setSaved]           = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState<string | null>(null);
  const [, startTransition]         = useTransition();

  async function saveSection(id: string) {
    setSaving(id);
    await fetch('/api/founder/business-plan', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ section: id, content: values[id] }),
    });
    setSaving(null);
    setSaved(prev => new Set(prev).add(id));
    setTimeout(() => setSaved(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
  }

  async function generateWithAI(id: string) {
    setGenerating(id);
    const res = await fetch('/api/founder/business-plan/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ section: id, archetype, currentPlan: values }),
    });
    if (res.ok) {
      const { content } = await res.json() as { content: string };
      setValues(prev => ({ ...prev, [id]: content }));
    }
    setGenerating(null);
  }

  return (
    <div className="space-y-3">
      {sections.map(s => {
        const isOpen = expanded === s.id;
        const v      = values[s.id] ?? '';
        return (
          <div key={s.id} className="border border-white/[0.06] rounded-xl overflow-hidden">
            <button onClick={() => setExpanded(isOpen ? null : s.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${v.length > 20 ? 'bg-emerald-500' : 'bg-white/10'}`} />
                <div className="text-left">
                  <p className="text-white text-sm font-medium">{s.label}</p>
                  <p className="text-slate-500 text-xs">{s.desc}</p>
                </div>
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-white/[0.04]">
                <textarea
                  value={v}
                  onChange={e => setValues(prev => ({ ...prev, [s.id]: e.target.value }))}
                  placeholder={`Décrivez ${s.label.toLowerCase()}…`}
                  rows={5}
                  className="w-full bg-bg border border-white/[0.06] rounded-xl px-3 py-2.5 text-slate-300 text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50 resize-none transition-all mt-3"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => generateWithAI(s.id)} disabled={!!generating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-violet-400 border border-violet-500/20 hover:bg-violet-500/10 disabled:opacity-40 transition-all">
                    {generating === s.id
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Génération…</>
                      : <><Sparkles className="w-3 h-3" /> Suggérer avec IA</>}
                  </button>
                  <button onClick={() => saveSection(s.id)} disabled={saving === s.id || !v.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-40 transition-all">
                    {saving === s.id
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Sauvegarde…</>
                      : saved.has(s.id)
                      ? <><Check className="w-3 h-3 text-emerald-400" /> Sauvegardé</>
                      : 'Sauvegarder'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

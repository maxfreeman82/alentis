'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2, Users } from 'lucide-react';

interface Profile { id: string; first_name: string | null; last_name: string | null; role: string; }
interface Props { participants: Profile[]; organizationId: string; }

export default function CreateSessionModal({ participants, organizationId }: Props) {
  const router = useRouter();
  const now    = new Date();

  const [open,     setOpen]     = useState(false);
  const [quarter,  setQuarter]  = useState<number>(Math.ceil((now.getMonth() + 1) / 3));
  const [year,     setYear]     = useState<number>(now.getFullYear());
  const [selected, setSelected] = useState<Set<string>>(new Set(participants.map(p => p.id)));
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  function toggleAll() {
    if (selected.size === participants.length) setSelected(new Set());
    else setSelected(new Set(participants.map(p => p.id)));
  }

  async function submit() {
    if (selected.size < 2) { setError('Sélectionnez au moins 2 participants.'); return; }
    setLoading(true);
    setError('');

    const res = await fetch('/api/tour-de-table/session', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ quarter, year, participant_ids: Array.from(selected) }),
    });

    if (!res.ok) {
      const data = await res.json() as { error?: string };
      setError(data.error ?? 'Erreur lors de la création');
      setLoading(false);
      return;
    }

    const { sessionId } = await res.json() as { sessionId: string };
    router.push(`/performance/tour-de-table/${sessionId}`);
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
        <Plus className="w-4 h-4" /> Nouvelle session
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-bg-card border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="font-display text-slate-900 text-lg">Nouveau Tour de Table</h2>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Trimestre + Année */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-400 text-xs">Trimestre</label>
                  <select value={quarter} onChange={e => setQuarter(Number(e.target.value))}
                    className="w-full bg-bg border border-slate-200 rounded-xl px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-violet-500/50">
                    <option value={1}>T1 (Jan–Mar)</option>
                    <option value={2}>T2 (Avr–Jun)</option>
                    <option value={3}>T3 (Jul–Sep)</option>
                    <option value={4}>T4 (Oct–Déc)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 text-xs">Année</label>
                  <select value={year} onChange={e => setYear(Number(e.target.value))}
                    className="w-full bg-bg border border-slate-200 rounded-xl px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-violet-500/50">
                    {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Participants */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-400 text-xs flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Participants ({selected.size}/{participants.length})
                  </label>
                  <button onClick={toggleAll} className="text-violet-400 text-[10px] hover:underline">
                    {selected.size === participants.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {participants.map(p => (
                    <label key={p.id} className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 px-2 py-1.5 rounded-lg">
                      <input type="checkbox" checked={selected.has(p.id)}
                        onChange={() => {
                          const next = new Set(selected);
                          next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                          setSelected(next);
                        }}
                        className="accent-violet-500 w-4 h-4" />
                      <div className="w-6 h-6 rounded-md bg-violet-500/15 flex items-center justify-center">
                        <span className="text-violet-400 text-[9px] font-bold">
                          {(p.first_name ?? '?').slice(0, 1)}{(p.last_name ?? '').slice(0, 1)}
                        </span>
                      </div>
                      <span className="text-slate-600 text-xs">{p.first_name} {p.last_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {error && <p className="text-rose-400 text-xs">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-800 text-sm transition-all">
                  Annuler
                </button>
                <button onClick={submit} disabled={loading || selected.size < 2}
                  className="flex-1 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Création…</> : 'Créer la session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

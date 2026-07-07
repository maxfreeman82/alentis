'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

const EXPERTISE_OPTIONS = [
  'Recrutement', 'Leadership', 'RH Stratégique', 'Formation',
  'Droit RH', 'Tech RH', 'Finance RH', 'DEI',
];

export default function MentoringRegisterBtn({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [open, setOpen]         = useState(false);
  const [bio, setBio]           = useState('');
  const [areas, setAreas]       = useState<string[]>([]);
  const [hours, setHours]       = useState(2);
  const [type, setType]         = useState<'mentor' | 'mentee' | 'both'>('mentor');
  const [loading, setLoading]   = useState(false);

  async function submit() {
    setLoading(true);
    await fetch('/api/community/mentoring', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ bio, expertise_areas: areas, available_hours: hours, mentor_type: type }),
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 text-violet-400 text-xs font-semibold hover:bg-violet-500/20 transition-colors w-full justify-center">
      <Plus className="w-3.5 h-3.5" /> Rejoindre le réseau
    </button>
  );

  return (
    <div className="space-y-3 border border-slate-200 rounded-xl p-3">
      <div className="flex gap-2">
        {(['mentor', 'mentee', 'both'] as const).map(t => (
          <button key={t} onClick={() => setType(t)}
            className={`flex-1 py-1 rounded-lg text-xs capitalize transition-all ${type === t ? 'bg-violet-500/20 text-violet-400 font-semibold' : 'text-slate-500 hover:text-slate-300'}`}>
            {t}
          </button>
        ))}
      </div>
      <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio courte (expertise, secteur…)" rows={2}
        className="w-full bg-bg rounded-lg px-2.5 py-2 text-slate-600 text-xs resize-none border border-slate-200 focus:outline-none focus:border-violet-500/30" />
      <div className="flex flex-wrap gap-1">
        {EXPERTISE_OPTIONS.map(a => (
          <button key={a} onClick={() => setAreas(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])}
            className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${areas.includes(a) ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-50 text-slate-500 hover:text-slate-300'}`}>
            {a}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <label className="text-slate-500 text-xs">Dispo : <strong className="text-slate-900">{hours}h</strong>/sem</label>
        <input type="range" min={1} max={10} value={hours} onChange={e => setHours(+e.target.value)} className="w-24 accent-violet-500" />
      </div>
      <button onClick={submit} disabled={loading || areas.length === 0}
        className="w-full py-2 bg-violet-500 text-white rounded-xl text-xs font-semibold hover:bg-violet-600 disabled:opacity-40 transition-all">
        {loading ? 'Enregistrement…' : 'Créer mon profil'}
      </button>
    </div>
  );
}

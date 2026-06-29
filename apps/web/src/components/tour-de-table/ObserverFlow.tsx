'use client';

import { useState } from 'react';
import { CheckCircle, PartyPopper } from 'lucide-react';
import ObservationForm from './ObservationForm';

interface Profile { id: string; first_name: string | null; last_name: string | null; }

interface Props {
  sessionId: string;
  profiles:  Profile[];
  doneIds:   string[];
}

export default function ObserverFlow({ sessionId, profiles, doneIds }: Props) {
  const [completed, setCompleted] = useState<Set<string>>(new Set(doneIds));

  // Les profils restants à observer
  const remaining = profiles.filter(p => !completed.has(p.id));
  const [currentIdx, setCurrentIdx] = useState(0);

  if (profiles.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-white font-display text-xl">Aucun collègue à observer</p>
        <p className="text-slate-500 text-sm">Vous êtes le seul participant ou tous ont déjà été observés.</p>
      </div>
    );
  }

  if (completed.size === profiles.length) {
    return (
      <div className="text-center py-16 space-y-4">
        <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
        <h2 className="font-display text-white text-2xl">Tour complété</h2>
        <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
          Merci pour vos observations. Vos réponses sont anonymes et seront agrégées avec celles de vos collègues.
        </p>
        <p className="text-slate-600 text-xs">
          Les résultats seront disponibles une fois la session clôturée par les RH.
        </p>
      </div>
    );
  }

  const current = remaining[currentIdx] ?? remaining[0];
  if (!current) return null;

  const currentId = current.id;

  function handleComplete() {
    setCompleted(prev => new Set(prev).add(currentId));
    // Avancer vers le suivant restant
    const nextIdx = remaining.findIndex(p => p.id === currentId) + 1;
    if (nextIdx < remaining.length) setCurrentIdx(nextIdx);
  }

  return (
    <div className="space-y-6">
      {/* Mémo d'instruction */}
      <div className="text-center space-y-1">
        <p className="text-violet-400 text-xs font-semibold uppercase tracking-widest">OBSERVATIONS ANONYMES</p>
        <h1 className="font-display text-white text-xl">Vos observations</h1>
        <p className="text-slate-500 text-xs">Évaluez chaque comportement de 1 (Jamais) à 5 (Toujours)</p>
      </div>

      {/* Liste des personnes avec statut */}
      <div className="flex gap-2 flex-wrap">
        {profiles.map(p => {
          const isDone    = completed.has(p.id);
          const isActive  = p.id === current.id;
          return (
            <div key={p.id}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                isDone    ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' :
                isActive  ? 'border-violet-500/40 bg-violet-500/10 text-violet-300' :
                            'border-white/[0.04] text-slate-600'
              }`}>
              {isDone && <CheckCircle className="w-3 h-3" />}
              {p.first_name} {(p.last_name ?? '').slice(0, 1)}.
            </div>
          );
        })}
      </div>

      {/* Formulaire d'observation */}
      <ObservationForm
        sessionId={sessionId}
        observed={current}
        totalPeople={profiles.length}
        current={profiles.indexOf(current) + 1}
        onComplete={handleComplete}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Bot, Loader2, AlertTriangle, TrendingUp, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

type Priority = 'critique' | 'haute' | 'moyenne';

interface Recommandation {
  profil:              string;
  famille:             string;
  priorite:            Priority;
  raison_strategique:  string;
  impact_ias:          number;
  criteres_cles:       string[];
}

interface Advice {
  diagnostic:      string;
  urgent: {
    famille:              string;
    gap_pts:              number;
    impact_ias_potentiel: number;
    raison:               string;
  };
  recommandations: Recommandation[];
  alerte:          string | null;
}

interface AdvisorResult {
  ok:         boolean;
  archetype:  string | null;
  ias:        number;
  team_size:  number;
  energy_gap: Record<string, number> | null;
  advice:     Advice;
}

const PRIORITY_STYLES: Record<Priority, string> = {
  critique: 'bg-rose/10 text-rose border-rose/20',
  haute:    'bg-amber/10 text-amber border-amber/20',
  moyenne:  'bg-sky/10 text-sky border-sky/20',
};

const FAMILY_COLORS: Record<string, string> = {
  Pilotes:        '#F97316',
  Initialiseurs:  '#8B5CF6',
  Accomplisseurs: '#10B981',
  Dynamiseurs:    '#0EA5E9',
  Régulateurs:    '#F59E0B',
};

export function AIAdvisorWidget() {
  const [status,   setStatus]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result,   setResult]   = useState<AdvisorResult | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [err,      setErr]      = useState('');

  async function generate() {
    setStatus('loading');
    setErr('');
    try {
      const res  = await fetch('/api/recrutement/ai-advisor', { method: 'POST' });
      const data = await res.json() as AdvisorResult & { error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Analyse échouée');
      setResult(data);
      setStatus('done');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur inconnue');
      setStatus('error');
    }
  }

  // État initial — bouton d'activation
  if (status === 'idle' || status === 'error') {
    return (
      <div className="card border-l-4 border-l-violet">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet/10 flex items-center justify-center flex-shrink-0">
            <Bot size={17} className="text-violet" />
          </div>
          <div className="flex-1">
            <p className="section-tag text-violet mb-0.5">CONSEILLER IA STRATÉGIQUE</p>
            <p className="text-slate-900 font-semibold text-sm">Analyse des besoins de recrutement</p>
            <p className="text-slate-400 text-xs mt-1">
              L'IA analyse votre ADN organisationnel, votre vision et votre IAS pour vous dire exactement quel profil recruter — et pourquoi c'est stratégiquement nécessaire.
            </p>
            {err && <p className="text-rose text-xs mt-2">{err}</p>}
          </div>
          <button
            onClick={generate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet text-white text-xs font-semibold hover:bg-violet/90 transition-all flex-shrink-0"
          >
            <Sparkles size={12} />
            Analyser
          </button>
        </div>
      </div>
    );
  }

  // Chargement
  if (status === 'loading') {
    return (
      <div className="card border-l-4 border-l-violet">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet/10 flex items-center justify-center flex-shrink-0">
            <Loader2 size={17} className="text-violet animate-spin" />
          </div>
          <div>
            <p className="section-tag text-violet mb-0.5">CONSEILLER IA STRATÉGIQUE</p>
            <p className="text-slate-900 text-sm">Analyse de votre ADN organisationnel en cours…</p>
            <p className="text-slate-400 text-xs mt-0.5">Calcul des gaps énergétiques · Corrélation vision · Recommandations</p>
          </div>
        </div>
      </div>
    );
  }

  // Résultat
  if (!result) return null;
  const { advice } = result;
  const urgentColor = FAMILY_COLORS[advice.urgent.famille] ?? '#8B5CF6';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="card border-l-4 border-l-violet !pb-3">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-violet/10 flex items-center justify-center flex-shrink-0">
            <Bot size={17} className="text-violet" />
          </div>
          <div className="flex-1">
            <p className="section-tag text-violet mb-0.5">CONSEILLER IA STRATÉGIQUE</p>
            <p className="text-slate-900 font-semibold text-sm">Analyse de vos besoins de recrutement</p>
          </div>
          <button onClick={generate} className="text-violet text-xs hover:underline flex-shrink-0">
            Relancer
          </button>
        </div>

        {/* Diagnostic */}
        <p className="text-slate-600 text-sm leading-relaxed bg-violet/5 rounded-xl px-3 py-2 border border-violet/10">
          {advice.diagnostic}
        </p>
      </div>

      {/* Besoin urgent */}
      <div className="card" style={{ borderLeftWidth: 4, borderLeftColor: urgentColor }}>
        <p className="section-tag mb-1" style={{ color: urgentColor }}>BESOIN URGENT</p>
        <div className="flex items-center gap-3 mb-2">
          <p className="text-slate-900 font-semibold text-sm">{advice.urgent.famille}</p>
          <span className="text-xs font-mono" style={{ color: urgentColor }}>
            −{advice.urgent.gap_pts} pts · +{advice.urgent.impact_ias_potentiel} IAS potentiel
          </span>
        </div>
        <p className="text-slate-500 text-xs leading-relaxed">{advice.urgent.raison}</p>
      </div>

      {/* Recommandations */}
      <div className="space-y-2">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
          <TrendingUp size={12} className="text-violet" /> Profils à recruter
        </p>
        {advice.recommandations.map((r, i) => {
          const fc = FAMILY_COLORS[r.famille] ?? '#8B5CF6';
          const isOpen = expanded === i;
          return (
            <div key={i} className="card !p-0 overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${fc}15` }}
                >
                  <span className="text-xs font-bold" style={{ color: fc }}>{r.famille[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-slate-900 text-sm font-medium">{r.profil}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border capitalize ${PRIORITY_STYLES[r.priorite]}`}>
                      {r.priorite}
                    </span>
                  </div>
                  {!isOpen && (
                    <p className="text-slate-400 text-xs mt-0.5 truncate">{r.raison_strategique}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-mono text-xs text-violet">+{r.impact_ias} IAS</span>
                  {isOpen ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                  <p className="text-slate-600 text-sm leading-relaxed">{r.raison_strategique}</p>
                  {r.criteres_cles.length > 0 && (
                    <div>
                      <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">Critères clés</p>
                      <div className="flex flex-wrap gap-1.5">
                        {r.criteres_cles.map((c, j) => (
                          <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <a
                    href={`/recrutement/matching`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet hover:underline mt-1"
                  >
                    <Sparkles size={11} /> Trouver ce profil dans la base →
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Alerte */}
      {advice.alerte && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose/5 border border-rose/20">
          <AlertTriangle size={14} className="text-rose flex-shrink-0 mt-0.5" />
          <p className="text-slate-600 text-xs leading-relaxed">{advice.alerte}</p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, AlertTriangle, CheckCircle2, Info, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ValidationReport, PairStats, CorrelationStrength } from '@/lib/assessment/statistics';

// ─── Utilitaires visuels ──────────────────────────────────────────────────────

const STRENGTH_STYLES: Record<CorrelationStrength, { label: string; color: string; bg: string }> = {
  strong:      { label: 'Forte',        color: 'text-emerald', bg: 'bg-emerald/10 border-emerald/20' },
  moderate:    { label: 'Modérée',      color: 'text-sky',     bg: 'bg-sky/10 border-sky/20' },
  weak:        { label: 'Faible',       color: 'text-rose',    bg: 'bg-rose/10 border-rose/20' },
  insufficient:{ label: 'Insuffisant',  color: 'text-slate-400', bg: 'bg-slate-100 border-slate-200' },
};

function CorrelationBar({ r }: { r: number }) {
  const pct   = Math.round(Math.abs(r) * 100);
  const color  = r >= 0.5 ? '#10B981' : r >= 0.3 ? '#0EA5E9' : '#F43F5E';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="font-mono text-xs w-10 text-right" style={{ color }}>
        r={r.toFixed(2)}
      </span>
    </div>
  );
}

function PairCard({ p }: { p: PairStats }) {
  const style = STRENGTH_STYLES[p.strength];
  return (
    <div className={cn('card border-l-4', p.type === 'negative_control' ? 'border-l-amber/60' : 'border-l-slate-200')}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-slate-900 text-sm font-medium truncate">{p.label}</p>
            {p.type === 'negative_control' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber/10 text-amber border border-amber/20 font-semibold flex-shrink-0">
                Contrôle négatif
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
            <span>{p.question_a}</span>
            <span>↔</span>
            <span>{p.question_b}</span>
            <span className="ml-1 text-slate-500">n={p.n}</span>
          </div>

          {p.type === 'positive' && p.n >= 3 && (
            <CorrelationBar r={p.r} />
          )}

          <p className="text-slate-500 text-xs leading-relaxed">{p.recommendation}</p>
        </div>

        <div className="flex-shrink-0 text-right space-y-1.5">
          {p.type === 'positive' ? (
            <>
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold border', style.bg, style.color)}>
                {style.label}
              </span>
              {p.n > 0 && (
                <p className="text-[10px] text-slate-400">{p.coherent_pct}% cohérentes</p>
              )}
            </>
          ) : (
            p.n > 0 && (
              <div className="text-right">
                <p className="font-mono text-sm text-amber font-bold">{p.trigger_pct}%</p>
                <p className="text-[10px] text-slate-400">déclenchées</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function Histogram({ values, threshold }: { values: number[]; threshold: number | null }) {
  if (values.length === 0) return <p className="text-slate-400 text-xs text-center py-4">Pas encore de données.</p>;

  // Buckets 0-9, 10-19, ..., 90-100
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    label: `${i * 10}–${i * 10 + 9}`,
    count: values.filter(v => v >= i * 10 && v < (i + 1) * 10).length,
  }));
  const maxCount = Math.max(...buckets.map(b => b.count), 1);

  return (
    <div className="space-y-1">
      {buckets.map((b, i) => {
        const pct     = Math.round((b.count / maxCount) * 100);
        const isBelow = threshold !== null && i * 10 < threshold;
        return (
          <div key={b.label} className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-slate-400 w-14 flex-shrink-0">{b.label}</span>
            <div className="flex-1 h-4 bg-bg rounded overflow-hidden">
              <div
                className="h-full rounded transition-all duration-500"
                style={{
                  width:           `${pct}%`,
                  backgroundColor: isBelow ? '#F43F5E' : '#8B5CF6',
                  opacity:         b.count === 0 ? 0.2 : 0.8,
                }}
              />
            </div>
            <span className="font-mono text-[10px] text-slate-400 w-6 text-right">{b.count}</span>
          </div>
        );
      })}
      {threshold !== null && (
        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-3 h-3 rounded-sm bg-rose/60 flex-shrink-0" />
          <p className="text-[10px] text-slate-400">Flaggé (score &lt; {threshold})</p>
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────

interface ValidationDashboardProps {
  defaultType?: 'energy_skills' | 'vision_pulse';
}

export function ValidationDashboard({ defaultType = 'energy_skills' }: ValidationDashboardProps) {
  const [type,    setType]    = useState<'energy_skills' | 'vision_pulse'>(defaultType);
  const [report,  setReport]  = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    setReport(null);
    void fetch(`/api/admin/validation-stats?type=${type}`)
      .then(r => r.json() as Promise<ValidationReport & { error?: string }>)
      .then(data => {
        if ('error' in data) { setError(data.error ?? 'Erreur'); return; }
        setReport(data);
      })
      .catch(() => setError('Erreur réseau'))
      .finally(() => setLoading(false));
  }, [type]);

  function exportCsv() {
    if (!report) return;
    const rows = [
      ['pairId', 'label', 'type', 'q_a', 'q_b', 'n', 'r', 'strength', 'coherent_pct', 'trigger_pct', 'recommendation'],
      ...report.pairs.map(p => [
        p.pairId, `"${p.label}"`, p.type, p.question_a, p.question_b,
        p.n, p.r, p.strength, p.coherent_pct, p.trigger_pct, `"${p.recommendation}"`,
      ]),
    ];
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `validation_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  const positivePairs  = report?.pairs.filter(p => p.type === 'positive')   ?? [];
  const negativePairs  = report?.pairs.filter(p => p.type === 'negative_control') ?? [];

  const strongCount    = positivePairs.filter(p => p.strength === 'strong').length;
  const weakCount      = positivePairs.filter(p => p.strength === 'weak').length;

  return (
    <div className="space-y-6">
      {/* Sélecteur de type */}
      <div className="flex gap-2">
        {(['energy_skills', 'vision_pulse'] as const).map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs border font-medium transition-colors',
              type === t
                ? 'border-violet/40 bg-violet/10 text-violet'
                : 'border-slate-200 text-slate-400 hover:text-slate-800'
            )}
          >
            {t === 'energy_skills' ? 'Energy Skills' : 'Vision Pulse'}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-sm">
          <Loader2 size={16} className="animate-spin" />
          Calcul des corrélations…
        </div>
      )}
      {error && <p className="text-rose text-sm">{error}</p>}

      {report && !loading && (
        <>
          {/* Progression groupe pilote */}
          <div className="card border-l-4 border-l-violet">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="section-tag text-violet mb-1">GROUPE PILOTE</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <p className="font-display text-3xl text-slate-900">{report.session_count}</p>
                  <p className="text-slate-400 text-sm">/ {report.target} sessions cibles</p>
                </div>
                <div className="h-2 bg-bg rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width:           `${report.progress_pct}%`,
                      backgroundColor: report.progress_pct >= 100 ? '#10B981' : '#8B5CF6',
                    }}
                  />
                </div>
                <p className="text-slate-400 text-xs mt-1.5">
                  {report.progress_pct < 100
                    ? `${report.target - report.session_count} sessions manquantes pour une validation statistique fiable`
                    : 'Seuil minimum atteint — résultats exploitables'}
                </p>
              </div>
              <button
                onClick={exportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet/10 border border-violet/20 text-violet text-xs font-semibold hover:bg-violet/15 transition-all flex-shrink-0"
              >
                <Download size={12} />
                CSV
              </button>
            </div>
          </div>

          {/* KPIs rapides */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card text-center">
              <p className="font-display text-2xl text-emerald">{strongCount}</p>
              <p className="text-slate-400 text-xs mt-1">Paires validées</p>
            </div>
            <div className="card text-center">
              <p className="font-display text-2xl text-rose">{weakCount}</p>
              <p className="text-slate-400 text-xs mt-1">À reformuler</p>
            </div>
            <div className="card text-center">
              <p className="font-display text-2xl text-slate-900">{report.avg_coherence}%</p>
              <p className="text-slate-400 text-xs mt-1">Cohérence moy.</p>
            </div>
            <div className="card text-center">
              <p className="font-display text-2xl text-slate-900">
                {report.avg_time_ms > 0 ? `${Math.round(report.avg_time_ms / 1000)}s` : '—'}
              </p>
              <p className="text-slate-400 text-xs mt-1">Temps moy./question</p>
            </div>
          </div>

          {/* Calibration des seuils */}
          <div className="card space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-violet" />
              <p className="text-slate-900 font-semibold text-sm">Calibration des seuils</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Seuil de cohérence */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-semibold">Seuil de cohérence</p>
                  {report.suggested_threshold !== null && report.suggested_threshold !== report.current_threshold && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber/10 text-amber border border-amber/20 font-semibold">
                      Recalibration recommandée
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-3">
                  <div className="text-center">
                    <p className="font-mono text-xl text-slate-900 font-bold">{report.current_threshold}</p>
                    <p className="text-[10px] text-slate-400">Actuel</p>
                  </div>
                  {report.suggested_threshold !== null && (
                    <>
                      <p className="text-slate-300">→</p>
                      <div className="text-center">
                        <p className="font-mono text-xl text-violet font-bold">{report.suggested_threshold}</p>
                        <p className="text-[10px] text-slate-400">Suggéré (P15)</p>
                      </div>
                    </>
                  )}
                  {report.suggested_threshold === null && (
                    <p className="text-[10px] text-slate-400">Disponible à {report.target} sessions</p>
                  )}
                </div>
              </div>

              {/* Seuil de rapidité */}
              <div className="space-y-1">
                <p className="text-xs text-slate-500 font-semibold">Seuil de rapidité (P5)</p>
                <div className="flex items-baseline gap-3">
                  <div className="text-center">
                    <p className="font-mono text-xl text-slate-900 font-bold">3 000ms</p>
                    <p className="text-[10px] text-slate-400">Actuel</p>
                  </div>
                  {report.timing_p5_ms !== null && (
                    <>
                      <p className="text-slate-300">→</p>
                      <div className="text-center">
                        <p className="font-mono text-xl text-violet font-bold">{report.timing_p5_ms.toLocaleString()}ms</p>
                        <p className="text-[10px] text-slate-400">Suggéré (P5)</p>
                      </div>
                    </>
                  )}
                  {report.timing_p5_ms === null && (
                    <p className="text-[10px] text-slate-400">Disponible à {report.target} sessions</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <Info size={12} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Les seuils suggérés sont calculés sur la distribution réelle de votre population.
                P15 = le score en dessous duquel se trouvent 15% des répondants, P5 = les 5% les plus rapides.
                Ajustez dans <code className="font-mono text-[9px]">lib/assessment/integrity.ts</code> après validation.
              </p>
            </div>
          </div>

          {/* Distribution des scores de cohérence */}
          <div className="card space-y-3">
            <p className="text-slate-900 font-semibold text-sm">Distribution des scores de cohérence</p>
            <Histogram values={report.coherence_distribution} threshold={report.suggested_threshold ?? report.current_threshold} />
            <div className="flex items-center gap-4 text-[10px] text-slate-400">
              <span>{report.session_count} sessions · {report.flagged_pct}% flaggées</span>
            </div>
          </div>

          {/* Paires positives */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald" />
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
                Paires miroir positives ({positivePairs.length})
              </p>
            </div>
            {positivePairs.map(p => <PairCard key={p.pairId} p={p} />)}
          </div>

          {/* Contrôles négatifs */}
          {negativePairs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} className="text-amber" />
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
                  Contrôles négatifs ({negativePairs.length})
                </p>
              </div>
              {negativePairs.map(p => <PairCard key={p.pairId} p={p} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

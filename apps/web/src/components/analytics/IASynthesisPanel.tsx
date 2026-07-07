'use client';

import { useState, useTransition } from 'react';
import { Sparkles, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

export function IASynthesisPanel() {
  const [synthesis,    setSynthesis]    = useState<string | null>(null);
  const [generatedAt,  setGeneratedAt]  = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [collapsed,    setCollapsed]    = useState(false);
  const [isPending,    startTransition] = useTransition();

  function generate() {
    setError(null);
    startTransition(async () => {
      const res  = await fetch('/api/analytics/ia-synthesis', { method: 'POST' });
      const data = await res.json() as { ok?: boolean; synthesis?: string; generatedAt?: string; error?: string };
      if (!res.ok) { setError(data.error ?? 'Erreur lors de la génération'); return; }
      setSynthesis(data.synthesis ?? '');
      setGeneratedAt(data.generatedAt ?? null);
      setCollapsed(false);
    });
  }

  // Render markdown-like sections (## headers + numbered lists)
  function renderMarkdown(text: string) {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('## ')) {
        return (
          <h3 key={i} className="font-display text-slate-900 text-sm mt-4 mb-2 first:mt-0">
            {line.replace('## ', '')}
          </h3>
        );
      }
      if (/^\d+\./.test(line)) {
        return (
          <p key={i} className="text-slate-600 text-sm flex gap-2">
            <span className="text-emerald-400 font-bold flex-shrink-0">{line.match(/^\d+/)?.[0]}.</span>
            <span>{line.replace(/^\d+\.\s*/, '')}</span>
          </p>
        );
      }
      if (line.trim() === '') return <div key={i} className="h-1" />;
      return <p key={i} className="text-slate-600 text-sm leading-relaxed">{line}</p>;
    });
  }

  return (
    <div className="card space-y-4" style={{ borderLeft: '4px solid #8B5CF6' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <h3 className="font-display text-slate-900 text-sm">Synthèse IA exécutive</h3>
          {generatedAt && (
            <span className="text-[10px] text-slate-600">
              · {new Date(generatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {synthesis && (
            <button
              type="button"
              onClick={() => setCollapsed(v => !v)}
              className="text-slate-500 hover:text-slate-600 transition-colors"
            >
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={generate}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 transition-colors disabled:opacity-50"
          >
            {isPending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyse en cours…</>
              : synthesis
                ? <><RefreshCw className="w-3.5 h-3.5" /> Régénérer</>
                : <><Sparkles className="w-3.5 h-3.5" /> Générer l'analyse IA</>
            }
          </button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* État initial */}
      {!synthesis && !isPending && !error && (
        <div className="py-6 text-center space-y-2">
          <p className="text-slate-500 text-sm">
            Cliquez sur <span className="text-violet-400 font-medium">Générer l'analyse IA</span> pour obtenir une synthèse exécutive de votre organisation.
          </p>
          <p className="text-slate-700 text-xs">Analyse basée sur tous vos indicateurs RH · Propulsé par Claude</p>
        </div>
      )}

      {/* Chargement */}
      {isPending && (
        <div className="py-8 flex flex-col items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-6 bg-violet-500/40 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
          <p className="text-slate-500 text-xs">Claude analyse vos données RH…</p>
        </div>
      )}

      {/* Contenu */}
      {synthesis && !collapsed && (
        <div className="space-y-1 pt-1 border-t border-slate-200">
          {renderMarkdown(synthesis)}
        </div>
      )}

      {synthesis && collapsed && (
        <p className="text-slate-600 text-xs italic">Synthèse masquée · Cliquez sur ↓ pour afficher</p>
      )}
    </div>
  );
}

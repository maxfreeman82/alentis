'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2 } from 'lucide-react';

export function GenerateInsightButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/matching/score-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? 'Erreur serveur');
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inattendue');
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet hover:text-violet/80 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        {loading ? "Analyse en cours…" : "Générer l'analyse IA"}
      </button>
      {error && <p className="text-rose text-[10px] mt-1">{error}</p>}
    </div>
  );
}

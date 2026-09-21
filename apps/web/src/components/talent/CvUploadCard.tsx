'use client';

import { useState } from 'react';
import { Loader2, FileText, UploadCloud } from 'lucide-react';

interface CvExtract {
  jobTitle: string;
  employer: string;
  sector: string;
  yearsExp: number | null;
  hardSkills: string[];
}

interface Props {
  hasExistingCv: boolean;
  existingSkills: string[];
}

export default function CvUploadCard({ hasExistingCv, existingSkills }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ parsed: boolean; extract: CvExtract | null } | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('cv', file);
      const res = await fetch('/api/talent/cv', { method: 'POST', body: formData });
      const json = await res.json() as { ok?: boolean; error?: string; parsed?: boolean; extract?: CvExtract | null };
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'Échec de l\'envoi.');
        return;
      }
      setResult({ parsed: !!json.parsed, extract: json.extract ?? null });
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald/10 flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-emerald" />
        </div>
        <div>
          <p className="text-slate-900 font-semibold">Mon CV</p>
          <p className="text-slate-500 text-xs">
            {hasExistingCv ? 'Un CV est déjà enregistré.' : 'Aucun CV enregistré pour le moment.'}
          </p>
        </div>
      </div>

      {existingSkills.length > 0 && !result && (
        <p className="text-slate-600 text-xs">
          Compétences actuellement détectées : {existingSkills.join(', ')}
        </p>
      )}

      {error && (
        <div role="alert" className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-emerald/10 border border-emerald/20 rounded-xl px-4 py-3 text-xs text-slate-700 space-y-1">
          <p className="font-semibold text-emerald">CV enregistré.</p>
          {result.parsed && result.extract ? (
            <>
              {result.extract.jobTitle && <p>Poste détecté : {result.extract.jobTitle}</p>}
              {result.extract.employer && <p>Employeur détecté : {result.extract.employer}</p>}
              {result.extract.hardSkills.length > 0 && (
                <p>Compétences détectées : {result.extract.hardSkills.join(', ')}</p>
              )}
            </>
          ) : (
            <p>Le fichier est enregistré, mais l&apos;analyse automatique n&apos;a pas abouti — vous pouvez réessayer plus tard.</p>
          )}
        </div>
      )}

      <label
        className={`inline-flex items-center gap-2 bg-emerald text-white py-2.5 px-4 rounded-xl font-semibold text-sm hover:bg-emerald-500 transition-colors w-fit ${
          loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
        {loading ? 'Envoi…' : hasExistingCv ? 'Remplacer mon CV' : 'Téléverser mon CV'}
        <input type="file" accept=".pdf,application/pdf" className="hidden" disabled={loading} onChange={handleFileChange} />
      </label>
    </div>
  );
}

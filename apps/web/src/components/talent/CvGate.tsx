'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import CvUploadCard from './CvUploadCard';

// Étape 0 de l'évaluation : sans compétences issues du CV, l'étape technique
// n'a rien à tester. Si l'analyse automatique échoue, saisie manuelle.
export default function CvGate() {
  const router = useRouter();
  const [needsManual, setNeedsManual] = useState(false);
  const [skillsText, setSkillsText]   = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const skills = skillsText.split(',').map(s => s.trim()).filter(Boolean);

  async function saveSkills() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/talent/skills', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills }),
      });
      const json = await res.json().catch(() => ({})) as { error?: unknown };
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Enregistrement impossible.');
        return;
      }
      router.refresh();
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-1">
        <p className="text-slate-900 font-semibold">Étape 1 · Votre CV</p>
        <p className="text-slate-500 text-sm">
          Les questions techniques portent sur les compétences de votre CV. Déposez-le pour commencer l&apos;évaluation.
        </p>
      </div>

      <CvUploadCard
        hasExistingCv={false}
        existingSkills={[]}
        onUploaded={({ extract }) => {
          if (extract && extract.hardSkills.length > 0) router.refresh();
          else setNeedsManual(true);
        }}
      />

      {needsManual && (
        <div className="card p-5 space-y-3">
          <p className="text-slate-700 text-sm">
            Nous n&apos;avons pas pu détecter vos compétences. Indiquez 3 à 5 compétences techniques clés, séparées par des virgules.
          </p>
          <input value={skillsText} onChange={e => setSkillsText(e.target.value)}
            placeholder="Ex. Excel, SQL, Comptabilité OHADA"
            aria-label="Compétences techniques"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
          {error && <p role="alert" className="text-rose-500 text-xs">{error}</p>}
          <button type="button" onClick={() => void saveSkills()} disabled={saving || skills.length < 1}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-white disabled:opacity-50">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Continuer
          </button>
        </div>
      )}
    </div>
  );
}

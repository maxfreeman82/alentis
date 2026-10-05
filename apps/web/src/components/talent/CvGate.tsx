'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import CvUploadCard from './CvUploadCard';
import type { CvExtract } from '@/lib/ai';

// Étape 0 de l'évaluation : les questions techniques portent sur les compétences
// du CV et les questions de preuve sur le poste déclaré. Si l'analyse automatique
// n'extrait pas l'un des deux, le candidat complète à la main.
export default function CvGate() {
  const router = useRouter();
  const [needsManual, setNeedsManual] = useState(false);
  const [skillsText, setSkillsText]   = useState('');
  const [jobTitle, setJobTitle]       = useState('');
  const [yearsText, setYearsText]     = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const skills = skillsText.split(',').map(s => s.trim()).filter(Boolean);
  const years  = yearsText.trim() === '' ? undefined : Number(yearsText);
  const canSave = skills.length > 0 && jobTitle.trim().length >= 2
    && (years === undefined || (Number.isInteger(years) && years >= 0 && years <= 60));

  function onUploaded(extract: CvExtract | null) {
    if (extract && extract.hardSkills.length > 0 && extract.jobTitle) { router.refresh(); return; }
    // Pré-remplir ce que l'analyse a trouvé, le candidat complète le reste.
    setSkillsText(extract?.hardSkills.join(', ') ?? '');
    setJobTitle(extract?.jobTitle ?? '');
    setYearsText(extract?.yearsExp != null ? String(extract.yearsExp) : '');
    setNeedsManual(true);
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/talent/skills', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills, jobTitle: jobTitle.trim(), yearsExp: years }),
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

  const inputClass = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm';

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-1">
        <p className="text-slate-900 font-semibold">Étape 1 · Votre CV</p>
        <p className="text-slate-500 text-sm">
          Les questions techniques et les questions sur votre expérience s&apos;appuient sur votre CV.
          Déposez-le pour commencer l&apos;évaluation.
        </p>
      </div>

      <CvUploadCard hasExistingCv={false} existingSkills={[]} onUploaded={({ extract }) => onUploaded(extract)} />

      {needsManual && (
        <div className="card p-5 space-y-3">
          <p className="text-slate-700 text-sm">
            L&apos;analyse de votre CV est incomplète. Vérifiez ou complétez ces informations : elles seront
            ensuite vérifiées par les questions de l&apos;évaluation.
          </p>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Poste actuel ou dernier poste</span>
            <input value={jobTitle} onChange={e => setJobTitle(e.target.value)}
              placeholder="Ex. Comptable" className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Années d&apos;expérience professionnelle</span>
            <input value={yearsText} onChange={e => setYearsText(e.target.value)} inputMode="numeric"
              placeholder="Ex. 4" className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">3 à 5 compétences techniques clés, séparées par des virgules</span>
            <input value={skillsText} onChange={e => setSkillsText(e.target.value)}
              placeholder="Ex. Excel, SQL, Comptabilité OHADA" className={inputClass} />
          </label>
          {error && <p role="alert" className="text-rose-500 text-xs">{error}</p>}
          <button type="button" onClick={() => void save()} disabled={saving || !canSave}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-white disabled:opacity-50">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Continuer
          </button>
        </div>
      )}
    </div>
  );
}

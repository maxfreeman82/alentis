'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ASSESSMENT_QUESTIONS,
  ENERGY_FAMILIES,
  type EnergyFamilyId,
} from '@/lib/passport/assessment';
import { cn } from '@/lib/utils';

const FAMILY_ORDER: EnergyFamilyId[] = [
  'pilotes', 'initialiseurs', 'accomplisseurs', 'dynamiseurs', 'regulateurs',
];

// Sections : 5 familles énergie + 1 section soft skills
const SECTIONS = [
  ...FAMILY_ORDER.map((fid) => ({
    id: fid,
    label: ENERGY_FAMILIES[fid].label,
    color: ENERGY_FAMILIES[fid].color,
    questionIds: ASSESSMENT_QUESTIONS
      .filter((q) => q.type === 'energy' && q.family === fid)
      .map((q) => q.id),
  })),
  {
    id: 'soft',
    label: 'Compétences comportementales',
    color: '#64748B',
    questionIds: ASSESSMENT_QUESTIONS
      .filter((q) => q.type === 'soft')
      .map((q) => q.id),
  },
];

const QUESTION_MAP = Object.fromEntries(ASSESSMENT_QUESTIONS.map((q) => [q.id, q]));

interface Props {
  organizationId: string;
  profileId: string;
}

export function AssessmentQuestionnaire({ organizationId, profileId }: Props) {
  const router = useRouter();
  const [section, setSection] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const currentSection = SECTIONS[section];
  const totalSections  = SECTIONS.length;
  const progress       = Math.round(((section) / totalSections) * 100);

  const currentQuestions = currentSection
    ? currentSection.questionIds.map((id) => QUESTION_MAP[id]).filter(Boolean)
    : [];

  const allAnswered = currentSection
    ? currentSection.questionIds.every((id) => responses[id] !== undefined)
    : false;

  const handleSelect = useCallback((qId: string, value: number) => {
    setResponses((prev) => ({ ...prev, [qId]: value }));
  }, []);

  const handleNext = () => {
    if (section < totalSections - 1) {
      setSection((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setSection((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(undefined);

    try {
      const res = await fetch('/api/passport/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, profileId, responses }),
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setError(body.error ?? 'Erreur inattendue');
        return;
      }

      const data = await res.json() as { passport_id?: string };
      router.push(`/talents/passport/${data.passport_id ?? 'me'}`);
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLastSection = section === totalSections - 1;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Barre de progression */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-slate-400">
            Section {section + 1} / {totalSections}
          </span>
          <span className="text-xs font-mono text-slate-400">{progress}%</span>
        </div>
        <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              backgroundColor: currentSection?.color ?? '#10B981',
            }}
          />
        </div>
      </div>

      {/* En-tête de section */}
      <div
        className="card border-l-4 !py-3"
        style={{ borderLeftColor: currentSection?.color ?? '#10B981' }}
      >
        <p className="section-tag mb-0.5" style={{ color: currentSection?.color ?? '#10B981' }}>
          {currentSection?.id === 'soft' ? 'COMPÉTENCES COMPORTEMENTALES' : 'PROFIL ÉNERGÉTIQUE'}
        </p>
        <h2 className="text-white font-semibold text-lg">{currentSection?.label}</h2>
        {currentSection && currentSection.id !== 'soft' && ENERGY_FAMILIES[currentSection.id as EnergyFamilyId] && (
          <p className="text-slate-400 text-sm mt-0.5">
            {ENERGY_FAMILIES[currentSection.id as EnergyFamilyId].description}
          </p>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {currentQuestions.map((q, idx) => {
          if (!q) return null;
          const selected = responses[q.id];

          return (
            <div key={q.id} className="card">
              <p className="text-slate-300 text-sm mb-3 leading-relaxed">
                <span className="text-slate-500 font-mono text-xs mr-2">{idx + 1}.</span>
                {q.text}
              </p>

              <div className="flex gap-2 flex-wrap">
                {q.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelect(q.id, opt.value)}
                    className={cn(
                      'flex-1 min-w-[80px] py-2 px-3 rounded-lg text-xs font-medium transition-all duration-150 text-center',
                      'border border-white/[0.06] hover:border-white/[0.12]',
                      selected === opt.value
                        ? 'text-white border-transparent'
                        : 'text-slate-400 bg-bg-surface hover:text-white'
                    )}
                    style={
                      selected === opt.value
                        ? { backgroundColor: currentSection?.color ?? '#10B981', borderColor: currentSection?.color ?? '#10B981' }
                        : {}
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Erreur */}
      {error && (
        <div className="card border border-rose/30 bg-rose/5">
          <p className="text-rose text-sm">{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-2">
        <button
          onClick={handleBack}
          disabled={section === 0}
          className="btn-secondary text-sm disabled:opacity-30"
        >
          ← Précédent
        </button>

        {isLastSection ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="btn-primary text-sm disabled:opacity-40"
          >
            {submitting ? 'Analyse en cours…' : 'Générer mon Passport'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!allAnswered}
            className="btn-primary text-sm disabled:opacity-40"
          >
            Suivant →
          </button>
        )}
      </div>
    </div>
  );
}

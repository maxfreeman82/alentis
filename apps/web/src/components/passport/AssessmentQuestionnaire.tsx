'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ASSESSMENT_QUESTIONS,
  ENERGY_FAMILIES,
  type EnergyFamilyId,
} from '@/lib/passport/assessment';
import { IntegrityTracker } from '@/components/assessment/IntegrityTracker';
import { cn } from '@/lib/utils';
import { Loader2, LockKeyhole, AlertTriangle } from 'lucide-react';

const FAMILY_ORDER: EnergyFamilyId[] = [
  'pilotes', 'initialiseurs', 'accomplisseurs', 'dynamiseurs', 'regulateurs',
];

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
  profileId:      string;
}

type SessionStatus = 'loading' | 'active' | 'completed' | 'expired' | 'error';

export function AssessmentQuestionnaire({ organizationId, profileId }: Props) {
  const router = useRouter();

  // ── Session anti-triche ───────────────────────────────────────────────────
  const [sessionId,     setSessionId]     = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('loading');
  const [resumeIndex,   setResumeIndex]   = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function initSession() {
      try {
        const res  = await fetch('/api/assessment/session/start', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ assessmentType: 'energy_skills', organizationId }),
        });
        const data = await res.json() as {
          status:       string;
          cannotRetake?: boolean;
          session?:     { id: string; current_index: number; responses: Record<string, number> };
        };
        if (cancelled) return;

        if (data.status === 'completed' || data.cannotRetake) {
          setSessionStatus('completed');
          return;
        }

        const session = data.session;
        if (!session) { setSessionStatus('error'); return; }

        setSessionId(session.id);
        // Reprendre à la bonne section
        if (session.current_index > 0) {
          setResumeIndex(Math.min(session.current_index, SECTIONS.length - 1));
          // Pré-remplir les réponses déjà sauvegardées
          if (Object.keys(session.responses ?? {}).length > 0) {
            setResponses(session.responses);
          }
        }
        setSessionStatus('active');
      } catch {
        if (!cancelled) setSessionStatus('error');
      }
    }
    void initSession();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  // ── État questionnaire ─────────────────────────────────────────────────────
  const [section,    setSection]    = useState(0);
  const [responses,  setResponses]  = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | undefined>(undefined);

  // Appliquer le resume une fois la session chargée
  useEffect(() => {
    if (resumeIndex > 0) setSection(resumeIndex);
  }, [resumeIndex]);

  const currentSection  = SECTIONS[section];
  const totalSections   = SECTIONS.length;
  const progress        = Math.round((section / totalSections) * 100);

  const currentQuestions = currentSection
    ? currentSection.questionIds.map((id) => QUESTION_MAP[id]).filter(Boolean)
    : [];

  const allAnswered = currentSection
    ? currentSection.questionIds.every((id) => responses[id] !== undefined)
    : false;

  const handleSelect = useCallback((qId: string, value: number) => {
    setResponses((prev) => ({ ...prev, [qId]: value }));
  }, []);

  async function handleNext() {
    if (!allAnswered || !sessionId) return;

    // Sauvegarder l'index avancé (verrouillage retour arrière côté serveur)
    void fetch('/api/assessment/session/answer', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sessionId, question_id: '_nav', time_ms: 0, focus_lost: 0, nextIndex: section + 1 }),
    });

    if (section < totalSections - 1) {
      setSection((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function handleSubmit() {
    if (!allAnswered || !sessionId) return;
    setSubmitting(true);
    setError(undefined);

    try {
      // 1. Finaliser la session d'intégrité
      await fetch('/api/assessment/session/complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sessionId, responses }),
      });

      // 2. Générer le Passport
      const res = await fetch('/api/passport/assess', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ organizationId, profileId, responses }),
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
  }

  const isLastSection = section === totalSections - 1;

  // ── États spéciaux ─────────────────────────────────────────────────────────

  if (sessionStatus === 'loading') {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <Loader2 size={24} className="animate-spin text-violet mx-auto" />
          <p className="text-slate-400 text-sm">Préparation de votre session…</p>
        </div>
      </div>
    );
  }

  if (sessionStatus === 'completed') {
    return (
      <div className="max-w-2xl mx-auto card border-l-4 border-l-emerald py-10 text-center space-y-3">
        <LockKeyhole size={28} className="text-emerald mx-auto" />
        <p className="text-slate-900 font-semibold">Évaluation déjà complétée</p>
        <p className="text-slate-400 text-sm">Vous avez déjà soumis votre Energy Skills pour ce cycle.</p>
        <a href="/talents/passport/me" className="inline-block text-violet text-sm hover:underline">
          Voir mon Passport →
        </a>
      </div>
    );
  }

  if (sessionStatus === 'expired') {
    return (
      <div className="max-w-2xl mx-auto card border-l-4 border-l-amber py-10 text-center space-y-3">
        <AlertTriangle size={28} className="text-amber mx-auto" />
        <p className="text-slate-900 font-semibold">Session expirée</p>
        <p className="text-slate-400 text-sm">Votre session a dépassé la limite de 2 heures. Contactez un administrateur.</p>
      </div>
    );
  }

  if (sessionStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto card border-l-4 border-l-rose py-10 text-center">
        <p className="text-rose text-sm">Impossible d'initialiser la session. Veuillez recharger la page.</p>
      </div>
    );
  }

  // ── Questionnaire principal ────────────────────────────────────────────────

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
            style={{ width: `${progress}%`, backgroundColor: currentSection?.color ?? '#10B981' }}
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
        <h2 className="text-slate-900 font-semibold text-lg">{currentSection?.label}</h2>
        {currentSection && currentSection.id !== 'soft' && ENERGY_FAMILIES[currentSection.id as EnergyFamilyId] && (
          <p className="text-slate-400 text-sm mt-0.5">
            {ENERGY_FAMILIES[currentSection.id as EnergyFamilyId].description}
          </p>
        )}
      </div>

      {/* Questions + tracker d'intégrité */}
      <div className="space-y-4">
        {currentQuestions.map((q, idx) => {
          if (!q) return null;
          const selected = responses[q.id];

          return (
            <div key={q.id} className="card">
              {/* Tracker invisible — mesure temps + focus pour chaque question */}
              {sessionId && (
                <IntegrityTracker
                  questionId={q.id}
                  sessionId={sessionId}
                  answer={selected ?? null}
                />
              )}

              <p className="text-slate-600 text-sm mb-3 leading-relaxed">
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
                      'border border-slate-200 hover:border-slate-200',
                      selected === opt.value
                        ? 'text-slate-900 border-transparent'
                        : 'text-slate-400 bg-bg-surface hover:text-slate-800'
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

      {error && (
        <div className="card border border-rose/30 bg-rose/5">
          <p className="text-rose text-sm">{error}</p>
        </div>
      )}

      {/* Navigation — PAS de bouton Précédent (anti-triche : verrouillage retour arrière) */}
      <div className="flex justify-end items-center pt-2">
        {isLastSection ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting || !sessionId}
            className="btn-primary text-sm disabled:opacity-40"
          >
            {submitting ? 'Analyse en cours…' : 'Générer mon Passport'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!allAnswered || !sessionId}
            className="btn-primary text-sm disabled:opacity-40"
          >
            Suivant →
          </button>
        )}
      </div>
    </div>
  );
}

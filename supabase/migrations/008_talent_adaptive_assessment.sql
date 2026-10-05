-- ============================================================
-- TERANGA ALIGN — Questionnaire 6D adaptatif (hors énergie)
-- Migration 008 : sessions + questions par étape (soft, puis life/risk/hard/exp)
-- ============================================================

CREATE TABLE public.talent_assessment_sessions (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  step             TEXT        NOT NULL CHECK (step IN ('hard','soft','exp','life','risk')),
  status           TEXT        NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  -- poste, secteur, années, compétences CV — jamais nom/âge/sexe/origine
  context_snapshot JSONB       NOT NULL DEFAULT '{}',
  -- scores par facette, interne (jamais renvoyé au candidat)
  result           JSONB,
  integrity_flags  JSONB       NOT NULL DEFAULT '[]',
  engine_version   TEXT        NOT NULL DEFAULT 'TALENT_ENGINE_V1',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.talent_assessment_questions (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id       UUID        NOT NULL REFERENCES public.talent_assessment_sessions(id) ON DELETE CASCADE,
  phase            TEXT        NOT NULL CHECK (phase IN ('exploration','deepening')),
  facet            TEXT        NOT NULL,
  difficulty       SMALLINT    CHECK (difficulty BETWEEN 1 AND 5),
  question_text    TEXT        NOT NULL,
  -- {key, text} uniquement : réaffichable à la reprise sans exposer les valeurs
  option_labels    JSONB       NOT NULL DEFAULT '[]',
  -- clé → valeur cachée ; JAMAIS renvoyé au client
  option_values    JSONB       NOT NULL,
  candidate_answer TEXT,
  response_ms      INTEGER,
  ai_generated     BOOLEAN     NOT NULL DEFAULT true,
  answered_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_talent_assessment_sessions_profile ON public.talent_assessment_sessions(profile_id);
CREATE INDEX idx_talent_assessment_questions_session ON public.talent_assessment_questions(session_id);

-- Une seule passation en cours par étape et par candidat (backstop de la reprise
-- applicative ; le 2e INSERT concurrent échoue en 23505, rattrapé par la route).
CREATE UNIQUE INDEX idx_talent_assessment_sessions_one_in_progress
  ON public.talent_assessment_sessions(profile_id, step) WHERE status = 'in_progress';

-- Une seule question en attente par session (cf. retry après échec IA).
CREATE UNIQUE INDEX idx_talent_assessment_questions_one_pending
  ON public.talent_assessment_questions(session_id) WHERE candidate_answer IS NULL;

CREATE TRIGGER trg_talent_assessment_sessions_updated_at
  BEFORE UPDATE ON public.talent_assessment_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Écritures uniquement via les routes serveur (admin client). Le candidat
-- peut seulement lire ses sessions ; les questions (option_values) ne sont
-- lisibles que par le super admin.
ALTER TABLE public.talent_assessment_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_assessment_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tas_own_select" ON public.talent_assessment_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = talent_assessment_sessions.profile_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "tas_superadmin" ON public.talent_assessment_sessions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin'
  ));
CREATE POLICY "taq_superadmin" ON public.talent_assessment_questions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin'
  ));

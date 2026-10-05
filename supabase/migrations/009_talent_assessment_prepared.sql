-- ============================================================
-- TERANGA ALIGN — Pré-génération des questions adaptatives
-- Migration 009 : pendant que le candidat lit une question, le serveur génère
-- la suivante pour chaque branche possible du moteur. La branche qui
-- correspond à la réponse est servie immédiatement, les autres sont jetées.
-- ============================================================

CREATE TABLE public.talent_assessment_prepared (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        UUID        NOT NULL REFERENCES public.talent_assessment_sessions(id) ON DELETE CASCADE,
  -- question en attente au moment de la préparation : un brouillon n'est
  -- utilisable que pour la réponse à CETTE question
  after_question_id UUID        NOT NULL REFERENCES public.talent_assessment_questions(id) ON DELETE CASCADE,
  phase             TEXT        NOT NULL CHECK (phase IN ('exploration','deepening')),
  facet             TEXT        NOT NULL,
  difficulty        SMALLINT    CHECK (difficulty BETWEEN 1 AND 5),
  question_text     TEXT        NOT NULL,
  option_labels     JSONB       NOT NULL,
  -- clé → valeur cachée ; JAMAIS renvoyé au client
  option_values     JSONB       NOT NULL,
  ai_generated      BOOLEAN     NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_talent_assessment_prepared_lookup
  ON public.talent_assessment_prepared(session_id, after_question_id);

-- Mêmes droits que talent_assessment_questions : contient les barèmes cachés.
ALTER TABLE public.talent_assessment_prepared ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tap_superadmin" ON public.talent_assessment_prepared FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin'
  ));

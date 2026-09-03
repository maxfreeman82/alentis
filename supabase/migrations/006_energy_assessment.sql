-- ============================================================
-- TERANGA ALIGN — Energy Assessment Adaptatif
-- Migration 006 : tables autonomes, non liées à talent_passports
-- ============================================================

CREATE TABLE public.energy_assessments (
  id                          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id                  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assessment_route            TEXT        NOT NULL DEFAULT 'exploration'
                                          CHECK (assessment_route IN ('job_application','target_role','exploration')),
  job_reference_id            UUID,
  candidate_context_snapshot  JSONB       NOT NULL DEFAULT '{}',
  status                      TEXT        NOT NULL DEFAULT 'in_progress'
                                          CHECK (status IN ('in_progress','completed')),
  dominant_energy             TEXT,
  secondary_energies          JSONB       NOT NULL DEFAULT '[]',
  confidence_state            JSONB,
  profile_interpretation      TEXT,
  reference_version           TEXT        NOT NULL DEFAULT 'ENERGY_REF_V1',
  inference_version           TEXT        NOT NULL DEFAULT 'ENGINE_V1',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.energy_assessment_questions (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id      UUID        NOT NULL REFERENCES public.energy_assessments(id) ON DELETE CASCADE,
  phase              TEXT        NOT NULL CHECK (phase IN ('exploration','discrimination','confirmation')),
  question_text      TEXT        NOT NULL,
  question_format    TEXT        NOT NULL CHECK (question_format IN ('forced_choice','arbitration')),
  dimension_tested   TEXT,
  hypothesis_tested  TEXT,
  energy_signals     JSONB       NOT NULL,
  candidate_answer   TEXT,
  response_timestamp TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_energy_assessments_profile ON public.energy_assessments(profile_id);
CREATE INDEX idx_energy_assessment_questions_assessment ON public.energy_assessment_questions(assessment_id);

CREATE TRIGGER trg_energy_assessments_updated_at
  BEFORE UPDATE ON public.energy_assessments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.energy_assessments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_assessment_questions ENABLE ROW LEVEL SECURITY;

-- Le candidat voit/modifie uniquement ses propres passations
-- (jointure via profiles.user_id — profiles.id n'est PAS auth.uid()).
CREATE POLICY "ea_own_select" ON public.energy_assessments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = energy_assessments.profile_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "ea_own_insert" ON public.energy_assessments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = energy_assessments.profile_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "ea_own_update" ON public.energy_assessments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = energy_assessments.profile_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "eaq_own" ON public.energy_assessment_questions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.energy_assessments ea
    JOIN public.profiles p ON p.id = ea.profile_id
    WHERE ea.id = energy_assessment_questions.assessment_id AND p.user_id = auth.uid()
  ));

-- Super admin : accès total pour revue/audit
CREATE POLICY "ea_superadmin" ON public.energy_assessments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin'
  ));
CREATE POLICY "eaq_superadmin" ON public.energy_assessment_questions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin'
  ));

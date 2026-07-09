-- Migration 004 — Sessions anti-triche pour les évaluations (Energy Skills, Vision Pulse, Boussole)
-- Principe : une session unique par profil × type × cycle, verrouillage retour arrière, reprise après interruption.

-- ─── Table principale ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assessment_sessions (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID          NOT NULL REFERENCES profiles(id)       ON DELETE CASCADE,
  organization_id  UUID                      REFERENCES organizations(id) ON DELETE SET NULL,

  assessment_type  TEXT          NOT NULL
                                 CHECK (assessment_type IN ('energy_skills','vision_pulse','boussole')),
  cycle_key        TEXT          NOT NULL,   -- '2025' pour annuel, '2025-Q2' pour trimestriel

  status           TEXT          NOT NULL DEFAULT 'started'
                                 CHECK (status IN ('started','completed','expired')),
  current_index    INT           NOT NULL DEFAULT 0,   -- index avancé uniquement vers l'avant

  -- Ordre randomisé des IDs de questions (JSON array de strings)
  question_order   JSONB         NOT NULL DEFAULT '[]',
  -- Mélange des options par question (boussole uniquement : { "VQ1": [2,0,3,1,4], … })
  option_shuffles  JSONB,

  -- Réponses sauvegardées au fil du questionnaire { "P1": 4, "I2": 2, … }
  responses        JSONB         NOT NULL DEFAULT '{}',

  started_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ   NOT NULL,
  completed_at     TIMESTAMPTZ,

  -- Résultats d'intégrité (calculés à la soumission finale)
  coherence_score  NUMERIC(5,2),
  behavior_flags   JSONB         NOT NULL DEFAULT '[]',   -- liste de strings décrivant les alertes
  is_flagged       BOOLEAN       NOT NULL DEFAULT FALSE,   -- flagué = revue humaine recommandée
  is_reviewed      BOOLEAN       NOT NULL DEFAULT FALSE,   -- revue effectuée par un admin
  reviewed_by      UUID                      REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,

  -- Contrainte d'unicité : une seule session valide par profil × type × cycle
  UNIQUE (profile_id, assessment_type, cycle_key)
);

-- ─── Suivi comportemental par question ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assessment_timing (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID          NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  question_id TEXT          NOT NULL,
  time_ms     INT           NOT NULL CHECK (time_ms >= 0),   -- millisecondes pour répondre
  focus_lost  INT           NOT NULL DEFAULT 0,              -- nb pertes de focus sur cette Q
  answered_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (session_id, question_id)   -- une entrée par question par session
);

-- ─── Index ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_assessment_sessions_profile
  ON assessment_sessions (profile_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_type_cycle
  ON assessment_sessions (assessment_type, cycle_key);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_flagged
  ON assessment_sessions (is_flagged, is_reviewed)
  WHERE is_flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_assessment_timing_session
  ON assessment_timing (session_id);

-- ─── Trigger updated_at ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_assessment_session_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assessment_session_ts
  BEFORE UPDATE ON assessment_sessions
  FOR EACH ROW EXECUTE FUNCTION update_assessment_session_ts();

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_timing    ENABLE ROW LEVEL SECURITY;

-- Utilisateur : voir et modifier ses propres sessions
CREATE POLICY "as_own_select"  ON assessment_sessions FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "as_own_insert"  ON assessment_sessions FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "as_own_update"  ON assessment_sessions FOR UPDATE USING (profile_id = auth.uid());

-- Timing : accès uniquement via ses sessions
CREATE POLICY "at_own"
  ON assessment_timing FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM assessment_sessions s
      WHERE s.id = session_id AND s.profile_id = auth.uid()
    )
  );

-- Super admin : accès total pour revue
CREATE POLICY "as_superadmin"
  ON assessment_sessions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
CREATE POLICY "at_superadmin"
  ON assessment_timing FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

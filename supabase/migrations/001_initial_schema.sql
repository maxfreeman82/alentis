-- ============================================================
-- TERANGA ALIGN — Schéma initial
-- Migration 001 : création de toutes les tables
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ORGANISATIONS ─────────────────────────────────────────────────────────────
CREATE TABLE public.organizations (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workos_org_id TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  sector        TEXT,
  size          INTEGER,
  country       TEXT        NOT NULL DEFAULT 'SN',
  city          TEXT,
  cert_level    SMALLINT    NOT NULL DEFAULT 1 CHECK (cert_level BETWEEN 1 AND 4),
  cert_score    NUMERIC(5,2) NOT NULL DEFAULT 0,
  ias_score     NUMERIC(5,2) NOT NULL DEFAULT 0,
  archetype     TEXT,
  plan          TEXT        NOT NULL DEFAULT 'starter'
                            CHECK (plan IN ('starter','growth','enterprise')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── PROFILS UTILISATEURS ──────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workos_user_id TEXT        NOT NULL UNIQUE,
  organization_id UUID       REFERENCES public.organizations(id) ON DELETE SET NULL,
  role           TEXT        NOT NULL DEFAULT 'org_employee'
                             CHECK (role IN (
                               'super_admin','org_admin','org_manager','org_hr',
                               'org_recruiter','org_employee','talent_free','talent_premium','coach'
                             )),
  first_name     TEXT,
  last_name      TEXT,
  email          TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── BOUSSOLE STRATÉGIQUE — ASSESSMENTS ────────────────────────────────────────
CREATE TABLE public.vision_assessments (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  responses        JSONB       NOT NULL DEFAULT '{}',
  archetype        TEXT        NOT NULL,
  divergence_score NUMERIC(5,2),
  vision_statement TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── OKR ENTREPRISE ────────────────────────────────────────────────────────────
CREATE TABLE public.okr_company (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  year            SMALLINT    NOT NULL,
  title           TEXT        NOT NULL,
  progress        NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  on_track        BOOLEAN     NOT NULL DEFAULT true,
  key_results     JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── VISION PULSE — ADHÉSION TRIMESTRIELLE ─────────────────────────────────────
CREATE TABLE public.vision_pulses (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id      UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  quarter              SMALLINT    NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  year                 SMALLINT    NOT NULL,
  avg_knowledge        NUMERIC(5,2),
  avg_credibility      NUMERIC(5,2),
  avg_connection       NUMERIC(5,2),
  avg_capability       NUMERIC(5,2),
  avg_projection       NUMERIC(5,2),
  participation        INTEGER,
  total_employees      INTEGER,
  adhesion_score       NUMERIC(5,2),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, quarter, year)
);

-- ─── TALENT PASSPORT ───────────────────────────────────────────────────────────
CREATE TABLE public.talent_passports (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id            UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id       UUID        REFERENCES public.organizations(id) ON DELETE SET NULL,

  -- Scores 6D
  score_global          NUMERIC(5,2),
  score_hard            NUMERIC(5,2),
  score_soft            NUMERIC(5,2),
  score_exp             NUMERIC(5,2),
  score_life            NUMERIC(5,2),
  score_energy          NUMERIC(5,2),
  score_risk            NUMERIC(5,2),
  growth_potential      NUMERIC(5,2),
  transfer_score        NUMERIC(5,2),

  -- Profil énergétique
  energy_pilotes        NUMERIC(5,2),
  energy_initialiseurs  NUMERIC(5,2),
  energy_accomplisseurs NUMERIC(5,2),
  energy_dynamiseurs    NUMERIC(5,2),
  energy_regulateurs    NUMERIC(5,2),
  dominant_family       TEXT,
  dominant_profile      TEXT,
  energy_level          TEXT,

  -- Soft skills
  soft_communication    NUMERIC(5,2),
  soft_leadership       NUMERIC(5,2),
  soft_adaptability     NUMERIC(5,2),
  soft_problem_solving  NUMERIC(5,2),
  soft_critical_thinking NUMERIC(5,2),
  soft_collaboration    NUMERIC(5,2),
  soft_stress_mgmt      NUMERIC(5,2),
  soft_organization     NUMERIC(5,2),
  soft_learning_speed   NUMERIC(5,2),
  soft_emotional_intel  NUMERIC(5,2),

  -- Métadonnées
  passport_version      SMALLINT    NOT NULL DEFAULT 1,
  passport_id           TEXT        UNIQUE,
  verified              BOOLEAN     NOT NULL DEFAULT false,
  last_assessment       TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (profile_id)
);

-- Trigger updated_at automatique
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_talent_passports_updated_at
  BEFORE UPDATE ON public.talent_passports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── HARD SKILLS ───────────────────────────────────────────────────────────────
CREATE TABLE public.hard_skills (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  passport_id     UUID        NOT NULL REFERENCES public.talent_passports(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  level           SMALLINT    CHECK (level BETWEEN 1 AND 5),
  recency_months  INTEGER,
  validated       BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── OFFRES D'EMPLOI ───────────────────────────────────────────────────────────
CREATE TABLE public.jobs (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  okr_id          UUID        REFERENCES public.okr_company(id) ON DELETE SET NULL,
  title           TEXT        NOT NULL,
  description     TEXT,
  requirements    JSONB,
  soft_thresholds JSONB,
  weights_6d      JSONB,
  status          TEXT        NOT NULL DEFAULT 'open'
                              CHECK (status IN ('draft','open','closed','archived')),
  ias_impact      NUMERIC(5,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── CANDIDATURES ──────────────────────────────────────────────────────────────
CREATE TABLE public.applications (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id          UUID        NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  passport_id     UUID        NOT NULL REFERENCES public.talent_passports(id) ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stage           TEXT        NOT NULL DEFAULT 'new'
                              CHECK (stage IN ('new','screening','interview','assessment','offer','hired','rejected')),
  score_6d        NUMERIC(5,2),
  score_breakdown JSONB,
  score_team_fit  NUMERIC(5,2),
  score_culture   NUMERIC(5,2),
  retention_pred  NUMERIC(5,2),
  ai_insight      TEXT,
  candidate_rating SMALLINT   CHECK (candidate_rating BETWEEN 1 AND 5),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, passport_id)
);

-- ─── ÉVALUATIONS TRIMESTRIELLES ────────────────────────────────────────────────
CREATE TABLE public.quarterly_evaluations (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluator_id     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  quarter          SMALLINT    NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  year             SMALLINT    NOT NULL,
  correlation_score NUMERIC(5,2),
  alerts           JSONB,
  ai_analysis      TEXT,
  departure_risk   NUMERIC(5,2),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, profile_id, evaluator_id, quarter, year)
);

-- ─── ABONNEMENTS ───────────────────────────────────────────────────────────────
CREATE TABLE public.subscriptions (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan            TEXT        NOT NULL CHECK (plan IN ('starter','growth','enterprise')),
  status          TEXT        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','trialing','past_due','canceled')),
  amount_fcfa     INTEGER     NOT NULL,
  currency        TEXT        NOT NULL DEFAULT 'XOF',
  paydunya_token  TEXT,
  next_billing    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── PAIEMENTS ─────────────────────────────────────────────────────────────────
CREATE TABLE public.payments (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID        REFERENCES public.organizations(id) ON DELETE SET NULL,
  amount_fcfa     INTEGER     NOT NULL,
  gateway         TEXT        NOT NULL CHECK (gateway IN ('paydunya','stripe','manual')),
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','completed','failed','refunded')),
  paydunya_token  TEXT,
  stripe_intent   TEXT,
  payment_method  TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── BULLETINS DE PAIE ─────────────────────────────────────────────────────────
CREATE TABLE public.payslips (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month            SMALLINT    NOT NULL CHECK (month BETWEEN 1 AND 12),
  year             SMALLINT    NOT NULL,
  base_salary      INTEGER     NOT NULL,
  bonuses          INTEGER     NOT NULL DEFAULT 0,
  overtime         INTEGER     NOT NULL DEFAULT 0,
  gross_total      INTEGER     NOT NULL,
  retenues         INTEGER,
  irpp             INTEGER,
  charges_patronal INTEGER,
  cout_employeur   INTEGER,
  net_salary       INTEGER     NOT NULL,
  details          JSONB,
  payment_status   TEXT        NOT NULL DEFAULT 'draft'
                               CHECK (payment_status IN ('draft','validated','paid')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, month, year)
);

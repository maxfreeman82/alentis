-- ============================================================
-- TERANGA ALIGN — Sécurité multi-tenant
-- Migration 002 : Row Level Security + set_app_org()
-- ============================================================

-- ─── FONCTION set_app_org() ────────────────────────────────────────────────────
-- Appelée depuis chaque route API avant toute requête Supabase.
-- Stocke l'org_id dans la session PostgreSQL.
CREATE OR REPLACE FUNCTION public.set_app_org(org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_org', org_id::text, true);
END;
$$;

-- ─── ACTIVER RLS SUR TOUTES LES TABLES ────────────────────────────────────────
ALTER TABLE public.organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_assessments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_company          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_pulses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_passports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hard_skills          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quarterly_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips             ENABLE ROW LEVEL SECURITY;

-- ─── HELPER : org courante dans la session ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_org', true), '')::UUID;
$$;

-- ─── POLITIQUES RLS ────────────────────────────────────────────────────────────

-- organizations : accès uniquement à sa propre organisation
CREATE POLICY "org_isolation" ON public.organizations
  USING (id = public.current_org_id());

-- profiles : membres de l'organisation courante
CREATE POLICY "org_isolation" ON public.profiles
  USING (organization_id = public.current_org_id());

-- vision_assessments
CREATE POLICY "org_isolation" ON public.vision_assessments
  USING (organization_id = public.current_org_id());

CREATE POLICY "org_insert" ON public.vision_assessments
  WITH CHECK (organization_id = public.current_org_id());

-- okr_company
CREATE POLICY "org_isolation" ON public.okr_company
  USING (organization_id = public.current_org_id());

CREATE POLICY "org_insert" ON public.okr_company
  WITH CHECK (organization_id = public.current_org_id());

-- vision_pulses
CREATE POLICY "org_isolation" ON public.vision_pulses
  USING (organization_id = public.current_org_id());

CREATE POLICY "org_insert" ON public.vision_pulses
  WITH CHECK (organization_id = public.current_org_id());

-- talent_passports : accès via organization_id
CREATE POLICY "org_isolation" ON public.talent_passports
  USING (organization_id = public.current_org_id());

CREATE POLICY "org_insert" ON public.talent_passports
  WITH CHECK (organization_id = public.current_org_id());

-- hard_skills : accès via passport → organization_id
CREATE POLICY "org_isolation" ON public.hard_skills
  USING (
    EXISTS (
      SELECT 1 FROM public.talent_passports tp
      WHERE tp.id = hard_skills.passport_id
        AND tp.organization_id = public.current_org_id()
    )
  );

-- jobs
CREATE POLICY "org_isolation" ON public.jobs
  USING (organization_id = public.current_org_id());

CREATE POLICY "org_insert" ON public.jobs
  WITH CHECK (organization_id = public.current_org_id());

-- applications
CREATE POLICY "org_isolation" ON public.applications
  USING (organization_id = public.current_org_id());

CREATE POLICY "org_insert" ON public.applications
  WITH CHECK (organization_id = public.current_org_id());

-- quarterly_evaluations
CREATE POLICY "org_isolation" ON public.quarterly_evaluations
  USING (organization_id = public.current_org_id());

CREATE POLICY "org_insert" ON public.quarterly_evaluations
  WITH CHECK (organization_id = public.current_org_id());

-- subscriptions
CREATE POLICY "org_isolation" ON public.subscriptions
  USING (organization_id = public.current_org_id());

-- payments
CREATE POLICY "org_isolation" ON public.payments
  USING (organization_id = public.current_org_id());

-- payslips
CREATE POLICY "org_isolation" ON public.payslips
  USING (organization_id = public.current_org_id());

CREATE POLICY "org_insert" ON public.payslips
  WITH CHECK (organization_id = public.current_org_id());

-- ─── SERVICE ROLE : bypass RLS pour admin ─────────────────────────────────────
-- Le service_role contourne automatiquement RLS.
-- createAdminClient() utilise la service_role key → pas besoin de policies supplémentaires.
-- NOTE : ne jamais exposer la service_role key côté client.

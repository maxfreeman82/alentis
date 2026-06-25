-- ============================================================
-- TERANGA ALIGN — Index de performance
-- Migration 003
-- ============================================================

-- organizations
CREATE INDEX idx_organizations_workos_org_id ON public.organizations(workos_org_id);
CREATE INDEX idx_organizations_plan          ON public.organizations(plan);

-- profiles
CREATE INDEX idx_profiles_workos_user_id    ON public.profiles(workos_user_id);
CREATE INDEX idx_profiles_organization_id   ON public.profiles(organization_id);
CREATE INDEX idx_profiles_role              ON public.profiles(organization_id, role);

-- vision_assessments
CREATE INDEX idx_vision_assessments_org     ON public.vision_assessments(organization_id);
CREATE INDEX idx_vision_assessments_created ON public.vision_assessments(organization_id, created_at DESC);

-- okr_company
CREATE INDEX idx_okr_org_year ON public.okr_company(organization_id, year);

-- vision_pulses
CREATE INDEX idx_vision_pulses_org_qy ON public.vision_pulses(organization_id, year DESC, quarter DESC);

-- talent_passports
CREATE INDEX idx_talent_passports_org      ON public.talent_passports(organization_id);
CREATE INDEX idx_talent_passports_score    ON public.talent_passports(organization_id, score_global DESC);
CREATE INDEX idx_talent_passports_passport ON public.talent_passports(passport_id);

-- hard_skills
CREATE INDEX idx_hard_skills_passport ON public.hard_skills(passport_id);

-- jobs
CREATE INDEX idx_jobs_org_status ON public.jobs(organization_id, status);
CREATE INDEX idx_jobs_okr         ON public.jobs(okr_id) WHERE okr_id IS NOT NULL;

-- applications
CREATE INDEX idx_applications_job      ON public.applications(job_id);
CREATE INDEX idx_applications_passport ON public.applications(passport_id);
CREATE INDEX idx_applications_org      ON public.applications(organization_id, stage);
CREATE INDEX idx_applications_score    ON public.applications(organization_id, score_6d DESC NULLS LAST);

-- quarterly_evaluations
CREATE INDEX idx_qeval_org_profile ON public.quarterly_evaluations(organization_id, profile_id);
CREATE INDEX idx_qeval_org_qy      ON public.quarterly_evaluations(organization_id, year DESC, quarter DESC);
CREATE INDEX idx_qeval_risk        ON public.quarterly_evaluations(organization_id, departure_risk DESC NULLS LAST);

-- payslips
CREATE INDEX idx_payslips_org_ym   ON public.payslips(organization_id, year DESC, month DESC);
CREATE INDEX idx_payslips_profile  ON public.payslips(profile_id, year DESC, month DESC);

-- subscriptions
CREATE INDEX idx_subscriptions_org_status ON public.subscriptions(organization_id, status);

-- payments
CREATE INDEX idx_payments_org ON public.payments(organization_id, created_at DESC);

// Résolution WorkOS user → profil Supabase → organisation
// Utilise le client admin (service_role, bypass RLS) pour la lookup initiale.

import { createAdminClient } from './admin';
import { createServerClient, setOrgContext } from './server';

export interface UserContext {
  profileId:      string;
  organizationId: string;
  role:           string;
  firstName:      string | null;
  lastName:       string | null;
  email:          string;
  orgName:        string;
  orgCertLevel:   number;
  orgIasScore:    number;
  orgArchetype:   string | null;
  orgPlan:        string;
  supabase:       ReturnType<typeof createServerClient>;
}

export interface TalentContext {
  profileId:          string;
  role:               string;
  firstName:          string | null;
  lastName:           string | null;
  email:              string;
  onboardingDone:     boolean;
  supabase:           ReturnType<typeof createServerClient>;
}

// Lookup profil talent sans exiger d'organisation — pour talent_free et l'espace talent
export async function getTalentProfile(workosUserId: string): Promise<TalentContext | null> {
  const admin = createAdminClient();

  const { data: profile, error } = await admin
    .from('profiles')
    .select('id, role, first_name, last_name, email, onboarding_completed, organization_id')
    .eq('workos_user_id', workosUserId)
    .maybeSingle();

  if (error || !profile) return null;

  const supabase = createServerClient();
  if (profile.organization_id) {
    await setOrgContext(supabase, profile.organization_id);
  }

  return {
    profileId:      profile.id,
    role:           profile.role,
    firstName:      profile.first_name,
    lastName:       profile.last_name,
    email:          profile.email,
    onboardingDone: profile.onboarding_completed ?? false,
    supabase,
  };
}

export async function getUserOrg(workosUserId: string): Promise<UserContext | null> {
  const admin = createAdminClient();

  // Lookup profil sans RLS
  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('id, organization_id, role, first_name, last_name, email')
    .eq('workos_user_id', workosUserId)
    .maybeSingle();

  if (profileErr || !profile || !profile.organization_id) return null;

  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .select('name, cert_level, ias_score, archetype, plan')
    .eq('id', profile.organization_id)
    .maybeSingle();

  if (orgErr || !org) return null;

  // Client RLS configuré pour cette org
  const supabase = createServerClient();
  await setOrgContext(supabase, profile.organization_id);

  return {
    profileId:      profile.id,
    organizationId: profile.organization_id,
    role:           profile.role,
    firstName:      profile.first_name,
    lastName:       profile.last_name,
    email:          profile.email,
    orgName:        org.name,
    orgCertLevel:   org.cert_level,
    orgIasScore:    org.ias_score,
    orgArchetype:   org.archetype,
    orgPlan:        org.plan,
    supabase,
  };
}

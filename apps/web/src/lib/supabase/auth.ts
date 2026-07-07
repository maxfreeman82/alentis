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
  profileId:      string;
  role:           string;
  firstName:      string | null;
  lastName:       string | null;
  email:          string;
  onboardingDone: boolean;
  supabase:       ReturnType<typeof createServerClient>;
}

// Lookup profil talent par user_id Supabase Auth (sans organisation requise)
export async function getTalentProfile(userId: string): Promise<TalentContext | null> {
  const admin = createAdminClient();

  const { data: profile, error } = await admin
    .from('profiles')
    .select('id, role, first_name, last_name, email, onboarding_completed, organization_id')
    .eq('user_id', userId)
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

// Lookup profil + organisation par user_id Supabase Auth
export async function getUserOrg(userId: string): Promise<UserContext | null> {
  const admin = createAdminClient();

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('id, organization_id, role, first_name, last_name, email')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileErr || !profile || !profile.organization_id) return null;

  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .select('name, cert_level, ias_score, archetype, plan')
    .eq('id', profile.organization_id)
    .maybeSingle();

  if (orgErr || !org) return null;

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

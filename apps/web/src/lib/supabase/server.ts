import { createClient } from '@supabase/supabase-js';

// Types tables minimaux — complets générés via `pnpm supabase:types` après connexion Supabase CLI.
// Chaque table exige Relationships: [] pour satisfaire GenericTable de @supabase/supabase-js v2.
interface Database {
  public: {
    Tables: {
      organizations: {
        Row:    { id: string; workos_org_id: string; name: string; sector: string | null; size: number | null; country: string; city: string | null; cert_level: number; cert_score: number; ias_score: number; archetype: string | null; plan: string; created_at: string };
        Insert: { id?: string; workos_org_id: string; name: string; sector?: string | null; size?: number | null; country?: string; city?: string | null; cert_level?: number; cert_score?: number; ias_score?: number; archetype?: string | null; plan?: string };
        Update: { name?: string; sector?: string | null; size?: number | null; country?: string; city?: string | null; cert_level?: number; cert_score?: number; ias_score?: number; archetype?: string | null; plan?: string };
        Relationships: [];
      };
      profiles: {
        Row:    { id: string; workos_user_id: string; organization_id: string | null; role: string; first_name: string | null; last_name: string | null; email: string; created_at: string };
        Insert: { id?: string; workos_user_id: string; organization_id?: string | null; role: string; first_name?: string | null; last_name?: string | null; email: string };
        Update: { organization_id?: string | null; role?: string; first_name?: string | null; last_name?: string | null; email?: string };
        Relationships: [];
      };
      vision_assessments: {
        Row:    { id: string; organization_id: string; responses: Record<string, unknown>; archetype: string; divergence_score: number | null; vision_statement: string | null; created_at: string };
        Insert: { id?: string; organization_id: string; responses: Record<string, unknown>; archetype: string; divergence_score?: number | null; vision_statement?: string | null };
        Update: { responses?: Record<string, unknown>; archetype?: string; divergence_score?: number | null; vision_statement?: string | null };
        Relationships: [];
      };
      okr_company: {
        Row:    { id: string; organization_id: string; year: number; title: string; progress: number; on_track: boolean; key_results: unknown | null; created_at: string };
        Insert: { id?: string; organization_id: string; year: number; title: string; progress?: number; on_track?: boolean; key_results?: unknown | null };
        Update: { year?: number; title?: string; progress?: number; on_track?: boolean; key_results?: unknown | null };
        Relationships: [];
      };
      vision_pulses: {
        Row:    { id: string; organization_id: string; quarter: number; year: number; avg_knowledge: number | null; avg_credibility: number | null; avg_connection: number | null; avg_capability: number | null; avg_projection: number | null; participation: number | null; total_employees: number | null; adhesion_score: number | null; created_at: string };
        Insert: { id?: string; organization_id: string; quarter: number; year: number; avg_knowledge?: number | null; avg_credibility?: number | null; avg_connection?: number | null; avg_capability?: number | null; avg_projection?: number | null; participation?: number | null; total_employees?: number | null; adhesion_score?: number | null };
        Update: { avg_knowledge?: number | null; avg_credibility?: number | null; avg_connection?: number | null; avg_capability?: number | null; avg_projection?: number | null; participation?: number | null; total_employees?: number | null; adhesion_score?: number | null };
        Relationships: [];
      };
      talent_passports: {
        Row:    { id: string; profile_id: string; organization_id: string | null; score_global: number | null; score_hard: number | null; score_soft: number | null; score_exp: number | null; score_life: number | null; score_energy: number | null; score_risk: number | null; growth_potential: number | null; transfer_score: number | null; energy_pilotes: number | null; energy_initialiseurs: number | null; energy_accomplisseurs: number | null; energy_dynamiseurs: number | null; energy_regulateurs: number | null; dominant_family: string | null; dominant_profile: string | null; energy_level: string | null; passport_version: number; passport_id: string | null; verified: boolean; last_assessment: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; profile_id: string; organization_id?: string | null; score_global?: number | null; passport_version?: number; passport_id?: string | null; verified?: boolean };
        Update: { score_global?: number | null; score_hard?: number | null; score_soft?: number | null; organization_id?: string | null; verified?: boolean; passport_id?: string | null };
        Relationships: [];
      };
      hard_skills: {
        Row:    { id: string; passport_id: string; name: string; level: number | null; recency_months: number | null; validated: boolean; created_at: string };
        Insert: { id?: string; passport_id: string; name: string; level?: number | null; recency_months?: number | null; validated?: boolean };
        Update: { name?: string; level?: number | null; recency_months?: number | null; validated?: boolean };
        Relationships: [];
      };
      jobs: {
        Row:    { id: string; organization_id: string; okr_id: string | null; title: string; description: string | null; requirements: unknown | null; soft_thresholds: unknown | null; weights_6d: unknown | null; status: string; ias_impact: number | null; created_at: string };
        Insert: { id?: string; organization_id: string; okr_id?: string | null; title: string; description?: string | null; requirements?: unknown | null; soft_thresholds?: unknown | null; weights_6d?: unknown | null; status?: string; ias_impact?: number | null };
        Update: { okr_id?: string | null; title?: string; description?: string | null; requirements?: unknown | null; status?: string; ias_impact?: number | null };
        Relationships: [];
      };
      applications: {
        Row:    { id: string; job_id: string; passport_id: string; organization_id: string; stage: string; score_6d: number | null; score_breakdown: unknown | null; score_team_fit: number | null; score_culture: number | null; retention_pred: number | null; ai_insight: string | null; candidate_rating: number | null; created_at: string };
        Insert: { id?: string; job_id: string; passport_id: string; organization_id: string; stage?: string; score_6d?: number | null; score_breakdown?: unknown | null; ai_insight?: string | null };
        Update: { stage?: string; score_6d?: number | null; score_breakdown?: unknown | null; ai_insight?: string | null; candidate_rating?: number | null };
        Relationships: [];
      };
      quarterly_evaluations: {
        Row:    { id: string; organization_id: string; profile_id: string; evaluator_id: string | null; quarter: number; year: number; correlation_score: number | null; alerts: unknown | null; ai_analysis: string | null; departure_risk: number | null; created_at: string };
        Insert: { id?: string; organization_id: string; profile_id: string; evaluator_id?: string | null; quarter: number; year: number; correlation_score?: number | null; alerts?: unknown | null; ai_analysis?: string | null; departure_risk?: number | null };
        Update: { correlation_score?: number | null; alerts?: unknown | null; ai_analysis?: string | null; departure_risk?: number | null };
        Relationships: [];
      };
      subscriptions: {
        Row:    { id: string; organization_id: string; plan: string; status: string; amount_fcfa: number; currency: string; paydunya_token: string | null; next_billing: string | null; created_at: string };
        Insert: { id?: string; organization_id: string; plan: string; status?: string; amount_fcfa: number; currency?: string; paydunya_token?: string | null; next_billing?: string | null };
        Update: { plan?: string; status?: string; amount_fcfa?: number; paydunya_token?: string | null; next_billing?: string | null };
        Relationships: [];
      };
      payments: {
        Row:    { id: string; organization_id: string | null; amount_fcfa: number; gateway: string; status: string; paydunya_token: string | null; stripe_intent: string | null; payment_method: string | null; metadata: unknown | null; created_at: string };
        Insert: { id?: string; organization_id?: string | null; amount_fcfa: number; gateway: string; status?: string; paydunya_token?: string | null; stripe_intent?: string | null; payment_method?: string | null; metadata?: unknown | null };
        Update: { status?: string; paydunya_token?: string | null; stripe_intent?: string | null; payment_method?: string | null; metadata?: unknown | null };
        Relationships: [];
      };
      payslips: {
        Row:    { id: string; organization_id: string; profile_id: string; month: number; year: number; base_salary: number; bonuses: number; overtime: number; gross_total: number; net_salary: number; payment_status: string; created_at: string };
        Insert: { id?: string; organization_id: string; profile_id: string; month: number; year: number; base_salary: number; bonuses?: number; overtime?: number; gross_total: number; net_salary: number; payment_status?: string };
        Update: { bonuses?: number; overtime?: number; gross_total?: number; net_salary?: number; payment_status?: string; payment_method?: string };
        Relationships: [];
      };
    };
    Views:     Record<string, never>;
    Functions: {
      set_app_org: { Args: { org_id: string }; Returns: void };
    };
    Enums:     Record<string, never>;
  };
}

export type { Database };

export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function setOrgContext(
  client: ReturnType<typeof createServerClient>,
  organizationId: string
) {
  await client.rpc('set_app_org', { org_id: organizationId });
}

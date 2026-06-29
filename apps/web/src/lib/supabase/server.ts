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
        Row:    { id: string; workos_user_id: string; organization_id: string | null; role: string; first_name: string | null; last_name: string | null; email: string; personal_email: string | null; phone: string | null; city: string | null; country: string | null; current_status: string | null; sector: string | null; years_experience: number | null; job_title: string | null; employer_name: string | null; target_roles: unknown | null; target_sectors: unknown | null; salary_min: number | null; location_pref: string | null; mobility_ok: boolean; cv_url: string | null; onboarding_completed: boolean; created_at: string };
        Insert: { id?: string; workos_user_id: string; organization_id?: string | null; role: string; first_name?: string | null; last_name?: string | null; email: string; personal_email?: string | null; phone?: string | null; city?: string | null; country?: string | null; current_status?: string | null; sector?: string | null; years_experience?: number | null; job_title?: string | null; employer_name?: string | null; target_roles?: unknown | null; target_sectors?: unknown | null; salary_min?: number | null; location_pref?: string | null; mobility_ok?: boolean; cv_url?: string | null; onboarding_completed?: boolean };
        Update: { organization_id?: string | null; role?: string; first_name?: string | null; last_name?: string | null; email?: string; personal_email?: string | null; phone?: string | null; city?: string | null; country?: string | null; current_status?: string | null; sector?: string | null; years_experience?: number | null; job_title?: string | null; employer_name?: string | null; target_roles?: unknown | null; target_sectors?: unknown | null; salary_min?: number | null; location_pref?: string | null; mobility_ok?: boolean; onboarding_completed?: boolean };
        Relationships: [];
      };
      onboarding_progress: {
        Row:    { id: string; profile_id: string; step_identity: boolean; step_situation: boolean; step_objectives: boolean; step_energy_skills: boolean; passport_generated: boolean; completed_at: string | null; last_active_step: string | null; updated_at: string };
        Insert: { id?: string; profile_id: string; step_identity?: boolean; step_situation?: boolean; step_objectives?: boolean; step_energy_skills?: boolean; passport_generated?: boolean; completed_at?: string | null; last_active_step?: string | null; updated_at?: string };
        Update: { step_identity?: boolean; step_situation?: boolean; step_objectives?: boolean; step_energy_skills?: boolean; passport_generated?: boolean; completed_at?: string | null; last_active_step?: string | null; updated_at?: string };
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
        Row:    { id: string; organization_id: string; quarter: number; year: number; avg_knowledge: number | null; avg_credibility: number | null; avg_connection: number | null; avg_capability: number | null; avg_projection: number | null; participation: number | null; total_employees: number | null; adhesion_score: number | null; updated_at: string | null; created_at: string };
        Insert: { id?: string; organization_id: string; quarter: number; year: number; avg_knowledge?: number | null; avg_credibility?: number | null; avg_connection?: number | null; avg_capability?: number | null; avg_projection?: number | null; participation?: number | null; total_employees?: number | null; adhesion_score?: number | null; updated_at?: string | null };
        Update: { avg_knowledge?: number | null; avg_credibility?: number | null; avg_connection?: number | null; avg_capability?: number | null; avg_projection?: number | null; participation?: number | null; total_employees?: number | null; adhesion_score?: number | null; updated_at?: string | null };
        Relationships: [];
      };
      vision_pulse_responses: {
        Row:    { id: string; organization_id: string; profile_id: string; quarter: number; year: number; responses: unknown | null; dim_knowledge: number | null; dim_credibility: number | null; dim_connection: number | null; dim_capability: number | null; dim_projection: number | null; adhesion_score: number | null; submitted_at: string | null; created_at: string };
        Insert: { id?: string; organization_id: string; profile_id: string; quarter: number; year: number; responses?: unknown | null; dim_knowledge?: number | null; dim_credibility?: number | null; dim_connection?: number | null; dim_capability?: number | null; dim_projection?: number | null; adhesion_score?: number | null; submitted_at?: string | null };
        Update: { responses?: unknown | null; dim_knowledge?: number | null; dim_credibility?: number | null; dim_connection?: number | null; dim_capability?: number | null; dim_projection?: number | null; adhesion_score?: number | null; submitted_at?: string | null };
        Relationships: [];
      };
      talent_passports: {
        Row:    { id: string; profile_id: string; organization_id: string | null; score_global: number | null; score_hard: number | null; score_soft: number | null; score_exp: number | null; score_life: number | null; score_energy: number | null; score_risk: number | null; growth_potential: number | null; transfer_score: number | null; energy_pilotes: number | null; energy_initialiseurs: number | null; energy_accomplisseurs: number | null; energy_dynamiseurs: number | null; energy_regulateurs: number | null; dominant_family: string | null; dominant_profile: string | null; energy_level: string | null; passport_version: number; passport_id: string | null; verified: boolean; last_assessment: string | null; soft_communication: number | null; soft_leadership: number | null; soft_adaptability: number | null; soft_problem_solving: number | null; soft_critical_thinking: number | null; soft_collaboration: number | null; soft_stress_mgmt: number | null; soft_organization: number | null; soft_learning_speed: number | null; soft_emotional_intel: number | null; created_at: string; updated_at: string };
        Insert: {
          id?: string; profile_id: string; organization_id?: string | null;
          score_global?: number | null; score_hard?: number | null; score_soft?: number | null;
          score_exp?: number | null; score_life?: number | null; score_energy?: number | null;
          score_risk?: number | null; growth_potential?: number | null; transfer_score?: number | null;
          energy_pilotes?: number | null; energy_initialiseurs?: number | null; energy_accomplisseurs?: number | null;
          energy_dynamiseurs?: number | null; energy_regulateurs?: number | null;
          dominant_family?: string | null; dominant_profile?: string | null; energy_level?: string | null;
          soft_communication?: number | null; soft_leadership?: number | null; soft_adaptability?: number | null;
          soft_problem_solving?: number | null; soft_critical_thinking?: number | null;
          soft_collaboration?: number | null; soft_stress_mgmt?: number | null;
          soft_organization?: number | null; soft_learning_speed?: number | null;
          soft_emotional_intel?: number | null;
          passport_version?: number; passport_id?: string | null; verified?: boolean;
          last_assessment?: string | null;
        };
        Update: { score_global?: number | null; score_hard?: number | null; score_soft?: number | null; score_exp?: number | null; score_life?: number | null; score_energy?: number | null; organization_id?: string | null; verified?: boolean; passport_id?: string | null; updated_at?: string; soft_communication?: number | null; soft_leadership?: number | null; soft_adaptability?: number | null; soft_problem_solving?: number | null; soft_critical_thinking?: number | null; soft_collaboration?: number | null; soft_stress_mgmt?: number | null; soft_organization?: number | null; soft_learning_speed?: number | null; soft_emotional_intel?: number | null };
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
        Update: { okr_id?: string | null; title?: string; description?: string | null; requirements?: unknown | null; soft_thresholds?: unknown | null; weights_6d?: unknown | null; status?: string; ias_impact?: number | null };
        Relationships: [];
      };
      applications: {
        Row:    { id: string; job_id: string; passport_id: string; organization_id: string; stage: string; score_6d: number | null; score_breakdown: unknown | null; score_team_fit: number | null; score_culture: number | null; retention_pred: number | null; ai_insight: string | null; candidate_rating: number | null; updated_at: string | null; created_at: string };
        Insert: { id?: string; job_id: string; passport_id: string; organization_id: string; stage?: string; score_6d?: number | null; score_breakdown?: unknown | null; ai_insight?: string | null; updated_at?: string | null };
        Update: { stage?: string; score_6d?: number | null; score_breakdown?: unknown | null; ai_insight?: string | null; candidate_rating?: number | null; updated_at?: string | null };
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
      wellbeing_surveys: {
        Row:    { id: string; organization_id: string; profile_id: string; month: number; year: number; score_global: number | null; score_stress: number | null; score_balance: number | null; score_relations: number | null; score_meaning: number | null; score_autonomy: number | null; burnout_risk: number | null; responses: unknown | null; created_at: string };
        Insert: { id?: string; organization_id: string; profile_id: string; month: number; year: number; score_global?: number | null; score_stress?: number | null; score_balance?: number | null; score_relations?: number | null; score_meaning?: number | null; score_autonomy?: number | null; burnout_risk?: number | null; responses?: unknown | null };
        Update: { score_global?: number | null; score_stress?: number | null; score_balance?: number | null; score_relations?: number | null; score_meaning?: number | null; score_autonomy?: number | null; burnout_risk?: number | null; responses?: unknown | null };
        Relationships: [];
      };
      trainings: {
        Row:    { id: string; organization_id: string; title: string; description: string | null; category: string | null; format: string | null; duration_hours: number | null; instructor: string | null; max_participants: number | null; start_date: string | null; end_date: string | null; status: string; created_at: string };
        Insert: { id?: string; organization_id: string; title: string; description?: string | null; category?: string | null; format?: string | null; duration_hours?: number | null; instructor?: string | null; max_participants?: number | null; start_date?: string | null; end_date?: string | null; status?: string };
        Update: { title?: string; description?: string | null; category?: string | null; format?: string | null; duration_hours?: number | null; instructor?: string | null; max_participants?: number | null; start_date?: string | null; end_date?: string | null; status?: string };
        Relationships: [];
      };
      training_enrollments: {
        Row:    { id: string; training_id: string; profile_id: string; organization_id: string; status: string; progress: number; score: number | null; completed_at: string | null; created_at: string };
        Insert: { id?: string; training_id: string; profile_id: string; organization_id: string; status?: string; progress?: number; score?: number | null; completed_at?: string | null };
        Update: { status?: string; progress?: number; score?: number | null; completed_at?: string | null };
        Relationships: [];
      };
      leave_requests: {
        Row:    { id: string; organization_id: string; profile_id: string; type: string; start_date: string; end_date: string; days: number; status: string; reason: string | null; approved_by: string | null; created_at: string };
        Insert: { id?: string; organization_id: string; profile_id: string; type: string; start_date: string; end_date: string; days: number; status?: string; reason?: string | null; approved_by?: string | null };
        Update: { status?: string; approved_by?: string | null; reason?: string | null };
        Relationships: [];
      };
      hr_documents: {
        Row:    { id: string; organization_id: string; profile_id: string | null; type: string; title: string; url: string | null; expiry_date: string | null; status: string; created_at: string };
        Insert: { id?: string; organization_id: string; profile_id?: string | null; type: string; title: string; url?: string | null; expiry_date?: string | null; status?: string };
        Update: { title?: string; url?: string | null; expiry_date?: string | null; status?: string };
        Relationships: [];
      };
      messages: {
        Row:    { id: string; organization_id: string; author_id: string | null; recipient_id: string | null; content: string; read_at: string | null; created_at: string };
        Insert: { id?: string; organization_id: string; author_id?: string | null; recipient_id?: string | null; content: string; read_at?: string | null };
        Update: { read_at?: string | null };
        Relationships: [];
      };
      calendar_events: {
        Row:    { id: string; organization_id: string; created_by: string | null; title: string; description: string | null; event_type: string; start_date: string; end_date: string | null; all_day: boolean; color: string | null; created_at: string };
        Insert: { id?: string; organization_id: string; created_by?: string | null; title: string; description?: string | null; event_type?: string; start_date: string; end_date?: string | null; all_day?: boolean; color?: string | null };
        Update: { title?: string; description?: string | null; event_type?: string; start_date?: string; end_date?: string | null; color?: string | null };
        Relationships: [];
      };
      dei_profiles: {
        Row:    { id: string; organization_id: string; profile_id: string; gender: string | null; age_range: string | null; nationality: string | null; department: string | null; salary_band: string | null; is_manager: boolean; disability: boolean; created_at: string };
        Insert: { id?: string; organization_id: string; profile_id: string; gender?: string | null; age_range?: string | null; nationality?: string | null; department?: string | null; salary_band?: string | null; is_manager?: boolean; disability?: boolean };
        Update: { gender?: string | null; age_range?: string | null; nationality?: string | null; department?: string | null; salary_band?: string | null; is_manager?: boolean; disability?: boolean };
        Relationships: [];
      };
      compliance_items: {
        Row:    { id: string; organization_id: string; category: string; title: string; description: string | null; frequency: string | null; due_date: string | null; last_completed: string | null; status: string; responsible_id: string | null; notes: string | null; created_at: string };
        Insert: { id?: string; organization_id: string; category: string; title: string; description?: string | null; frequency?: string | null; due_date?: string | null; last_completed?: string | null; status?: string; responsible_id?: string | null; notes?: string | null };
        Update: { category?: string; title?: string; description?: string | null; frequency?: string | null; due_date?: string | null; last_completed?: string | null; status?: string; responsible_id?: string | null; notes?: string | null };
        Relationships: [];
      };
      workspace_announcements: {
        Row:    { id: string; organization_id: string; author_id: string | null; title: string; content: string; priority: string; pinned: boolean; created_at: string };
        Insert: { id?: string; organization_id: string; author_id?: string | null; title: string; content: string; priority?: string; pinned?: boolean };
        Update: { title?: string; content?: string; priority?: string; pinned?: boolean };
        Relationships: [];
      };
      workspace_links: {
        Row:    { id: string; organization_id: string; title: string; url: string; category: string | null; icon: string | null; created_at: string };
        Insert: { id?: string; organization_id: string; title: string; url: string; category?: string | null; icon?: string | null };
        Update: { title?: string; url?: string; category?: string | null; icon?: string | null };
        Relationships: [];
      };
      community_posts: {
        Row:    { id: string; author_id: string | null; content: string; post_type: string; tags: string[]; likes_count: number; comments_count: number; is_pinned: boolean; created_at: string };
        Insert: { id?: string; author_id?: string | null; content: string; post_type?: string; tags?: string[]; likes_count?: number; comments_count?: number; is_pinned?: boolean };
        Update: { content?: string; tags?: string[]; is_pinned?: boolean; likes_count?: number; comments_count?: number };
        Relationships: [];
      };
      community_post_likes: {
        Row:    { post_id: string; profile_id: string; created_at: string };
        Insert: { post_id: string; profile_id: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      community_comments: {
        Row:    { id: string; post_id: string; author_id: string | null; content: string; created_at: string };
        Insert: { id?: string; post_id: string; author_id?: string | null; content: string };
        Update: { content?: string };
        Relationships: [];
      };
      community_events: {
        Row:    { id: string; created_by: string | null; title: string; description: string | null; event_type: string; location: string | null; meeting_url: string | null; start_at: string; end_at: string | null; max_attendees: number | null; attendees_count: number; tags: string[]; is_free: boolean; price_fcfa: number | null; created_at: string };
        Insert: { id?: string; created_by?: string | null; title: string; description?: string | null; event_type?: string; location?: string | null; meeting_url?: string | null; start_at: string; end_at?: string | null; max_attendees?: number | null; tags?: string[]; is_free?: boolean; price_fcfa?: number | null };
        Update: { title?: string; description?: string | null; location?: string | null; start_at?: string; end_at?: string | null; max_attendees?: number | null; is_free?: boolean; price_fcfa?: number | null };
        Relationships: [];
      };
      community_event_registrations: {
        Row:    { event_id: string; profile_id: string; status: string; created_at: string };
        Insert: { event_id: string; profile_id: string; status?: string };
        Update: { status?: string };
        Relationships: [];
      };
      mentoring_profiles: {
        Row:    { id: string; profile_id: string; mentor_type: string; expertise_areas: string[]; bio: string | null; available_hours: number | null; languages: string[]; is_active: boolean; sessions_count: number; rating: number | null; created_at: string };
        Insert: { id?: string; profile_id: string; mentor_type?: string; expertise_areas?: string[]; bio?: string | null; available_hours?: number | null; languages?: string[]; is_active?: boolean };
        Update: { mentor_type?: string; expertise_areas?: string[]; bio?: string | null; available_hours?: number | null; languages?: string[]; is_active?: boolean; rating?: number | null; sessions_count?: number };
        Relationships: [];
      };
      mentoring_sessions: {
        Row:    { id: string; mentor_id: string; mentee_id: string; status: string; topic: string; scheduled_at: string | null; duration_min: number | null; notes: string | null; mentee_rating: number | null; created_at: string };
        Insert: { id?: string; mentor_id: string; mentee_id: string; status?: string; topic: string; scheduled_at?: string | null; duration_min?: number | null };
        Update: { status?: string; scheduled_at?: string | null; notes?: string | null; mentee_rating?: number | null };
        Relationships: [];
      };
      marketplace_listings: {
        Row:    { id: string; author_id: string | null; title: string; description: string | null; category: string; price_fcfa: number | null; price_type: string; delivery_days: number | null; skills: string[]; is_active: boolean; views_count: number; created_at: string };
        Insert: { id?: string; author_id?: string | null; title: string; description?: string | null; category?: string; price_fcfa?: number | null; price_type?: string; delivery_days?: number | null; skills?: string[]; is_active?: boolean };
        Update: { title?: string; description?: string | null; category?: string; price_fcfa?: number | null; price_type?: string; delivery_days?: number | null; skills?: string[]; is_active?: boolean };
        Relationships: [];
      };
      forum_categories: {
        Row:    { id: string; name: string; description: string | null; icon: string | null; color: string | null; slug: string; posts_count: number; sort_order: number | null };
        Insert: { id?: string; name: string; description?: string | null; icon?: string | null; color?: string | null; slug: string; sort_order?: number | null };
        Update: { name?: string; description?: string | null; icon?: string | null; color?: string | null; posts_count?: number };
        Relationships: [];
      };
      forum_posts: {
        Row:    { id: string; category_id: string; author_id: string | null; title: string; content: string; is_pinned: boolean; is_solved: boolean; replies_count: number; views_count: number; last_reply_at: string | null; tags: string[]; created_at: string };
        Insert: { id?: string; category_id: string; author_id?: string | null; title: string; content: string; tags?: string[] };
        Update: { title?: string; content?: string; is_pinned?: boolean; is_solved?: boolean; replies_count?: number; views_count?: number; last_reply_at?: string | null };
        Relationships: [];
      };
      forum_replies: {
        Row:    { id: string; post_id: string; author_id: string | null; content: string; is_accepted: boolean; created_at: string };
        Insert: { id?: string; post_id: string; author_id?: string | null; content: string };
        Update: { content?: string; is_accepted?: boolean };
        Relationships: [];
      };
      job_offers: {
        Row:    { id: string; organization_id: string | null; title: string; company_name: string; description: string | null; location: string | null; contract_type: string | null; required_family: string; min_score_global: number; min_score_hard: number; min_score_soft: number; salary_min: number | null; salary_max: number | null; is_active: boolean; is_premium: boolean; created_at: string; expires_at: string | null };
        Insert: { id?: string; organization_id?: string | null; title: string; company_name: string; description?: string | null; location?: string | null; contract_type?: string | null; required_family?: string; min_score_global?: number; min_score_hard?: number; min_score_soft?: number; salary_min?: number | null; salary_max?: number | null; is_active?: boolean; is_premium?: boolean; expires_at?: string | null };
        Update: { title?: string; company_name?: string; description?: string | null; location?: string | null; contract_type?: string | null; required_family?: string; min_score_global?: number; min_score_hard?: number; min_score_soft?: number; salary_min?: number | null; salary_max?: number | null; is_active?: boolean; is_premium?: boolean; expires_at?: string | null };
        Relationships: [];
      };
      payroll_settings: {
        Row:    { id: string; organization_id: string; profile_id: string; salaire_brut: number; situation: string; enfants: number; sector_risk: string; primes_mensuelles: number; avantages_nature: number; retenue_prevoyance: number; est_cadre: boolean; date_embauche: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; organization_id: string; profile_id: string; salaire_brut?: number; situation?: string; enfants?: number; sector_risk?: string; primes_mensuelles?: number; avantages_nature?: number; retenue_prevoyance?: number; est_cadre?: boolean; date_embauche?: string | null; updated_at?: string };
        Update: { salaire_brut?: number; situation?: string; enfants?: number; sector_risk?: string; primes_mensuelles?: number; avantages_nature?: number; retenue_prevoyance?: number; est_cadre?: boolean; date_embauche?: string | null; updated_at?: string };
        Relationships: [];
      };
      founders: {
        Row:    { id: string; profile_id: string; stage: string | null; archetype: string | null; archetype_scores: unknown | null; boussole_done: boolean; company_name: string | null; business_plan: unknown | null; financial_model: unknown | null; bizplan_done: boolean; legal_structure: string | null; rccm_number: string | null; ninea_number: string | null; creation_done: boolean; confidence: number | null; vision_statement: string | null; migrated_to_paid: boolean; first_hire_done: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; profile_id: string; stage?: string | null; archetype?: string | null; archetype_scores?: unknown | null; boussole_done?: boolean; company_name?: string | null; business_plan?: unknown | null; financial_model?: unknown | null; bizplan_done?: boolean; legal_structure?: string | null; rccm_number?: string | null; ninea_number?: string | null; creation_done?: boolean; confidence?: number | null; vision_statement?: string | null; migrated_to_paid?: boolean; first_hire_done?: boolean; founder_responses?: unknown | null };
        Update: { archetype?: string | null; archetype_scores?: unknown | null; boussole_done?: boolean; company_name?: string | null; business_plan?: unknown | null; financial_model?: unknown | null; bizplan_done?: boolean; legal_structure?: string | null; rccm_number?: string | null; ninea_number?: string | null; creation_done?: boolean; confidence?: number | null; vision_statement?: string | null; migrated_to_paid?: boolean; first_hire_done?: boolean; stage?: string | null; updated_at?: string };
        Relationships: [];
      };
      founder_contracts: {
        Row:    { id: string; founder_id: string | null; profile_id: string; employee_name: string; employee_role: string | null; contract_type: string; start_date: string; end_date: string | null; gross_salary: number; trial_months: number; is_cadre: boolean; signed: boolean; signed_at: string | null; created_at: string };
        Insert: { id?: string; founder_id?: string | null; profile_id: string; employee_name: string; employee_role?: string | null; contract_type?: string; start_date: string; end_date?: string | null; gross_salary: number; trial_months?: number; is_cadre?: boolean; signed?: boolean; signed_at?: string | null };
        Update: { employee_name?: string; employee_role?: string | null; contract_type?: string; start_date?: string; end_date?: string | null; gross_salary?: number; trial_months?: number; is_cadre?: boolean; signed?: boolean; signed_at?: string | null };
        Relationships: [];
      };
      employer_cost_simulations: {
        Row:    { id: string; founder_id: string | null; profile_id: string; gross_salary: number; country: string; is_cadre: boolean; accident_rate: number; has_13th_month: boolean; ipres_rg_employee: number | null; ir_employee: number | null; trimf_employee: number | null; net_salary: number | null; ipres_rg_employer: number | null; ipres_rc_employer: number | null; css_employer: number | null; fdfp_employer: number | null; total_cost: number | null; total_cost_annual: number | null; created_at: string };
        Insert: { id?: string; founder_id?: string | null; profile_id: string; gross_salary: number; country?: string; is_cadre?: boolean; accident_rate?: number; has_13th_month?: boolean; ipres_rg_employee?: number | null; ir_employee?: number | null; trimf_employee?: number | null; net_salary?: number | null; ipres_rg_employer?: number | null; ipres_rc_employer?: number | null; css_employer?: number | null; fdfp_employer?: number | null; total_cost?: number | null; total_cost_annual?: number | null };
        Update: { gross_salary?: number; net_salary?: number | null; total_cost?: number | null; total_cost_annual?: number | null };
        Relationships: [];
      };
      tdt_observations: {
        Row:    { id: string; session_id: string; organization_id: string; observer_id: string; observed_id: string; submitted_at: string | null; is_flagged_outlier: boolean | null; created_at: string };
        Insert: { id?: string; session_id: string; organization_id: string; observer_id: string; observed_id: string; submitted_at?: string | null; is_flagged_outlier?: boolean | null; is_flagged_halo?: boolean | null; f1?: number | null; f2?: number | null; f3?: number | null; c1?: number | null; c2?: number | null; c3?: number | null; k1?: number | null; k2?: number | null; k3?: number | null; i1?: number | null; i2?: number | null; i3?: number | null; a1?: number | null; a2?: number | null; a3?: number | null; p1?: number | null; p2?: number | null; p3?: number | null; b1?: number | null; b2?: number | null; b3?: number | null };
        Update: { submitted_at?: string | null; is_flagged_outlier?: boolean | null };
        Relationships: [];
      };
      tdt_aggregates: {
        Row:    { id: string; session_id: string; organization_id: string; observed_id: string; score_global_observed: number | null; score_fiabilite: number | null; score_collaboration: number | null; score_communication: number | null; score_initiative: number | null; score_adaptabilite: number | null; score_impact: number | null; score_bien_etre: number | null; observer_count: number; has_outlier_flag: boolean; has_big_drop_flag: boolean; has_participation_flag: boolean; delta_vs_previous: number | null; passport_updated: boolean; passport_updated_at: string | null; safety_checks: unknown | null; computed_at: string };
        Insert: { id?: string; session_id: string; organization_id: string; observed_id: string; score_global_observed?: number | null; score_fiabilite?: number | null; score_collaboration?: number | null; score_communication?: number | null; score_initiative?: number | null; score_adaptabilite?: number | null; score_impact?: number | null; score_bien_etre?: number | null; observer_count?: number; has_outlier_flag?: boolean; has_big_drop_flag?: boolean; delta_vs_previous?: number | null };
        Update: { score_global_observed?: number | null; has_outlier_flag?: boolean; has_big_drop_flag?: boolean; has_participation_flag?: boolean; delta_vs_previous?: number | null; passport_updated?: boolean; passport_updated_at?: string | null; safety_checks?: unknown | null };
        Relationships: [];
      };
      tdt_sessions: {
        Row:    { id: string; organization_id: string; quarter: number; year: number; status: string; participant_ids: string[]; observer_id: string | null; participation_threshold: number; min_observers: number; launched_at: string | null; consolidated_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; organization_id: string; quarter: number; year: number; status?: string; participant_ids?: string[]; observer_id?: string | null; participation_threshold?: number; min_observers?: number; created_by?: string | null };
        Update: { status?: string; participant_ids?: string[]; observer_id?: string | null; participation_threshold?: number; min_observers?: number; launched_at?: string | null; closed_at?: string | null; consolidated_at?: string | null; updated_at?: string };
        Relationships: [];
      };
      tdt_feedbacks: {
        Row:    { id: string; session_id: string; organization_id: string; observed_id: string; score_global_observed: number | null; score_fiabilite: number | null; score_collaboration: number | null; score_communication: number | null; score_initiative: number | null; score_adaptabilite: number | null; has_outlier_flag: boolean; status: string; created_at: string; updated_at: string };
        Insert: { id?: string; session_id: string; organization_id: string; observed_id: string; score_global_observed?: number | null; score_fiabilite?: number | null; score_collaboration?: number | null; score_communication?: number | null; score_initiative?: number | null; score_adaptabilite?: number | null; has_outlier_flag?: boolean; status?: string };
        Update: { score_global_observed?: number | null; score_fiabilite?: number | null; score_collaboration?: number | null; score_communication?: number | null; score_initiative?: number | null; score_adaptabilite?: number | null; has_outlier_flag?: boolean; status?: string; updated_at?: string };
        Relationships: [];
      };
      payslips: {
        Row: {
          id: string; organization_id: string; profile_id: string; month: number; year: number;
          base_salary: number; bonuses: number; overtime: number; gross_total: number; net_salary: number;
          retenues: number | null; irpp: number | null; charges_patronal: number | null;
          cout_employeur: number | null; details: unknown | null; payment_status: string; created_at: string;
        };
        Insert: {
          id?: string; organization_id: string; profile_id: string; month: number; year: number;
          base_salary: number; bonuses?: number; overtime?: number; gross_total: number; net_salary: number;
          retenues?: number | null; irpp?: number | null; charges_patronal?: number | null;
          cout_employeur?: number | null; details?: unknown | null; payment_status?: string;
        };
        Update: {
          bonuses?: number; overtime?: number; gross_total?: number; net_salary?: number;
          retenues?: number | null; irpp?: number | null; payment_status?: string;
        };
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

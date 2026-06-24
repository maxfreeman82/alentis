import type { Role } from './roles';

export type Archetype =
  | 'CONQUERANTE'
  | 'INNOVATRICE'
  | 'CONSOLIDATRICE'
  | 'TRANSFORMATRICE'
  | 'PERENNE';

export type CertLevel = 1 | 2 | 3 | 4;

export type Plan = 'starter' | 'business' | 'enterprise';

export type ApplicationStage =
  | 'new'
  | 'screening'
  | 'interview'
  | 'assessment'
  | 'offer'
  | 'hired'
  | 'rejected';

export type PaymentGateway = 'paydunya' | 'stripe';

export type PaymentMethod = 'orange_money' | 'wave' | 'free_money' | 'card' | 'virement';

export type EnergyLevel = 'C1' | 'C2' | 'C3' | 'C4' | 'C5';

export interface Organization {
  id: string;
  workos_org_id: string;
  name: string;
  sector?: string;
  size?: number;
  country: string;
  city?: string;
  cert_level: CertLevel;
  cert_score: number;
  ias_score: number;
  archetype?: Archetype;
  plan: Plan;
  created_at: string;
}

export interface Profile {
  id: string;
  workos_user_id: string;
  organization_id?: string;
  role: Role;
  first_name?: string;
  last_name?: string;
  email: string;
  created_at: string;
}

export interface TalentPassport {
  id: string;
  profile_id: string;
  organization_id?: string;
  score_global?: number;
  score_hard?: number;
  score_soft?: number;
  score_exp?: number;
  score_life?: number;
  score_energy?: number;
  score_risk?: number;
  growth_potential?: number;
  transfer_score?: number;
  energy_pilotes?: number;
  energy_initialiseurs?: number;
  energy_accomplisseurs?: number;
  energy_dynamiseurs?: number;
  energy_regulateurs?: number;
  dominant_family?: string;
  dominant_profile?: string;
  energy_level?: EnergyLevel;
  soft_communication?: number;
  soft_leadership?: number;
  soft_adaptability?: number;
  soft_problem_solving?: number;
  soft_critical_thinking?: number;
  soft_collaboration?: number;
  soft_stress_mgmt?: number;
  soft_organization?: number;
  soft_learning_speed?: number;
  soft_emotional_intel?: number;
  passport_version: number;
  passport_id?: string;
  verified: boolean;
  last_assessment?: string;
  created_at: string;
  updated_at: string;
}

export interface HardSkill {
  id: string;
  passport_id: string;
  name: string;
  level: number;
  recency_months?: number;
  validated: boolean;
  created_at: string;
}

export interface Job {
  id: string;
  organization_id: string;
  okr_id?: string;
  title: string;
  description?: string;
  requirements?: Record<string, unknown>;
  soft_thresholds?: Record<string, number>;
  weights_6d?: Partial<Record<'H' | 'S' | 'X' | 'L' | 'E' | 'R', number>>;
  status: 'draft' | 'active' | 'closed';
  ias_impact?: number;
  created_at: string;
}

export interface OKRCompany {
  id: string;
  organization_id: string;
  year: number;
  title: string;
  progress: number;
  on_track: boolean;
  key_results?: Array<{ title: string; progress: number; target: number }>;
  created_at: string;
}

export interface VisionAssessment {
  id: string;
  organization_id: string;
  responses: Record<string, unknown>;
  archetype: Archetype;
  divergence_score?: number;
  vision_statement?: string;
  created_at: string;
}

export interface VisionPulse {
  id: string;
  organization_id: string;
  quarter: number;
  year: number;
  avg_knowledge?: number;
  avg_credibility?: number;
  avg_connection?: number;
  avg_capability?: number;
  avg_projection?: number;
  participation?: number;
  total_employees?: number;
  adhesion_score?: number;
  created_at: string;
}

export interface Payslip {
  id: string;
  organization_id: string;
  profile_id: string;
  month: number;
  year: number;
  base_salary: number;
  bonuses: number;
  overtime: number;
  gross_total: number;
  ipres_rg?: number;
  ipres_rc?: number;
  css?: number;
  ir?: number;
  trimf?: number;
  net_salary: number;
  convention?: string;
  pdf_url?: string;
  payment_status: 'pending' | 'paid' | 'failed';
  payment_method?: PaymentMethod;
  created_at: string;
}

-- ============================================================
-- TERANGA ALIGN — Données de seed pour développement
-- À exécuter APRÈS les migrations 001, 002, 003
-- ATTENTION : ne jamais exécuter en production
-- ============================================================

-- Organisation de démonstration
INSERT INTO public.organizations (
  id, workos_org_id, name, sector, size, country, city,
  cert_level, cert_score, ias_score, archetype, plan
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'org_seed_teranga_demo',
  'Teranga Corp',
  'Fintech',
  45,
  'SN',
  'Dakar',
  3,
  78.5,
  74.0,
  'INNOVATRICE',
  'growth'
) ON CONFLICT (workos_org_id) DO NOTHING;

-- Profils de démonstration
INSERT INTO public.profiles (id, workos_user_id, organization_id, role, first_name, last_name, email) VALUES
  ('10000000-0000-0000-0000-000000000001', 'user_seed_fatou',    '00000000-0000-0000-0000-000000000001', 'org_admin',    'Fatou',    'Ndiaye',   'fatou.ndiaye@teranga-corp.sn'),
  ('10000000-0000-0000-0000-000000000002', 'user_seed_ibrahima', '00000000-0000-0000-0000-000000000001', 'org_manager',  'Ibrahima', 'Fall',     'ibrahima.fall@teranga-corp.sn'),
  ('10000000-0000-0000-0000-000000000003', 'user_seed_aminata',  '00000000-0000-0000-0000-000000000001', 'org_employee', 'Aminata',  'Diallo',   'aminata.diallo@teranga-corp.sn'),
  ('10000000-0000-0000-0000-000000000004', 'user_seed_cheikh',   '00000000-0000-0000-0000-000000000001', 'org_employee', 'Cheikh',   'Mbaye',    'cheikh.mbaye@teranga-corp.sn'),
  ('10000000-0000-0000-0000-000000000005', 'user_seed_rokhaya',  '00000000-0000-0000-0000-000000000001', 'org_hr',       'Rokhaya',  'Sow',      'rokhaya.sow@teranga-corp.sn')
ON CONFLICT (workos_user_id) DO NOTHING;

-- OKRs entreprise 2026
INSERT INTO public.okr_company (id, organization_id, year, title, progress, on_track, key_results) VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    2026,
    'Doubler le GMV de la plateforme',
    68,
    true,
    '[
      {"title": "GMV Q1", "target": 500000000, "current": 320000000, "unit": "FCFA"},
      {"title": "Marchands actifs", "target": 500, "current": 312, "unit": ""},
      {"title": "Taux rétention", "target": 85, "current": 79, "unit": "%"}
    ]'::jsonb
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    2026,
    'Atteindre 95% d''adhésion employés à la vision',
    74,
    true,
    '[
      {"title": "Score adhésion Q2", "target": 95, "current": 74, "unit": "/100"},
      {"title": "Formations vision complétées", "target": 45, "current": 32, "unit": ""},
      {"title": "Managers certifiés Teranga", "target": 8, "current": 5, "unit": ""}
    ]'::jsonb
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    2026,
    'Lancer l''expansion Côte d''Ivoire',
    42,
    false,
    '[
      {"title": "Partenaires CI signés", "target": 10, "current": 3, "unit": ""},
      {"title": "Équipe CI constituée", "target": 6, "current": 2, "unit": "personnes"},
      {"title": "Revenus CI T3", "target": 50000000, "current": 0, "unit": "FCFA"}
    ]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- Vision Pulse Q1 2026
INSERT INTO public.vision_pulses (
  organization_id, quarter, year,
  avg_knowledge, avg_credibility, avg_connection, avg_capability, avg_projection,
  participation, total_employees, adhesion_score
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  1, 2026,
  72, 68, 80, 65, 74,
  38, 45, 71.8
) ON CONFLICT (organization_id, quarter, year) DO NOTHING;

-- Vision Pulse Q2 2026
INSERT INTO public.vision_pulses (
  organization_id, quarter, year,
  avg_knowledge, avg_credibility, avg_connection, avg_capability, avg_projection,
  participation, total_employees, adhesion_score
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  2, 2026,
  76, 71, 84, 68, 78,
  41, 45, 75.4
) ON CONFLICT (organization_id, quarter, year) DO NOTHING;

-- Talent Passports
INSERT INTO public.talent_passports (
  id, profile_id, organization_id,
  score_global, score_hard, score_soft, score_exp, score_life, score_energy, score_risk,
  energy_pilotes, energy_initialiseurs, energy_accomplisseurs, energy_dynamiseurs, energy_regulateurs,
  dominant_family, energy_level,
  soft_communication, soft_leadership, soft_adaptability, soft_problem_solving,
  soft_critical_thinking, soft_collaboration, soft_stress_mgmt, soft_organization,
  soft_learning_speed, soft_emotional_intel,
  passport_id, verified, last_assessment
) VALUES
  (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    91, 82, 90, 78, 70, 91, 18,
    18, 22, 28, 16, 16,
    'accomplisseurs', 'C5',
    92, 85, 88, 84, 78, 95, 82, 79, 88, 90,
    'TP-SN-001', true, now()
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    87, 80, 85, 88, 72, 85, 22,
    28, 18, 22, 16, 16,
    'pilotes', 'C4',
    82, 88, 80, 82, 76, 84, 78, 80, 82, 80,
    'TP-SN-002', true, now()
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    71, 72, 74, 68, 65, 71, 35,
    16, 28, 18, 22, 16,
    'initialiseurs', 'C3',
    72, 68, 75, 72, 70, 74, 62, 68, 78, 72,
    'TP-SN-003', true, now()
  )
ON CONFLICT (profile_id) DO NOTHING;

-- Abonnement actif
INSERT INTO public.subscriptions (organization_id, plan, status, amount_fcfa, currency)
VALUES ('00000000-0000-0000-0000-000000000001', 'growth', 'active', 75000, 'XOF')
ON CONFLICT DO NOTHING;

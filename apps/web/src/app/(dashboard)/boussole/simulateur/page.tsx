import { withAuth } from '@workos-inc/authkit-nextjs';
import { SectionHeader } from '@/components/shared';
import { getUserOrg } from '@/lib/supabase/auth';
import SimulateurClient from '@/components/boussole/SimulateurClient';
import { ARCHETYPE_ENERGY, ARCHETYPE_LABELS } from '@teranga/scoring';
import type { EnergyFamily } from '@teranga/scoring';
import type { Archetype } from '@teranga/types';

const FAMILIES: EnergyFamily[] = ['Pilotes', 'Initialiseurs', 'Accomplisseurs', 'Dynamiseurs', 'Regulateurs'];

export default async function SimulateurPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return <div className="flex items-center justify-center h-64"><p className="text-slate-400">Profil en cours de configuration…</p></div>;

  const { supabase, organizationId, orgArchetype, orgIasScore, orgName } = ctx;
  const year = new Date().getFullYear();

  const [passportsRes, pulseRes, okrsRes, evalsRes] = await Promise.all([
    supabase.from('talent_passports')
      .select('energy_pilotes, energy_initialiseurs, energy_accomplisseurs, energy_dynamiseurs, energy_regulateurs, dominant_family')
      .eq('organization_id', organizationId),
    supabase.from('vision_pulses')
      .select('adhesion_score')
      .eq('organization_id', organizationId)
      .order('year', { ascending: false })
      .order('quarter', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('okr_company')
      .select('on_track')
      .eq('organization_id', organizationId)
      .eq('year', year),
    supabase.from('quarterly_evaluations')
      .select('correlation_score')
      .eq('organization_id', organizationId)
      .eq('year', year),
  ]);

  const passports = passportsRes.data ?? [];
  const archetype = (orgArchetype ?? 'CONQUERANTE') as Archetype;
  const okrs      = okrsRes.data   ?? [];
  const evals     = evalsRes.data  ?? [];

  const n = passports.length;
  const actual: Record<EnergyFamily, number> = {
    Pilotes:        n > 0 ? passports.reduce((s, p) => s + (p.energy_pilotes ?? 0), 0) / n : 20,
    Initialiseurs:  n > 0 ? passports.reduce((s, p) => s + (p.energy_initialiseurs ?? 0), 0) / n : 20,
    Accomplisseurs: n > 0 ? passports.reduce((s, p) => s + (p.energy_accomplisseurs ?? 0), 0) / n : 20,
    Dynamiseurs:    n > 0 ? passports.reduce((s, p) => s + (p.energy_dynamiseurs ?? 0), 0) / n : 20,
    Regulateurs:    n > 0 ? passports.reduce((s, p) => s + (p.energy_regulateurs ?? 0), 0) / n : 20,
  };

  // Normaliser
  const totalActual = FAMILIES.reduce((s, f) => s + actual[f], 0);
  if (totalActual > 0) for (const f of FAMILIES) actual[f] = Math.round((actual[f] / totalActual) * 100);

  const avgCorr   = evals.length > 0 ? Math.round(evals.reduce((s, e) => s + (e.correlation_score ?? 0), 0) / evals.length) : 50;
  const adhesion  = pulseRes.data?.adhesion_score ?? 50;
  const velocity  = okrs.length > 0 ? Math.round(okrs.filter(o => o.on_track).length / okrs.length * 100) : 50;

  const required = ARCHETYPE_ENERGY[archetype];

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        tag="BOUSSOLE — SIMULATEUR"
        title="War-gaming stratégique"
        subtitle={`${orgName} · Simulez l'impact de vos décisions RH sur l'IAS`}
      />
      <SimulateurClient
        archetype={archetype}
        archetypeLabel={ARCHETYPE_LABELS[archetype]}
        currentIas={orgIasScore}
        currentEnergy={actual}
        requiredEnergy={required}
        teamSize={n}
        baselineCapability={avgCorr}
        baselineAdhesion={adhesion}
        baselineVelocity={velocity}
      />
    </div>
  );
}

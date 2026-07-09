import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/user';
import { getUserOrg } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ARCHETYPE_ENERGY, computeEnergyGap } from '@teranga/scoring';
import type { Archetype } from '@teranga/scoring';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VALID_ARCHETYPES = new Set<string>([
  'CONQUERANTE', 'INNOVATRICE', 'CONSOLIDATRICE', 'TRANSFORMATRICE', 'PERENNE',
]);

export async function POST() {
  const user = await requireAuth();
  const ctx  = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 });

  const { organizationId, orgArchetype, orgIasScore, orgName } = ctx;
  const admin = createAdminClient();

  // Composition énergétique actuelle de l'équipe
  const { data: passports } = await admin
    .from('talent_passports')
    .select('energy_pilotes, energy_initialiseurs, energy_accomplisseurs, energy_dynamiseurs, energy_regulateurs, dominant_family')
    .eq('organization_id', organizationId);

  const team = passports ?? [];
  const n    = team.length || 1;

  const avgEnergy = {
    Pilotes:        Math.round(team.reduce((s, p) => s + (p.energy_pilotes        ?? 0), 0) / n),
    Initialiseurs:  Math.round(team.reduce((s, p) => s + (p.energy_initialiseurs  ?? 0), 0) / n),
    Accomplisseurs: Math.round(team.reduce((s, p) => s + (p.energy_accomplisseurs ?? 0), 0) / n),
    Dynamiseurs:    Math.round(team.reduce((s, p) => s + (p.energy_dynamiseurs    ?? 0), 0) / n),
    Regulateurs:    Math.round(team.reduce((s, p) => s + (p.energy_regulateurs    ?? 0), 0) / n),
  };

  // Dominant families distribution
  const familyCount: Record<string, number> = {};
  for (const p of team) {
    const f = p.dominant_family ?? 'inconnu';
    familyCount[f] = (familyCount[f] ?? 0) + 1;
  }

  // Gap énergétique vs archétype
  const archetype = VALID_ARCHETYPES.has(orgArchetype ?? '') ? (orgArchetype as Archetype) : null;
  const energyGap = archetype ? computeEnergyGap(archetype, avgEnergy) : null;
  const requiredMix = archetype ? ARCHETYPE_ENERGY[archetype] : null;

  // OKRs de l'org
  const { data: okrs } = await admin
    .from('okr_company')
    .select('title, progress, on_track')
    .eq('organization_id', organizationId)
    .eq('year', new Date().getFullYear())
    .limit(3);

  // Postes déjà ouverts
  const { data: openJobs } = await admin
    .from('jobs')
    .select('title, requirements')
    .eq('organization_id', organizationId)
    .in('status', ['open', 'active'])
    .limit(5);

  // Construire le prompt Claude
  const contextJson = JSON.stringify({
    organisation: orgName,
    archetype:    orgArchetype ?? 'Non défini',
    ias_score:    orgIasScore,
    effectif:     team.length,
    energie_actuelle: avgEnergy,
    mix_energetique_requis: requiredMix ?? {},
    gaps_energetiques:      energyGap ?? {},
    distribution_familles:  familyCount,
    okrs_en_cours: okrs?.map(o => ({ titre: o.title, avancement: o.progress, on_track: o.on_track })) ?? [],
    postes_ouverts: openJobs?.map(j => ({
      titre: j.title,
      famille_requise: ((j.requirements ?? {}) as Record<string, unknown>).required_family ?? 'non spécifié',
    })) ?? [],
  }, null, 2);

  const msg = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 900,
    system: `Tu es un conseiller RH stratégique expert en recrutement pour entreprises africaines.
Tu analyses l'ADN énergétique d'une organisation (modèle Teranga Align : 5 familles énergétiques — Pilotes, Initialiseurs, Accomplisseurs, Dynamiseurs, Régulateurs) et tu fournis des recommandations de recrutement précises, stratégiques et actionnables.
Les archetypes sont : CONQUÉRANTE (besoin Pilotes+Dynamiseurs), INNOVATRICE (besoin Initialiseurs+Pilotes), CONSOLIDATRICE (besoin Accomplisseurs+Régulateurs), TRANSFORMATRICE (besoin mix équilibré), PÉRENNE (besoin Régulateurs+Accomplisseurs).
Réponds UNIQUEMENT en JSON valide, sans markdown. Ne jamais inventer des données.`,
    messages: [{
      role: 'user',
      content: `Contexte organisation :\n${contextJson}\n\nJSON attendu :
{
  "diagnostic": "string — 2 phrases max, analyse de l'état actuel",
  "urgent": {
    "famille": "Pilotes|Initialiseurs|Accomplisseurs|Dynamiseurs|Régulateurs",
    "gap_pts": number,
    "impact_ias_potentiel": number,
    "raison": "string — pourquoi ce profil est critique pour l'archétype et la vision"
  },
  "recommandations": [
    {
      "profil": "string — ex: Dynamiseur Senior Commercial",
      "famille": "string",
      "priorite": "critique|haute|moyenne",
      "raison_strategique": "string — lien direct avec la vision et les OKRs",
      "impact_ias": number,
      "criteres_cles": ["string","string","string"]
    }
  ],
  "alerte": "string|null — risque si aucun recrutement dans 3 mois"
}`,
    }],
  });

  const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '{}';

  let advice: unknown;
  try { advice = JSON.parse(text); }
  catch { return NextResponse.json({ error: 'Analyse IA invalide' }, { status: 500 }); }

  return NextResponse.json({
    ok: true,
    archetype,
    ias: orgIasScore,
    team_size: team.length,
    energy_gap: energyGap,
    advice,
  });
}

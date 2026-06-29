// Archétypes fondateur — 5 profils comportementaux
// L'archétype est RÉVÉLÉ par le questionnaire, jamais choisi par le fondateur

export type FounderArchetype =
  | 'BATISSEUR'
  | 'PIONNIER'
  | 'ARTISAN'
  | 'CATALYSEUR'
  | 'GARDIEN';

export interface FounderArchetypeMeta {
  label:        string;
  tagline:      string;
  color:        string;
  icon:         string;
  strengths:    string[];
  blindspots:   string[];
  needsPartner: string;
  energyFamily: string;
  fundingMatch: string[];
}

export const FOUNDER_ARCHETYPE_META: Record<FounderArchetype, FounderArchetypeMeta> = {
  BATISSEUR: {
    label:        'Le Bâtisseur',
    tagline:      'Tu construis pour durer.',
    color:        '#10B981',
    icon:         'Building2',
    strengths:    ['Exécution rigoureuse', 'Gestion des ressources', 'Vision long terme'],
    blindspots:   ['Peut manquer d\'agilité face aux pivots', 'Sous-estime parfois l\'innovation'],
    needsPartner: 'Pionnier ou Catalyseur pour l\'ouverture et la croissance',
    energyFamily: 'Accomplisseurs',
    fundingMatch: ['BNDE', 'FONSIS', 'banques classiques'],
  },
  PIONNIER: {
    label:        'Le Pionnier',
    tagline:      'Tu explores là où personne n\'est allé.',
    color:        '#8B5CF6',
    icon:         'Compass',
    strengths:    ['Innovation', 'Prise de risque calculée', 'Adaptation rapide'],
    blindspots:   ['Difficulté à finir et livrer', 'Peut s\'ennuyer après le lancement'],
    needsPartner: 'Bâtisseur ou Artisan pour structurer et livrer',
    energyFamily: 'Initialiseurs',
    fundingMatch: ['Teranga Capital', 'business angels', 'DER/FJ'],
  },
  ARTISAN: {
    label:        'L\'Artisan',
    tagline:      'Tu fais les choses bien, ou tu ne les fais pas.',
    color:        '#0EA5E9',
    icon:         'Hammer',
    strengths:    ['Qualité du produit/service', 'Fidélisation client', 'Réputation'],
    blindspots:   ['Croissance lente', 'Peut sur-optimiser au lieu de scaler'],
    needsPartner: 'Catalyseur pour développer la clientèle et la visibilité',
    energyFamily: 'Accomplisseurs / Régulateurs',
    fundingMatch: ['ADEPME', 'microfinance', 'bootstrapping'],
  },
  CATALYSEUR: {
    label:        'Le Catalyseur',
    tagline:      'Tu fais avancer les gens et les projets.',
    color:        '#F97316',
    icon:         'Zap',
    strengths:    ['Leadership naturel', 'Réseau', 'Énergie collective'],
    blindspots:   ['Peut négliger l\'exécution opérationnelle', 'Dépend beaucoup des autres'],
    needsPartner: 'Bâtisseur ou Artisan pour l\'exécution et la livraison',
    energyFamily: 'Dynamiseurs / Pilotes',
    fundingMatch: ['fonds impact', 'partenariats stratégiques', 'DER/FJ'],
  },
  GARDIEN: {
    label:        'Le Gardien',
    tagline:      'Tu construis pour que ça dure après toi.',
    color:        '#F59E0B',
    icon:         'Shield',
    strengths:    ['Stabilité', 'Valeurs fortes', 'Impact social mesurable'],
    blindspots:   ['Croissance lente', 'Peut manquer d\'appétit pour le risque'],
    needsPartner: 'Pionnier pour l\'ambition et l\'exploration de marchés',
    energyFamily: 'Régulateurs',
    fundingMatch: ['FONSIS', 'fonds ESS', 'institutions publiques'],
  },
};

// Calcul de l'archétype à partir des réponses (clé = id question, valeur = 'A'|'B'|'C'|'D'|'E')
import { FOUNDER_QUESTIONS } from './questions';

export function computeFounderArchetype(
  responses: Record<string, string>
): { archetype: FounderArchetype; scores: Record<FounderArchetype, number>; confidence: number } {
  const scores: Record<FounderArchetype, number> = {
    BATISSEUR: 0, PIONNIER: 0, ARTISAN: 0, CATALYSEUR: 0, GARDIEN: 0,
  };

  for (const q of FOUNDER_QUESTIONS) {
    const answer = responses[q.id];
    const option = q.options.find(o => o.value === answer);
    if (option) scores[option.family as FounderArchetype]++;
  }

  const total      = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
  const archetype  = (Object.entries(scores).sort(([, a], [, b]) => b - a)[0]![0]) as FounderArchetype;
  const confidence = Math.round((scores[archetype] / total) * 100);

  return { archetype, scores, confidence };
}

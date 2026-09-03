export const REFERENTIEL_VERSION = 'ENERGY_REF_V1' as const;

export type EnergyCode = 'P' | 'I' | 'D' | 'A' | 'R';

export interface EnergySkillDefinition {
  code: EnergyCode;
  name: string;
  definition: string;
}

export const ENERGY_SKILLS: readonly EnergySkillDefinition[] = [
  { code: 'P', name: 'Pilote',        definition: "Donne une direction, arbitre, décide et réduit l'incertitude par l'orientation." },
  { code: 'I', name: 'Initialiseur',  definition: 'Imagine, explore, ouvre des possibilités, teste et initie.' },
  { code: 'D', name: 'Dynamiseur',    definition: "Mobilise, connecte, crée de l'adhésion et fait circuler l'énergie collective." },
  { code: 'A', name: 'Accomplisseur', definition: 'Transforme objectifs et idées en actions, exécution et résultats.' },
  { code: 'R', name: 'Régulateur',    definition: 'Analyse, structure, sécurise, fiabilise et prévient les risques.' },
] as const;

export const ENERGY_CODES: EnergyCode[] = ENERGY_SKILLS.map(s => s.code);

// Dimensions comportementales transverses (PRD §8) — sous-ensemble utilisé pour
// faire tourner le "décor" des questions et diversifier les contextes observés.
export const CONTEXT_TAGS = [
  'incertitude', 'pression', 'changement', 'collectif', 'decision',
] as const;

export type ContextTag = typeof CONTEXT_TAGS[number];

export const TRANSVERSE_DIMENSIONS = [
  'incertitude', 'pression', 'changement', 'collectif', 'decision',
  'execution', 'innovation', 'risque', 'autonomie', 'resolution_probleme',
] as const;

export function findEnergySkill(code: EnergyCode): EnergySkillDefinition {
  const skill = ENERGY_SKILLS.find(s => s.code === code);
  if (!skill) throw new Error(`Code Energy Skill inconnu: ${code}`);
  return skill;
}

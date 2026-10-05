import type { StepConfig } from '../types';

// Les facettes sont les compétences extraites du CV du candidat : la config est
// construite par session (cf. resolveStepConfig), pas figée.
export const MAX_TESTED_SKILLS = 5;
const MAX_SKILL_LENGTH = 60;

export function sanitizeSkills(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const skill = item.trim();
    if (!skill || skill.length > MAX_SKILL_LENGTH) continue;
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(skill);
    if (out.length === MAX_TESTED_SKILLS) break;
  }
  return out;
}

export function buildHardConfig(skills: readonly string[]): StepConfig {
  return {
    step: 'hard',
    facets: skills,
    facetLabels: Object.fromEntries(skills.map(s => [s, s])),
    // 2 à 3 questions par compétence (cf. isKnowledgeSettled)
    minQuestions: skills.length * 2,
    maxQuestions: skills.length * 3,
    // Une seule bonne réponse, trois distracteurs
    valueLadder: [1, 0, 0, 0],
    contextTags: ['cas pratique', 'question de cours', 'diagnostic d\'erreur'],
    questionStyle: 'knowledge',
    orderedOptions: false,
  };
}

// Gabarit sans facettes : la vraie config dépend du CV (resolveStepConfig).
export const HARD_CONFIG_TEMPLATE: StepConfig = buildHardConfig([]);

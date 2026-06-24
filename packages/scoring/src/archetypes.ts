import type { Archetype } from '@teranga/types';

export type { Archetype };

export type EnergyFamily =
  | 'Pilotes'
  | 'Initialiseurs'
  | 'Accomplisseurs'
  | 'Dynamiseurs'
  | 'Regulateurs';

// Mix énergétique requis par archétype (en %)
export const ARCHETYPE_ENERGY: Record<Archetype, Record<EnergyFamily, number>> = {
  CONQUERANTE:    { Pilotes: 30, Dynamiseurs: 25, Accomplisseurs: 20, Initialiseurs: 15, Regulateurs: 10 },
  INNOVATRICE:    { Initialiseurs: 35, Pilotes: 25, Accomplisseurs: 20, Dynamiseurs: 15, Regulateurs: 5  },
  CONSOLIDATRICE: { Accomplisseurs: 35, Regulateurs: 25, Pilotes: 20, Initialiseurs: 10, Dynamiseurs: 10 },
  TRANSFORMATRICE:{ Pilotes: 25, Initialiseurs: 25, Dynamiseurs: 20, Accomplisseurs: 20, Regulateurs: 10 },
  PERENNE:        { Regulateurs: 30, Accomplisseurs: 25, Pilotes: 20, Initialiseurs: 15, Dynamiseurs: 10 },
};

export const ARCHETYPE_COLORS: Record<Archetype, string> = {
  CONQUERANTE:     '#F97316',
  INNOVATRICE:     '#8B5CF6',
  CONSOLIDATRICE:  '#0EA5E9',
  TRANSFORMATRICE: '#10B981',
  PERENNE:         '#F59E0B',
};

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  CONQUERANTE:     'Conquérante',
  INNOVATRICE:     'Innovatrice',
  CONSOLIDATRICE:  'Consolidatrice',
  TRANSFORMATRICE: 'Transformatrice',
  PERENNE:         'Pérenne',
};

const ENERGY_FAMILIES: EnergyFamily[] = [
  'Pilotes', 'Initialiseurs', 'Accomplisseurs', 'Dynamiseurs', 'Regulateurs',
];

export function computeEnergyGap(
  archetype: Archetype,
  actual: Partial<Record<EnergyFamily, number>>
): Record<EnergyFamily, number> {
  const required = ARCHETYPE_ENERGY[archetype];
  const result = {} as Record<EnergyFamily, number>;

  for (const family of ENERGY_FAMILIES) {
    // required est un Record complet donc jamais undefined, mais on protège explicitement
    const req = required[family] ?? 0;
    result[family] = req - (actual[family] ?? 0);
  }

  return result;
}

// Calcule l'Energy Fit (0-100) : inverse de l'écart total normalisé
export function computeEnergyFit(
  archetype: Archetype,
  actual: Partial<Record<EnergyFamily, number>>
): number {
  const gaps = computeEnergyGap(archetype, actual);
  const totalGap = ENERGY_FAMILIES.reduce((sum, f) => sum + Math.abs(gaps[f] ?? 0), 0);
  // Gap max théorique = 200 (tout à l'envers)
  return Math.round(Math.max(0, 100 - (totalGap / 200) * 100));
}

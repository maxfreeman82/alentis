import { ENERGY_CODES, type EnergyCode } from './referentiel';
import type { ConcludeAction } from './engine';

// Pont entre le moteur (codes P/I/D/A/R, jamais de score visible) et les
// colonnes historiques de `talent_passports` (noms de familles, pourcentages
// normalisés) dont dépendent déjà passport/page.tsx, boussole/correlation et
// le matching recrutement. Attention : l'ordre des lettres ne correspond PAS
// à l'ordre des noms — D=Dynamiseur côté énergie, mais A=Accomplisseur.
export type TalentPassportEnergyFamily =
  | 'pilotes' | 'initialiseurs' | 'accomplisseurs' | 'dynamiseurs' | 'regulateurs';

export const ENERGY_CODE_TO_FAMILY: Record<EnergyCode, TalentPassportEnergyFamily> = {
  P: 'pilotes',
  I: 'initialiseurs',
  D: 'dynamiseurs',
  A: 'accomplisseurs',
  R: 'regulateurs',
};

const ENERGY_LEVELS = ['C1', 'C2', 'C3', 'C4', 'C5'] as const;

export interface TalentPassportEnergyBridge {
  energyPercentages: Record<TalentPassportEnergyFamily, number>;
  dominantFamily: TalentPassportEnergyFamily;
  scoreEnergy: number;
  energyLevel: string;
}

// Répartit 100 points entre les familles au prorata de `raw`, sans perdre ni
// ajouter de point à l'arrondi (méthode du plus grand reste / Hamilton) : un
// arrondi naïf indépendant par famille (Math.round de chaque part) peut sommer
// à 99 ou 101 selon les décomptes (ex. 8/1/1/1/1 sur 12 → 67/8/8/8/8 = 99),
// ce qui casserait tout consommateur qui affiche ces pourcentages comme un
// graphique en barres devant sommer à 100.
function apportionToHundred(
  raw: Record<TalentPassportEnergyFamily, number>,
  families: readonly TalentPassportEnergyFamily[],
  sum: number
): Record<TalentPassportEnergyFamily, number> {
  const bases = new Map<TalentPassportEnergyFamily, number>();
  const remainders = new Map<TalentPassportEnergyFamily, number>();
  for (const f of families) {
    const numerator = raw[f] * 100;
    bases.set(f, Math.floor(numerator / sum));
    remainders.set(f, numerator % sum);
  }

  const basesSum = [...bases.values()].reduce((s, v) => s + v, 0);
  const deficit = 100 - basesSum;

  // Distribue le reste (au plus `families.length - 1` points) aux plus gros
  // restes ; en cas d'égalité, ordre stable = ordre de `families`.
  const order = [...families].sort((a, b) => remainders.get(b)! - remainders.get(a)!);
  for (let i = 0; i < deficit; i++) {
    const f = order[i]!;
    bases.set(f, bases.get(f)! + 1);
  }

  return Object.fromEntries(families.map(f => [f, bases.get(f)!])) as Record<TalentPassportEnergyFamily, number>;
}

export function bridgeConclusionToTalentPassport(decision: ConcludeAction): TalentPassportEnergyBridge {
  const families = ENERGY_CODES.map(code => ENERGY_CODE_TO_FAMILY[code]);
  const raw = Object.fromEntries(families.map(f => [f, 0])) as Record<TalentPassportEnergyFamily, number>;
  for (const code of ENERGY_CODES) {
    raw[ENERGY_CODE_TO_FAMILY[code]] = decision.evidence[code];
  }

  const sum = families.reduce((s, f) => s + raw[f], 0);
  const energyPercentages = sum > 0
    ? apportionToHundred(raw, families, sum)
    : (Object.fromEntries(families.map(f => [f, 20])) as Record<TalentPassportEnergyFamily, number>);

  const dominantFamily = ENERGY_CODE_TO_FAMILY[decision.dominant];
  const scoreEnergy = energyPercentages[dominantFamily];
  const levelIdx = Math.min(Math.floor(scoreEnergy / 20), 4);
  const energyLevel = ENERGY_LEVELS[levelIdx] ?? 'C3';

  return { energyPercentages, dominantFamily, scoreEnergy, energyLevel };
}

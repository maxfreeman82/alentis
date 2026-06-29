export type Gender     = 'homme' | 'femme' | 'autre' | 'non_precise';
export type AgeRange   = '18-25' | '26-35' | '36-45' | '46-55' | '55+';
export type SalaryBand = 'junior' | 'intermediaire' | 'senior' | 'expert' | 'direction';

export interface DeiRow {
  gender:          Gender | null;
  age_range:       AgeRange | null;
  nationality:     string | null;
  department:      string | null;
  salary_band:     SalaryBand | null;
  is_manager:      boolean;
  disability:      boolean;
}

export interface DeiMetrics {
  totalProfiles:     number;
  genderDist:        Record<string, number>;
  femaleManagerPct:  number;
  ageDist:           Record<string, number>;
  nationalityCount:  number;
  diversityIndex:    number; // Shannon entropy 0-1
  disabilityPct:     number;
  salaryBandByGender: Record<string, { homme: number; femme: number }>;
  inclusionScore:    number; // 0-100
}

export function computeDeiMetrics(rows: DeiRow[]): DeiMetrics {
  const n = rows.length;
  if (n === 0) return {
    totalProfiles: 0, genderDist: {}, femaleManagerPct: 0, ageDist: {},
    nationalityCount: 0, diversityIndex: 0, disabilityPct: 0,
    salaryBandByGender: {}, inclusionScore: 0,
  };

  // Distribution genre
  const genderDist: Record<string, number> = {};
  for (const r of rows) {
    const g = r.gender ?? 'non_precise';
    genderDist[g] = (genderDist[g] ?? 0) + 1;
  }

  // Parité managériale
  const managers    = rows.filter(r => r.is_manager);
  const femManagers = managers.filter(r => r.gender === 'femme').length;
  const femaleManagerPct = managers.length > 0 ? Math.round((femManagers / managers.length) * 100) : 0;

  // Distribution âge
  const ageDist: Record<string, number> = {};
  for (const r of rows) {
    if (r.age_range) ageDist[r.age_range] = (ageDist[r.age_range] ?? 0) + 1;
  }

  // Diversité nationalité (index Shannon)
  const natCount: Record<string, number> = {};
  for (const r of rows) {
    if (r.nationality) natCount[r.nationality] = (natCount[r.nationality] ?? 0) + 1;
  }
  const nationalityCount = Object.keys(natCount).length;
  let shannon = 0;
  for (const cnt of Object.values(natCount)) {
    const p = cnt / n;
    if (p > 0) shannon -= p * Math.log2(p);
  }
  const maxShannon = Math.log2(Math.max(nationalityCount, 1));
  const diversityIndex = maxShannon > 0 ? Math.round((shannon / maxShannon) * 100) / 100 : 0;

  // Handicap
  const disabilityPct = Math.round((rows.filter(r => r.disability).length / n) * 100);

  // Répartition salaire par genre
  const salaryBandByGender: Record<string, { homme: number; femme: number }> = {};
  const bands: SalaryBand[] = ['junior', 'intermediaire', 'senior', 'expert', 'direction'];
  for (const band of bands) {
    const inBand = rows.filter(r => r.salary_band === band);
    salaryBandByGender[band] = {
      homme: inBand.filter(r => r.gender === 'homme').length,
      femme: inBand.filter(r => r.gender === 'femme').length,
    };
  }

  // Score inclusion composite
  const femalePct    = ((genderDist['femme'] ?? 0) / n) * 100;
  const parityScore  = Math.min(femalePct, 100 - femalePct) / 50 * 100; // 100 si 50/50
  const natScore     = Math.min(nationalityCount * 10, 100);
  const mgrParScore  = femaleManagerPct;
  const inclusionScore = Math.round(parityScore * 0.4 + natScore * 0.3 + mgrParScore * 0.3);

  return {
    totalProfiles: n, genderDist, femaleManagerPct, ageDist,
    nationalityCount, diversityIndex, disabilityPct, salaryBandByGender, inclusionScore,
  };
}

// Obligations conformité Sénégal par défaut
export const DEFAULT_COMPLIANCE_ITEMS = [
  { category: 'social',    title: 'IPRES — Déclaration cotisations',           description: 'Tranche A + B, avant le 15 du mois suivant',   frequency: 'mensuel',      status: 'pending' },
  { category: 'social',    title: 'CSS — Cotisations prestations familiales',   description: 'CSS PF 7%, avant le 15 du mois suivant',       frequency: 'mensuel',      status: 'pending' },
  { category: 'social',    title: 'IPM — Cotisations maladie',                  description: 'Part salarié + patronal, versement mensuel',    frequency: 'mensuel',      status: 'pending' },
  { category: 'fiscal',    title: 'IRPP — Versement retenues à la source',     description: 'Retenues salariales à reverser au Trésor',      frequency: 'mensuel',      status: 'pending' },
  { category: 'emploi',    title: 'Déclaration Annuelle des Salaires (DAS)',    description: 'À soumettre à la DGID avant le 31 mars',        frequency: 'annuel',       status: 'pending' },
  { category: 'securite',  title: 'Visites médicales annuelles',               description: 'Médecin du travail — tous les collaborateurs',  frequency: 'annuel',       status: 'pending' },
  { category: 'formation', title: 'Plan de formation annuel',                  description: 'Soumission au FONDS formation (FNF)',            frequency: 'annuel',       status: 'pending' },
  { category: 'emploi',    title: 'Registre du personnel à jour',              description: 'Nom, date embauche, salaire, contrat',          frequency: 'annuel',       status: 'pending' },
  { category: 'social',    title: 'IPRES — Déclaration annuelle',              description: 'Récapitulatif annuel IPRES',                     frequency: 'annuel',       status: 'pending' },
  { category: 'securite',  title: 'Rapport Hygiène & Sécurité (CHSCT)',        description: 'Rapport annuel conditions de travail',          frequency: 'annuel',       status: 'pending' },
  { category: 'fiscal',    title: 'Déclaration TVA',                           description: 'Si assujetti — mensuelle ou trimestrielle',     frequency: 'mensuel',      status: 'pending' },
  { category: 'emploi',    title: 'Affichage obligatoire code du travail',     description: 'Horaires, convention collective, protection',   frequency: 'unique',       status: 'pending' },
];

// Calcul coût employeur Sénégal — outil gratuit Mode Fondateur
// Sources : barème IPRES 2024, CSS, FDFP, IR progressif Sénégal

export interface EmployerCostOptions {
  isCadre?:      boolean;   // IPRES RC (3.6%) si cadre
  accidentRate?: number;    // CSS accidents travail : 1-5% selon secteur (défaut 2%)
  has13thMonth?: boolean;   // multiplier annuel par 13
}

export interface EmployerCostResult {
  grossSalary:     number;
  // Part salariale (déduite du brut — ce que perd l'employé)
  ipresRgEmployee: number;   // IPRES RG salarié : 5.6%
  ir:              number;   // Impôt sur le Revenu (barème progressif)
  trimf:           number;   // TRIMF : 1 500 FCFA fixe si brut > 25 000 FCFA
  netSalary:       number;   // ce que reçoit l'employé
  // Part patronale (coût supplémentaire pour l'employeur)
  ipresRgEmployer: number;   // IPRES RG patronal : 8.4%
  ipresRcEmployer: number;   // IPRES RC patronal cadre : 3.6%
  cssEmployer:     number;   // CSS accidents travail : 1-5% selon secteur
  fdfpEmployer:    number;   // FDFP formation pro : 0.8%
  // Totaux
  totalCost:       number;   // coût mensuel total employeur
  totalCostAnnual: number;   // coût annuel (x12 ou x13)
  // Ratio d'information
  ratioNetToTotal: number;   // % du net par rapport au coût total (efficacité salariale)
}

export function computeEmployerCost(
  grossSalary: number,
  options: EmployerCostOptions = {}
): EmployerCostResult {
  const { isCadre = false, accidentRate = 0.02, has13thMonth = false } = options;

  // ── Part salariale ──
  const ipresRgEmployee = Math.round(grossSalary * 0.056);
  const ir              = computeIR(grossSalary);
  const trimf           = grossSalary <= 25000 ? 0 : 1500;
  const netSalary       = grossSalary - ipresRgEmployee - ir - trimf;

  // ── Part patronale ──
  const ipresRgEmployer = Math.round(grossSalary * 0.084);
  const ipresRcEmployer = isCadre ? Math.round(grossSalary * 0.036) : 0;
  const cssEmployer     = Math.round(grossSalary * accidentRate);
  const fdfpEmployer    = Math.round(grossSalary * 0.008);

  const totalCost       = grossSalary + ipresRgEmployer + ipresRcEmployer + cssEmployer + fdfpEmployer;
  const totalCostAnnual = totalCost * (has13thMonth ? 13 : 12);
  const ratioNetToTotal = Math.round((netSalary / totalCost) * 100);

  return {
    grossSalary, ipresRgEmployee, ir, trimf, netSalary,
    ipresRgEmployer, ipresRcEmployer, cssEmployer, fdfpEmployer,
    totalCost, totalCostAnnual, ratioNetToTotal,
  };
}

// Barème IR progressif Sénégal 2024 (mensuel)
export function computeIR(grossSalary: number): number {
  const annual = grossSalary * 12;
  let annualIR = 0;

  if      (annual <= 630000)   annualIR = 0;
  else if (annual <= 1500000)  annualIR = (annual - 630000) * 0.20;
  else if (annual <= 4000000)  annualIR = 174000 + (annual - 1500000) * 0.30;
  else if (annual <= 8000000)  annualIR = 924000 + (annual - 4000000) * 0.35;
  else                         annualIR = 2324000 + (annual - 8000000) * 0.37;

  return Math.round(annualIR / 12);
}

// Taux CSS par secteur (accidents du travail)
export const CSS_RATES: { label: string; rate: number }[] = [
  { label: 'Commerce / Services',        rate: 0.01 },
  { label: 'Administration / Finance',   rate: 0.015 },
  { label: 'Industrie légère / Tech',    rate: 0.02 },
  { label: 'BTP / Artisanat',            rate: 0.035 },
  { label: 'Industries extractives',     rate: 0.05 },
];

// Formatage FCFA
export function formatFCFA(n: number): string {
  return n.toLocaleString('fr-SN') + ' FCFA';
}

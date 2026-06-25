// Moteur de paie Sénégal — IPRES / CSS / IRPP
// Taux en vigueur : DGI Sénégal + IPRES 2024

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

/** Plafonds mensuels en FCFA */
const PLAFOND_IPRES_A  = 432_000;   // Tranche A IPRES
const PLAFOND_IPRES_B  = 1_296_000; // Tranche B IPRES (cumul A+B)
const PLAFOND_CSS_PF   = 63_000;    // Prestation familiale CSS

/** Taux IPRES (Retraite) — en pourcentage */
const IPRES_TAUX = {
  trancheA: { salarie: 5.6,  patronal: 8.4  },
  trancheB: { salarie: 2.4,  patronal: 3.6  },
} as const;

/** Taux CSS (Sécurité Sociale) — employeur uniquement */
const CSS_TAUX = {
  prestationFamiliale: 7.0,  // plafond PLAFOND_CSS_PF
  accidentTravail:     1.0,  // taux minimal, variable selon risque
  invaliditeDecès:     0.4,  // employeur
} as const;

/** Cotisation IPM (Assurance maladie) indicative */
const IPM_TAUX = {
  salarie:  1.5,
  patronal: 3.0,
} as const;

/** Abattement forfaitaire frais professionnels IRPP */
const ABATTEMENT_FP = 0.30; // 30 % du salaire brut imposable

/** Barème IRPP annuel — tranches en FCFA */
const TRANCHES_IRPP: Array<{ min: number; max: number; taux: number }> = [
  { min:           0, max:     630_000, taux:  0  },
  { min:     630_001, max:   1_500_000, taux: 20  },
  { min:   1_500_001, max:   4_000_000, taux: 30  },
  { min:   4_000_001, max:   8_000_000, taux: 35  },
  { min:   8_000_001, max: Infinity,    taux: 40  },
];

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type FamilySituation = 'celibataire' | 'marie' | 'marie_1' | 'marie_2' | 'marie_3';

export interface PayrollInput {
  salaireBrut:     number;   // FCFA/mois
  situation:       FamilySituation;
  enfants:         number;
  sectorRisk:      'low' | 'medium' | 'high'; // pour taux AT
  primes:          number;   // primes imposables du mois (FCFA)
  avantagesNature: number;   // véhicule, logement… (FCFA)
  retenuePrevoy:   number;   // retenue facultative prévoyance salarié
}

export interface CotisationDetail {
  base:     number;
  taux:     number;
  montant:  number;
  label:    string;
}

export interface PayrollResult {
  input:                PayrollInput;
  salaireBrut:          number;   // hors primes
  totalBrut:            number;   // brut + primes + avantages

  // Cotisations salariales
  ipresA_salarie:       CotisationDetail;
  ipresB_salarie:       CotisationDetail;
  ipm_salarie:          CotisationDetail;
  totalRetenues:        number;

  // Cotisations patronales (informatives)
  ipresA_patronal:      CotisationDetail;
  ipresB_patronal:      CotisationDetail;
  css_pf:               CotisationDetail;
  css_at:               CotisationDetail;
  ipm_patronal:         CotisationDetail;
  totalChargesPatronal: number;

  // IRPP
  salaireNetImposable:  number;
  irppAnnuel:           number;
  irppMensuel:          number;

  // Net
  salaireNet:           number;
  coutEmployeur:        number;   // brut + charges patronales

  // Résumé
  tauxChargesSalarie:   number;   // % du brut
  tauxCoutTotal:        number;   // % du net
}

// ─── CALCULS AUXILIAIRES ─────────────────────────────────────────────────────

function round(n: number): number {
  return Math.round(n);
}

function atTaux(risk: PayrollInput['sectorRisk']): number {
  return risk === 'high' ? 5.0 : risk === 'medium' ? 2.5 : 1.0;
}

/** Parts fiscales selon situation familiale */
function parts(situation: FamilySituation): number {
  const base: Record<FamilySituation, number> = {
    celibataire: 1, marie: 1.5, marie_1: 2, marie_2: 2.5, marie_3: 3,
  };
  return base[situation];
}

/** Calcule l'IRPP annuel sur le revenu net imposable (barème progressif) */
function irppAnnuel(netImposableAnnuel: number, _parts: number): number {
  let impot = 0;
  for (const tranche of TRANCHES_IRPP) {
    if (netImposableAnnuel <= tranche.min) break;
    const base = Math.min(netImposableAnnuel, tranche.max) - tranche.min;
    impot += base * (tranche.taux / 100);
  }
  // Réduction pour charges de famille (simplifiée)
  const reductionFamille = (_parts - 1) * 0.05 * impot;
  return Math.max(0, round(impot - reductionFamille));
}

// ─── MOTEUR PRINCIPAL ────────────────────────────────────────────────────────

export function computePayroll(input: PayrollInput): PayrollResult {
  const { salaireBrut, situation, primes, avantagesNature, sectorRisk, retenuePrevoy } = input;
  const totalBrut = salaireBrut + primes + avantagesNature;

  // ── IPRES Tranche A (salarié) ──────────────────────────────────────────────
  const baseA = Math.min(totalBrut, PLAFOND_IPRES_A);
  const ipresA_salarie: CotisationDetail = {
    base: baseA, taux: IPRES_TAUX.trancheA.salarie,
    montant: round(baseA * IPRES_TAUX.trancheA.salarie / 100),
    label: 'IPRES Tranche A – Salarié',
  };

  // ── IPRES Tranche B (salarié) ──────────────────────────────────────────────
  const baseB = Math.max(0, Math.min(totalBrut, PLAFOND_IPRES_B) - PLAFOND_IPRES_A);
  const ipresB_salarie: CotisationDetail = {
    base: baseB, taux: IPRES_TAUX.trancheB.salarie,
    montant: round(baseB * IPRES_TAUX.trancheB.salarie / 100),
    label: 'IPRES Tranche B – Salarié',
  };

  // ── IPM Salarié ────────────────────────────────────────────────────────────
  const ipm_salarie: CotisationDetail = {
    base: totalBrut, taux: IPM_TAUX.salarie,
    montant: round(totalBrut * IPM_TAUX.salarie / 100),
    label: 'IPM (Assurance maladie) – Salarié',
  };

  const totalRetenues = ipresA_salarie.montant + ipresB_salarie.montant
    + ipm_salarie.montant + retenuePrevoy;

  // ── Cotisations patronales ─────────────────────────────────────────────────
  const ipresA_patronal: CotisationDetail = {
    base: baseA, taux: IPRES_TAUX.trancheA.patronal,
    montant: round(baseA * IPRES_TAUX.trancheA.patronal / 100),
    label: 'IPRES Tranche A – Patronal',
  };
  const ipresB_patronal: CotisationDetail = {
    base: baseB, taux: IPRES_TAUX.trancheB.patronal,
    montant: round(baseB * IPRES_TAUX.trancheB.patronal / 100),
    label: 'IPRES Tranche B – Patronal',
  };

  const basePF = Math.min(totalBrut, PLAFOND_CSS_PF);
  const css_pf: CotisationDetail = {
    base: basePF, taux: CSS_TAUX.prestationFamiliale,
    montant: round(basePF * CSS_TAUX.prestationFamiliale / 100),
    label: 'CSS Prestation familiale',
  };

  const tauxAT = atTaux(sectorRisk);
  const css_at: CotisationDetail = {
    base: totalBrut, taux: tauxAT,
    montant: round(totalBrut * tauxAT / 100),
    label: `CSS Accident du travail (${tauxAT}%)`,
  };

  const ipm_patronal: CotisationDetail = {
    base: totalBrut, taux: IPM_TAUX.patronal,
    montant: round(totalBrut * IPM_TAUX.patronal / 100),
    label: 'IPM (Assurance maladie) – Patronal',
  };

  const totalChargesPatronal = ipresA_patronal.montant + ipresB_patronal.montant
    + css_pf.montant + css_at.montant + ipm_patronal.montant;

  // ── IRPP ──────────────────────────────────────────────────────────────────
  const apresRetenues      = totalBrut - totalRetenues;
  const abattement         = round(apresRetenues * ABATTEMENT_FP);
  const netImposableMensuel = Math.max(0, apresRetenues - abattement);
  const netImposableAnnuel  = netImposableMensuel * 12;
  const irppAnn            = irppAnnuel(netImposableAnnuel, parts(situation));
  const irppMens           = round(irppAnn / 12);

  // ── Net ────────────────────────────────────────────────────────────────────
  const salaireNet   = round(totalBrut - totalRetenues - irppMens);
  const coutEmployeur = round(totalBrut + totalChargesPatronal);

  return {
    input,
    salaireBrut,
    totalBrut,
    ipresA_salarie,
    ipresB_salarie,
    ipm_salarie,
    totalRetenues,
    ipresA_patronal,
    ipresB_patronal,
    css_pf,
    css_at,
    ipm_patronal,
    totalChargesPatronal,
    salaireNetImposable: netImposableMensuel,
    irppAnnuel:          irppAnn,
    irppMensuel:         irppMens,
    salaireNet,
    coutEmployeur,
    tauxChargesSalarie:  round(((totalRetenues + irppMens) / totalBrut) * 100),
    tauxCoutTotal:       round((coutEmployeur / salaireNet) * 100),
  };
}

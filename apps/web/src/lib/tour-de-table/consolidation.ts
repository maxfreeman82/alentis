// Moteur de consolidation du Talent Passport
// Met à jour les soft skills du passport avec les observations comportementales pairs

export interface TdtAggregateData {
  observed_id:        string;
  score_fiabilite:    number;
  score_collaboration: number;
  score_communication: number;
  score_initiative:   number;
  score_adaptabilite: number;
  score_impact:       number;
  score_bien_etre:    number;
  score_global_observed: number;
  observer_count:     number;
}

export interface PassportSoftScores {
  soft_communication:    number;
  soft_leadership:       number;
  soft_adaptability:     number;
  soft_problem_solving:  number;
  soft_critical_thinking: number;
  soft_collaboration:    number;
  soft_stress_mgmt:      number;
  soft_organization:     number;
  soft_learning_speed:   number;
  soft_emotional_intel:  number;
  score_hard:            number;
  score_energy:          number;
}

// Poids pair vs auto-évaluation selon le nombre de sessions complétées
// Session 1 : 20% pairs / 80% auto (première fois, on fait confiance à l'auto)
// Session 2 : 35% pairs / 65% auto
// Session 3+ : 50% pairs / 50% auto (équilibre définitif)
export function computePeerWeight(sessionCount: number): number {
  if (sessionCount <= 1) return 0.20;
  if (sessionCount === 2) return 0.35;
  return 0.50;
}

// Fusionne les scores observés avec les scores auto du passport
export function consolidatePassport(
  currentPassport: PassportSoftScores,
  aggregate:       TdtAggregateData,
  sessionCount:    number
): Partial<PassportSoftScores> {
  const pw  = computePeerWeight(sessionCount); // poids pair
  const aw  = 1 - pw;                          // poids auto

  // Chaque dimension comportementale maps vers 1 ou 2 champs passport
  function merge(passportVal: number, observedVal: number): number {
    return Math.round(aw * passportVal + pw * observedVal);
  }

  return {
    // FIABILITE → organisation + gestion stress
    soft_organization: merge(currentPassport.soft_organization, aggregate.score_fiabilite),
    soft_stress_mgmt:  merge(
      currentPassport.soft_stress_mgmt,
      (aggregate.score_fiabilite * 0.4 + aggregate.score_bien_etre * 0.6)
    ),

    // COLLABORATION → collaboration + leadership
    soft_collaboration: merge(currentPassport.soft_collaboration, aggregate.score_collaboration),
    soft_leadership:    merge(
      currentPassport.soft_leadership,
      (aggregate.score_collaboration * 0.5 + aggregate.score_initiative * 0.5)
    ),

    // COMMUNICATION → communication + intelligence émotionnelle
    soft_communication:   merge(currentPassport.soft_communication, aggregate.score_communication),
    soft_emotional_intel: merge(
      currentPassport.soft_emotional_intel,
      (aggregate.score_communication * 0.5 + aggregate.score_bien_etre * 0.5)
    ),

    // ADAPTABILITE → adaptabilité + vitesse d'apprentissage
    soft_adaptability:   merge(currentPassport.soft_adaptability, aggregate.score_adaptabilite),
    soft_learning_speed: merge(currentPassport.soft_learning_speed, aggregate.score_adaptabilite),

    // IMPACT → hard skills (ce que les pairs voient comme résultat)
    score_hard: merge(currentPassport.score_hard, aggregate.score_impact),

    // INITIATIVE → énergie (les pairs voient l'énergie déployée)
    score_energy: merge(currentPassport.score_energy, aggregate.score_initiative),

    // Champs non touchés par ce moteur (conservés tels quels dans le passport) :
    // soft_problem_solving, soft_critical_thinking — uniquement via questionnaire 6D
  };
}

// Calcule un "delta de reconnaissance" : écart entre auto-perception et perception pairs
export interface PerceptionDelta {
  dimension:       string;
  selfScore:       number;
  peersScore:      number;
  delta:           number;   // négatif = les pairs voient moins que soi, positif = les pairs voient plus
  interpretation:  string;
}

export function computePerceptionDeltas(
  passport:  PassportSoftScores,
  aggregate: TdtAggregateData
): PerceptionDelta[] {
  return [
    {
      dimension:      'Fiabilité',
      selfScore:      passport.soft_organization,
      peersScore:     aggregate.score_fiabilite,
      delta:          aggregate.score_fiabilite - passport.soft_organization,
      interpretation: interpretDelta(aggregate.score_fiabilite - passport.soft_organization),
    },
    {
      dimension:      'Collaboration',
      selfScore:      passport.soft_collaboration,
      peersScore:     aggregate.score_collaboration,
      delta:          aggregate.score_collaboration - passport.soft_collaboration,
      interpretation: interpretDelta(aggregate.score_collaboration - passport.soft_collaboration),
    },
    {
      dimension:      'Communication',
      selfScore:      passport.soft_communication,
      peersScore:     aggregate.score_communication,
      delta:          aggregate.score_communication - passport.soft_communication,
      interpretation: interpretDelta(aggregate.score_communication - passport.soft_communication),
    },
    {
      dimension:      'Initiative',
      selfScore:      passport.score_energy,
      peersScore:     aggregate.score_initiative,
      delta:          aggregate.score_initiative - passport.score_energy,
      interpretation: interpretDelta(aggregate.score_initiative - passport.score_energy),
    },
    {
      dimension:      'Adaptabilité',
      selfScore:      passport.soft_adaptability,
      peersScore:     aggregate.score_adaptabilite,
      delta:          aggregate.score_adaptabilite - passport.soft_adaptability,
      interpretation: interpretDelta(aggregate.score_adaptabilite - passport.soft_adaptability),
    },
    {
      dimension:      'Impact',
      selfScore:      passport.score_hard,
      peersScore:     aggregate.score_impact,
      delta:          aggregate.score_impact - passport.score_hard,
      interpretation: interpretDelta(aggregate.score_impact - passport.score_hard),
    },
    {
      dimension:      'Bien-être collectif',
      selfScore:      passport.soft_stress_mgmt,
      peersScore:     aggregate.score_bien_etre,
      delta:          aggregate.score_bien_etre - passport.soft_stress_mgmt,
      interpretation: interpretDelta(aggregate.score_bien_etre - passport.soft_stress_mgmt),
    },
  ];
}

function interpretDelta(delta: number): string {
  if (delta > 15)  return 'Sous-estimation : vous vous voyez moins bien que vos pairs ne vous perçoivent.';
  if (delta > 5)   return 'Légère sous-estimation : les pairs ont une image légèrement plus positive.';
  if (delta >= -5) return 'Bonne conscience de soi : perception alignée avec celle des pairs.';
  if (delta >= -15) return 'Légère sur-estimation : les pairs vous perçoivent légèrement différemment.';
  return 'Sur-estimation notable : les pairs ont une image significativement différente.';
}

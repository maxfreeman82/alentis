export interface VisionQuestion {
  id: string;
  category: QuestionCategory;
  text: string;
  options: QuestionOption[];
}

export interface QuestionOption {
  value: string;
  label: string;
  archetype_hint: string; // archétype le plus probable pour ce choix
}

export type QuestionCategory =
  | 'ambition'
  | 'croissance'
  | 'culture'
  | 'risque'
  | 'horizon';

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  ambition:   'Ambition stratégique',
  croissance: 'Modèle de croissance',
  culture:    'Culture d\'entreprise',
  risque:     'Rapport au risque',
  horizon:    'Horizon temporel',
};

export const VISION_QUESTIONS: VisionQuestion[] = [
  // ── AMBITION STRATÉGIQUE ─────────────────────────────────────────────
  {
    id: 'A1',
    category: 'ambition',
    text: 'Dans 3 ans, quelle image souhaitez-vous que le marché ait de votre entreprise ?',
    options: [
      { value: 'leader_marche',   label: 'Le leader incontesté de notre secteur en Afrique',          archetype_hint: 'CONQUERANTE' },
      { value: 'innovateur_ref',  label: "La référence en matière d'innovation dans notre domaine",    archetype_hint: 'INNOVATRICE' },
      { value: 'operateur_fiable',label: 'L\'opérateur le plus fiable et solide du marché',            archetype_hint: 'CONSOLIDATRICE' },
      { value: 'agent_changement',label: 'L\'agent de transformation de notre industrie',              archetype_hint: 'TRANSFORMATRICE' },
      { value: 'institution_durable', label: 'Une institution durable qui traverse les générations',   archetype_hint: 'PERENNE' },
    ],
  },
  {
    id: 'A2',
    category: 'ambition',
    text: 'Votre principale mesure de succès pour les 5 prochaines années est :',
    options: [
      { value: 'parts_marche',    label: 'Conquérir des parts de marché significatives',               archetype_hint: 'CONQUERANTE' },
      { value: 'nb_innovations',  label: 'Lancer des produits/services vraiment nouveaux',             archetype_hint: 'INNOVATRICE' },
      { value: 'rentabilite',     label: 'Améliorer durablement nos marges et notre rentabilité',      archetype_hint: 'CONSOLIDATRICE' },
      { value: 'impact_ecosysteme',label: 'Transformer positivement notre secteur ou la société',     archetype_hint: 'TRANSFORMATRICE' },
      { value: 'perennite',       label: 'Assurer la pérennité et la transmission de l\'entreprise',  archetype_hint: 'PERENNE' },
    ],
  },
  {
    id: 'A3',
    category: 'ambition',
    text: 'Face à un concurrent qui vous attaque sur vos clients historiques, vous :',
    options: [
      { value: 'contre_attaque',  label: 'Contre-attaquez immédiatement sur son propre terrain',      archetype_hint: 'CONQUERANTE' },
      { value: 'innovez_offre',   label: 'Innovez votre offre pour la rendre incomparable',            archetype_hint: 'INNOVATRICE' },
      { value: 'fidelisez',       label: 'Renforcez la relation avec vos clients existants',           archetype_hint: 'CONSOLIDATRICE' },
      { value: 'pivotez',         label: 'Profitez de l\'occasion pour remettre en question votre modèle', archetype_hint: 'TRANSFORMATRICE' },
      { value: 'resistez',        label: 'Maintenez le cap sur vos fondamentaux qui ont fait vos succès', archetype_hint: 'PERENNE' },
    ],
  },
  {
    id: 'A4',
    category: 'ambition',
    text: 'Votre ambition géographique prioritaire sur 5 ans :',
    options: [
      { value: 'expansion_afrique',label: 'Dominer 3 pays africains supplémentaires',                 archetype_hint: 'CONQUERANTE' },
      { value: 'niche_globale',   label: 'Être reconnu globalement sur une niche spécifique',          archetype_hint: 'INNOVATRICE' },
      { value: 'consolider_local',label: 'Consolider solidement notre présence locale actuelle',      archetype_hint: 'CONSOLIDATRICE' },
      { value: 'nouveau_modele',  label: 'Exporter un nouveau modèle africain à l\'international',    archetype_hint: 'TRANSFORMATRICE' },
      { value: 'ancrage_local',   label: 'Approfondir notre ancrage dans notre communauté',            archetype_hint: 'PERENNE' },
    ],
  },
  {
    id: 'A5',
    category: 'ambition',
    text: 'Le recrutement que vous feriez en priorité si les ressources ne comptaient pas :',
    options: [
      { value: 'directeur_commercial', label: 'Un directeur commercial agressif pour ouvrir des marchés', archetype_hint: 'CONQUERANTE' },
      { value: 'chief_innovation',    label: 'Un Chief Innovation Officer venu d\'une startup',         archetype_hint: 'INNOVATRICE' },
      { value: 'directeur_ops',       label: 'Un directeur des opérations pour optimiser les process',  archetype_hint: 'CONSOLIDATRICE' },
      { value: 'chief_impact',        label: 'Un responsable impact et transformation',                 archetype_hint: 'TRANSFORMATRICE' },
      { value: 'directeur_heritage',  label: 'Un directeur en charge de la culture et du patrimoine',  archetype_hint: 'PERENNE' },
    ],
  },

  // ── MODÈLE DE CROISSANCE ─────────────────────────────────────────────
  {
    id: 'C1',
    category: 'croissance',
    text: 'Votre principale source de croissance dans les 3 prochaines années sera :',
    options: [
      { value: 'nouveaux_clients',  label: 'Conquérir massivement de nouveaux clients',               archetype_hint: 'CONQUERANTE' },
      { value: 'nouveaux_produits', label: 'Lancer de nouveaux produits ou services',                  archetype_hint: 'INNOVATRICE' },
      { value: 'upsell_base',       label: 'Mieux monétiser notre base de clients existants',          archetype_hint: 'CONSOLIDATRICE' },
      { value: 'nouveau_modele_eco',label: 'Créer un nouveau modèle économique',                       archetype_hint: 'TRANSFORMATRICE' },
      { value: 'organique_stable',  label: 'Croissance organique régulière et maîtrisée',              archetype_hint: 'PERENNE' },
    ],
  },
  {
    id: 'C2',
    category: 'croissance',
    text: 'Pour financer votre croissance, votre préférence va vers :',
    options: [
      { value: 'dette_agressive',  label: 'Leverage financier pour accélérer vite',                    archetype_hint: 'CONQUERANTE' },
      { value: 'capital_risque',   label: 'Levée de fonds auprès d\'investisseurs innovants',          archetype_hint: 'INNOVATRICE' },
      { value: 'autofinancement',  label: 'Autofinancement via nos marges opérationnelles',            archetype_hint: 'CONSOLIDATRICE' },
      { value: 'partenariat_impact', label: 'Partenariats à impact ou financement blended',            archetype_hint: 'TRANSFORMATRICE' },
      { value: 'reserves_solides', label: 'Maintenir des réserves solides pour traverser les crises',  archetype_hint: 'PERENNE' },
    ],
  },
  {
    id: 'C3',
    category: 'croissance',
    text: 'Concernant les acquisitions et partenariats, votre vision est :',
    options: [
      { value: 'acquisitions_offensives', label: 'Acquérir des concurrents pour accélérer la conquête', archetype_hint: 'CONQUERANTE' },
      { value: 'alliances_innovation',    label: 'Nouer des alliances pour co-innover',                 archetype_hint: 'INNOVATRICE' },
      { value: 'integration_verticale',  label: 'Intégrer verticalement pour maîtriser notre chaîne',  archetype_hint: 'CONSOLIDATRICE' },
      { value: 'ecosysteme_partage',      label: 'Construire un écosystème de valeur partagée',         archetype_hint: 'TRANSFORMATRICE' },
      { value: 'independance',            label: 'Rester indépendant pour garder notre âme',            archetype_hint: 'PERENNE' },
    ],
  },
  {
    id: 'C4',
    category: 'croissance',
    text: 'Votre approche du digital et de la technologie :',
    options: [
      { value: 'tech_arme',     label: 'La technologie est notre arme principale de conquête',         archetype_hint: 'CONQUERANTE' },
      { value: 'tech_coeur',    label: 'Nous construisons nos propres innovations technologiques',      archetype_hint: 'INNOVATRICE' },
      { value: 'tech_efficience', label: 'La technologie optimise nos opérations et réduit les coûts', archetype_hint: 'CONSOLIDATRICE' },
      { value: 'tech_transformation', label: 'La technologie transforme notre modèle d\'impact',       archetype_hint: 'TRANSFORMATRICE' },
      { value: 'tech_selective', label: 'On adopte la technologie prudemment, après validation',        archetype_hint: 'PERENNE' },
    ],
  },
  {
    id: 'C5',
    category: 'croissance',
    text: 'Votre critère n°1 pour prioriser un nouveau projet ou marché :',
    options: [
      { value: 'taille_marche',  label: 'La taille du marché potentiel',                               archetype_hint: 'CONQUERANTE' },
      { value: 'originalite',    label: 'Le degré de nouveauté et de différenciation',                  archetype_hint: 'INNOVATRICE' },
      { value: 'roi_certitude',  label: 'Le ROI prévisible et la sécurité du retour',                   archetype_hint: 'CONSOLIDATRICE' },
      { value: 'impact_mesurable', label: 'L\'impact social ou environnemental mesurable',              archetype_hint: 'TRANSFORMATRICE' },
      { value: 'coherence_valeurs', label: 'La cohérence avec nos valeurs fondatrices',                 archetype_hint: 'PERENNE' },
    ],
  },

  // ── CULTURE D'ENTREPRISE ─────────────────────────────────────────────
  {
    id: 'CU1',
    category: 'culture',
    text: 'La qualité que vous valorisez le plus chez un collaborateur :',
    options: [
      { value: 'combativite',    label: 'La combativité et la soif de résultats',                       archetype_hint: 'CONQUERANTE' },
      { value: 'creativite',     label: 'La créativité et la capacité à remettre en question',          archetype_hint: 'INNOVATRICE' },
      { value: 'rigueur',        label: 'La rigueur et l\'exécution impeccable',                        archetype_hint: 'CONSOLIDATRICE' },
      { value: 'vision_purpose', label: 'La vision et le sens du collectif',                            archetype_hint: 'TRANSFORMATRICE' },
      { value: 'fiabilite',      label: 'La fiabilité et l\'attachement aux valeurs',                   archetype_hint: 'PERENNE' },
    ],
  },
  {
    id: 'CU2',
    category: 'culture',
    text: 'Votre style de management idéal :',
    options: [
      { value: 'management_resultats', label: 'Management par les résultats — on est là pour gagner',  archetype_hint: 'CONQUERANTE' },
      { value: 'management_autonomie', label: 'Grande autonomie pour laisser émerger les idées',       archetype_hint: 'INNOVATRICE' },
      { value: 'management_process',   label: 'Management structuré avec des process clairs',          archetype_hint: 'CONSOLIDATRICE' },
      { value: 'management_mission',   label: 'Leadership par la mission et le sens',                  archetype_hint: 'TRANSFORMATRICE' },
      { value: 'management_mentor',    label: 'Mentorat et transmission du savoir-faire',               archetype_hint: 'PERENNE' },
    ],
  },
  {
    id: 'CU3',
    category: 'culture',
    text: 'Face à un échec important, la culture de votre entreprise vous pousse à :',
    options: [
      { value: 'rebondir_vite',  label: 'Analyser rapidement et repartir à l\'attaque',                archetype_hint: 'CONQUERANTE' },
      { value: 'experimenter',   label: 'Voir cela comme un apprentissage et pivoter',                  archetype_hint: 'INNOVATRICE' },
      { value: 'auditer',        label: 'Faire un audit rigoureux pour ne plus répéter',                archetype_hint: 'CONSOLIDATRICE' },
      { value: 'questionner',    label: 'Questionner en profondeur les causes systémiques',             archetype_hint: 'TRANSFORMATRICE' },
      { value: 'valoriser_resilience', label: 'Valoriser la résilience et tirer la leçon dans la durée', archetype_hint: 'PERENNE' },
    ],
  },
  {
    id: 'CU4',
    category: 'culture',
    text: 'La place de la culture africaine dans votre identité d\'entreprise :',
    options: [
      { value: 'avantage_concurrentiel', label: 'Un avantage concurrentiel pour conquérir le marché', archetype_hint: 'CONQUERANTE' },
      { value: 'source_innovation',      label: 'Une source d\'inspiration pour créer des solutions locales', archetype_hint: 'INNOVATRICE' },
      { value: 'code_confiance',         label: 'Un code de confiance avec nos clients et partenaires', archetype_hint: 'CONSOLIDATRICE' },
      { value: 'mission_identitaire',    label: 'Notre mission est de valoriser et moderniser ces valeurs', archetype_hint: 'TRANSFORMATRICE' },
      { value: 'heritage_fondateur',     label: 'Notre héritage fondateur que nous transmettons',      archetype_hint: 'PERENNE' },
    ],
  },
  {
    id: 'CU5',
    category: 'culture',
    text: 'Votre position sur la rémunération et les incentives :',
    options: [
      { value: 'variable_eleve',  label: 'Fort variable lié aux performances commerciales',            archetype_hint: 'CONQUERANTE' },
      { value: 'equity_innovation', label: 'Equity/stock-options pour récompenser l\'innovation',       archetype_hint: 'INNOVATRICE' },
      { value: 'salaire_stable',  label: 'Salaires compétitifs stables avec progression régulière',    archetype_hint: 'CONSOLIDATRICE' },
      { value: 'remuneration_impact', label: 'Rémunération liée à l\'impact et à la mission',          archetype_hint: 'TRANSFORMATRICE' },
      { value: 'fidelite_anciennete', label: 'Valorisation forte de la fidélité et de l\'ancienneté', archetype_hint: 'PERENNE' },
    ],
  },

  // ── RAPPORT AU RISQUE ─────────────────────────────────────────────────
  {
    id: 'R1',
    category: 'risque',
    text: 'Face à une opportunité à fort potentiel mais incertaine, vous :',
    options: [
      { value: 'foncez',         label: 'Vous foncez — les premiers gagnent tout',                     archetype_hint: 'CONQUERANTE' },
      { value: 'prototypez',     label: 'Lancez un prototype rapide pour tester',                       archetype_hint: 'INNOVATRICE' },
      { value: 'analysez',       label: 'Analysez rigoureusement avant de vous engager',               archetype_hint: 'CONSOLIDATRICE' },
      { value: 'federez',        label: 'Cherchez des partenaires pour partager le risque',             archetype_hint: 'TRANSFORMATRICE' },
      { value: 'observez',       label: 'Attendez que le marché valide avant d\'agir',                 archetype_hint: 'PERENNE' },
    ],
  },
  {
    id: 'R2',
    category: 'risque',
    text: 'Quel niveau d\'endettement vous semble acceptable pour saisir une opportunité ?',
    options: [
      { value: 'tres_eleve',     label: 'Jusqu\'à 70% de dette si le deal est gagnant',               archetype_hint: 'CONQUERANTE' },
      { value: 'eleve_structure',label: 'Financement structuré avec cap de risque défini',              archetype_hint: 'INNOVATRICE' },
      { value: 'modere',         label: 'Pas plus de 40-50% — on doit dormir tranquille',              archetype_hint: 'CONSOLIDATRICE' },
      { value: 'partage',        label: 'On préfère diluer que s\'endetter massivement',               archetype_hint: 'TRANSFORMATRICE' },
      { value: 'minimal',        label: 'Le moins de dette possible — l\'indépendance avant tout',     archetype_hint: 'PERENNE' },
    ],
  },
  {
    id: 'R3',
    category: 'risque',
    text: 'Un grand client représente 40% de votre CA. Vous :',
    options: [
      { value: 'opportunite',    label: 'Voyez cela comme une base pour en conquérir d\'autres pareils', archetype_hint: 'CONQUERANTE' },
      { value: 'diversifiez_produit', label: 'Diversifiez les produits proposés à ce client',           archetype_hint: 'INNOVATRICE' },
      { value: 'diversifiez_urgence', label: 'Diversifiez activement pour réduire cette dépendance',    archetype_hint: 'CONSOLIDATRICE' },
      { value: 'partenariat_strategique', label: 'Cherchez à transformer cette relation en partenariat stratégique', archetype_hint: 'TRANSFORMATRICE' },
      { value: 'relation_longue', label: 'Chérissez cette relation sur le long terme',                  archetype_hint: 'PERENNE' },
    ],
  },
  {
    id: 'R4',
    category: 'risque',
    text: 'Une crise sectorielle frappe votre marché. Votre réflexe :',
    options: [
      { value: 'rachat_faibles', label: 'Racheter les concurrents fragilisés à bas prix',              archetype_hint: 'CONQUERANTE' },
      { value: 'pivoter',        label: 'Pivoter vers un modèle alternatif',                            archetype_hint: 'INNOVATRICE' },
      { value: 'reduire_couts',  label: 'Réduire les coûts et sécuriser la trésorerie',                archetype_hint: 'CONSOLIDATRICE' },
      { value: 'federer_secteur',label: 'Fédérer les acteurs du secteur pour traverser ensemble',      archetype_hint: 'TRANSFORMATRICE' },
      { value: 'resister',       label: 'Tenir grâce à vos fondamentaux solides',                      archetype_hint: 'PERENNE' },
    ],
  },
  {
    id: 'R5',
    category: 'risque',
    text: 'Votre rapport à la réglementation et à la conformité :',
    options: [
      { value: 'contourner_vite', label: 'On avance et on régularise — move fast',                     archetype_hint: 'CONQUERANTE' },
      { value: 'anticiper',       label: 'On anticipe les régulations futures pour innover devant',     archetype_hint: 'INNOVATRICE' },
      { value: 'conformite_stricte', label: 'Conformité stricte — un audit ne doit trouver aucun écart', archetype_hint: 'CONSOLIDATRICE' },
      { value: 'influencer',      label: 'On participe à façonner les régulations pour le bien commun', archetype_hint: 'TRANSFORMATRICE' },
      { value: 'precaution',      label: 'Principe de précaution — on ne prend aucun risque légal',    archetype_hint: 'PERENNE' },
    ],
  },

  // ── HORIZON TEMPOREL ─────────────────────────────────────────────────
  {
    id: 'H1',
    category: 'horizon',
    text: 'Quand vous prenez une décision importante, votre horizon naturel est :',
    options: [
      { value: '12_18_mois',     label: '12-18 mois — on doit voir des résultats vite',               archetype_hint: 'CONQUERANTE' },
      { value: '2_3_ans',        label: '2-3 ans — le temps de valider une innovation',                archetype_hint: 'INNOVATRICE' },
      { value: '3_5_ans',        label: '3-5 ans — le temps de consolider un modèle solide',          archetype_hint: 'CONSOLIDATRICE' },
      { value: '5_10_ans',       label: '5-10 ans — le temps d\'une vraie transformation',            archetype_hint: 'TRANSFORMATRICE' },
      { value: 'generations',    label: 'Une génération ou plus — on construit pour nos enfants',     archetype_hint: 'PERENNE' },
    ],
  },
  {
    id: 'H2',
    category: 'horizon',
    text: 'Votre vision pour votre succession à la tête de l\'entreprise :',
    options: [
      { value: 'perpetuer_conquete', label: 'Quelqu\'un qui continuera à conquérir de nouveaux marchés', archetype_hint: 'CONQUERANTE' },
      { value: 'perpetuer_innovation', label: 'Quelqu\'un qui renouvellera perpétuellement le modèle', archetype_hint: 'INNOVATRICE' },
      { value: 'gestionnaire_solide', label: 'Un gestionnaire solide qui préservera ce qu\'on a bâti', archetype_hint: 'CONSOLIDATRICE' },
      { value: 'leader_transformateur', label: 'Un leader transformateur qui ira encore plus loin',   archetype_hint: 'TRANSFORMATRICE' },
      { value: 'gardien_valeurs',      label: 'Un gardien des valeurs fondatrices',                    archetype_hint: 'PERENNE' },
    ],
  },
  {
    id: 'H3',
    category: 'horizon',
    text: 'La place de l\'entreprise dans 20 ans dans votre vision :',
    options: [
      { value: 'multinationale',  label: 'Une multinationale africaine cotée en bourse',               archetype_hint: 'CONQUERANTE' },
      { value: 'ecosysteme_innovation', label: 'Un écosystème d\'innovation reconnu mondialement',    archetype_hint: 'INNOVATRICE' },
      { value: 'leader_sectoriel', label: 'Le leader de référence de notre secteur en Afrique',        archetype_hint: 'CONSOLIDATRICE' },
      { value: 'modele_africain',  label: 'Un modèle de développement africain exporté globalement',   archetype_hint: 'TRANSFORMATRICE' },
      { value: 'institution',      label: 'Une institution ancrée dans le tissu économique local',     archetype_hint: 'PERENNE' },
    ],
  },
  {
    id: 'H4',
    category: 'horizon',
    text: 'Concernant l\'impact social et environnemental, votre position :',
    options: [
      { value: 'rse_marketing',   label: 'La RSE est un levier de différenciation commerciale',        archetype_hint: 'CONQUERANTE' },
      { value: 'rse_innovation',  label: 'Les défis sociaux sont des opportunités d\'innovation',       archetype_hint: 'INNOVATRICE' },
      { value: 'rse_conformite',  label: 'On respecte les standards et on s\'y conforme',              archetype_hint: 'CONSOLIDATRICE' },
      { value: 'rse_mission',     label: 'L\'impact positif est au cœur de notre raison d\'être',      archetype_hint: 'TRANSFORMATRICE' },
      { value: 'rse_patrimoine',  label: 'On préserve notre environnement comme patrimoine à transmettre', archetype_hint: 'PERENNE' },
    ],
  },
  {
    id: 'H5',
    category: 'horizon',
    text: 'Si vous deviez résumer votre vision en un mot :',
    options: [
      { value: 'conquete',     label: 'Conquête',     archetype_hint: 'CONQUERANTE' },
      { value: 'creation',     label: 'Création',     archetype_hint: 'INNOVATRICE' },
      { value: 'excellence',   label: 'Excellence',   archetype_hint: 'CONSOLIDATRICE' },
      { value: 'impact',       label: 'Impact',       archetype_hint: 'TRANSFORMATRICE' },
      { value: 'perennite',    label: 'Pérennité',    archetype_hint: 'PERENNE' },
    ],
  },
];

// Calcule le score par archétype à partir des réponses
export function scoreResponsesByArchetype(
  responses: Record<string, string>
): Record<string, number> {
  const scores: Record<string, number> = {
    CONQUERANTE: 0, INNOVATRICE: 0, CONSOLIDATRICE: 0,
    TRANSFORMATRICE: 0, PERENNE: 0,
  };

  for (const question of VISION_QUESTIONS) {
    const chosen = responses[question.id];
    if (!chosen) continue;
    const option = question.options.find((o) => o.value === chosen);
    if (option) {
      scores[option.archetype_hint] = (scores[option.archetype_hint] ?? 0) + 1;
    }
  }

  return scores;
}

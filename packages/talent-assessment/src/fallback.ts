import type { ClientQuestion, StepConfig, StepId } from './types';

// Utilisée quand l'IA échoue deux fois : le candidat n'est jamais bloqué.
// optionsByRank suit valueLadder : [meilleure pratique, correcte mais incomplète,
// peu efficace, contre-productive mais tentante]. Toutes restent plausibles.
export interface FallbackEntry {
  text:          string;
  optionsByRank: readonly string[];
}

export const FALLBACK_BANKS: Record<StepId, Record<string, FallbackEntry>> = {
  soft: {
    communication: {
      text: 'Vous devez expliquer à un client non technicien pourquoi sa livraison aura deux semaines de retard.',
      optionsByRank: [
        'Vous l\'appelez : la cause en une phrase, l\'impact concret pour lui, la nouvelle date et ce que vous faites pour la tenir.',
        'Vous lui envoyez un email détaillé avec le planning révisé, les raisons du retard, et proposez un appel s\'il a des questions.',
        'Vous attendez d\'avoir une date certaine avant de le prévenir, pour ne pas l\'inquiéter inutilement.',
        'Vous lui transmettez l\'explication technique complète de l\'équipe pour qu\'il ait toute l\'information.',
      ],
    },
    leadership: {
      text: 'Votre équipe doit livrer un projet important, mais deux membres ne s\'entendent pas sur la méthode et le travail stagne.',
      optionsByRank: [
        'Vous les réunissez, faites expliciter l\'objectif et les critères de choix, tranchez avec eux et fixez un point de bilan.',
        'Vous choisissez vous-même la méthode qui vous semble la plus solide et l\'annoncez clairement à toute l\'équipe dès demain.',
        'Vous laissez chacun avancer avec sa méthode sur sa partie pour éviter le conflit.',
        'Vous signalez la situation à votre hiérarchie pour qu\'elle décide.',
      ],
    },
    adaptability: {
      text: 'Le matin d\'une présentation importante, on vous annonce que le public a changé : ce seront des décideurs, pas des techniciens.',
      optionsByRank: [
        'Vous recentrez la présentation sur les enjeux et les décisions attendues, le détail technique passe en annexe.',
        'Vous gardez votre support mais adaptez votre discours oral au fil de la présentation.',
        'Vous demandez à reporter la présentation de quelques jours pour la retravailler correctement pour ce nouveau public.',
        'Vous présentez comme prévu : le contenu reste valable quel que soit le public.',
      ],
    },
    problem_solving: {
      text: 'Les ventes d\'un produit ont chuté de 30 % depuis un mois, sans cause évidente.',
      optionsByRank: [
        'Vous découpez les données par zone, canal et période pour isoler où se concentre la baisse avant d\'agir.',
        'Vous interrogez plusieurs clients et commerciaux de terrain pour recueillir leurs explications avant d\'agir.',
        'Vous lancez une promotion pour relancer rapidement les ventes.',
        'Vous attendez le mois suivant pour voir si la tendance se confirme.',
      ],
    },
    critical_thinking: {
      text: 'Un collègue présente une étude selon laquelle un nouvel outil a doublé la productivité d\'une entreprise similaire, et propose de l\'adopter.',
      optionsByRank: [
        'Vous demandez comment la productivité a été mesurée, sur quelle durée, et ce qui a changé en même temps.',
        'Vous proposez de le tester d\'abord sur une petite équipe.',
        'Vous cherchez d\'autres avis d\'utilisateurs en ligne.',
        'Vous soutenez l\'adoption : l\'entreprise est comparable, l\'étude est récente et le gain annoncé est très net.',
      ],
    },
    collaboration: {
      text: 'Un collègue d\'un autre service vous demande de l\'aide sur un dossier alors que vous êtes vous-même très chargé(e).',
      optionsByRank: [
        'Vous clarifiez son besoin et son échéance, puis proposez un créneau réaliste ou une personne mieux placée.',
        'Vous l\'aidez tout de suite, quitte à finir votre propre travail tard le soir.',
        'Vous lui envoyez quelques documents utiles sur le sujet et lui dites de revenir vers vous s\'il reste bloqué.',
        'Vous lui expliquez que ce n\'est pas votre périmètre.',
      ],
    },
    stress_mgmt: {
      text: 'Trois urgences arrivent en même temps, une heure avant la fin de la journée.',
      optionsByRank: [
        'Vous évaluez l\'impact réel de chacune, traitez la plus critique et prévenez les autres demandeurs d\'un délai.',
        'Vous commencez par la plus rapide à traiter pour en libérer une tout de suite, puis vous enchaînez sur les deux autres.',
        'Vous avancez sur les trois en parallèle pour ne délaisser personne.',
        'Vous restez tard pour tout terminer, sans prévenir personne.',
      ],
    },
    organization: {
      text: 'En début de semaine, vous avez douze tâches de tailles et d\'échéances différentes.',
      optionsByRank: [
        'Vous les classez par échéance et impact, bloquez des créneaux pour les plus lourdes et regroupez les petites.',
        'Vous faites une liste complète de toutes les tâches et avancez dans l\'ordre d\'arrivée des différentes demandes.',
        'Vous commencez par les plus faciles pour prendre de l\'élan.',
        'Vous traitez chaque tâche au moment où l\'on vous relance.',
      ],
    },
    learning_speed: {
      text: 'Vous devez utiliser dans dix jours un logiciel que vous ne connaissez pas.',
      optionsByRank: [
        'Vous ciblez les fonctions dont vous aurez besoin, les pratiquez sur un cas réel et faites relire par un utilisateur aguerri.',
        'Vous suivez une formation en ligne complète sur le logiciel, du premier module jusqu\'à l\'évaluation finale proposée.',
        'Vous lisez la documentation officielle de bout en bout.',
        'Vous comptez apprendre sur le tas le jour venu.',
      ],
    },
    emotional_intel: {
      text: 'En réunion, un collègue d\'habitude impliqué reste silencieux et semble contrarié après une remarque du manager.',
      optionsByRank: [
        'Après la réunion, vous allez le voir en privé pour lui demander comment il va, sans insister.',
        'Pendant la réunion, vous lui demandez son avis pour le réintégrer dans la discussion.',
        'Vous en parlez au manager pour qu\'il soit au courant.',
        'Vous ne dites rien : cela ne vous regarde pas.',
      ],
    },
  },
  // Étapes factuelles : optionsByRank va de la situation la plus favorable à la
  // plus préoccupante. « Travail » = emploi actuel ou dernière expérience.
  life: {
    fulfillment: {
      text: 'Au cours des 4 dernières semaines, combien de vos journées de travail vous ont laissé un sentiment d\'accomplissement ?',
      optionsByRank: ['La plupart', 'Environ la moitié', 'Quelques-unes', 'Presque aucune'],
    },
    values_alignment: {
      text: 'Au cours des 3 derniers mois, combien de fois vous a-t-on demandé de faire quelque chose qui allait contre vos principes professionnels ?',
      optionsByRank: ['Jamais', 'Une fois', '2 à 3 fois', 'Plus de 3 fois'],
    },
    work_life_balance: {
      text: 'Au cours des 2 dernières semaines, combien de soirées ou de jours de week-end avez-vous consacrés au travail en dehors de vos horaires ?',
      optionsByRank: ['Aucun', '1 ou 2', '3 à 5', 'Plus de 5'],
    },
    health: {
      text: 'Au cours des 4 dernières semaines, combien de nuits avez-vous mal dormi à cause du travail ?',
      optionsByRank: ['Aucune', '1 à 3', '4 à 8', 'Plus de 8'],
    },
    outside_activities: {
      text: 'Au cours des 2 dernières semaines, combien de fois avez-vous pratiqué une activité qui vous ressource (sport, famille, art, engagement associatif…) ?',
      optionsByRank: ['Plus de 4 fois', '3 ou 4 fois', '1 ou 2 fois', 'Aucune'],
    },
    optimism: {
      text: 'En pensant à votre situation professionnelle dans un an, quelle phrase décrit le mieux ce que vous avez concrètement prévu ?',
      optionsByRank: [
        'J\'ai un objectif précis et des actions déjà engagées',
        'J\'ai un objectif précis mais rien d\'engagé pour l\'instant',
        'J\'ai quelques idées, sans objectif clair',
        'Je n\'arrive pas à me projeter',
      ],
    },
  },
  risk: {
    overload: {
      text: 'Au cours des 4 dernières semaines, combien de fois avez-vous dû reporter ou bâcler une tâche faute de temps ?',
      optionsByRank: ['Jamais', '1 ou 2 fois', 'Chaque semaine', 'Presque tous les jours'],
    },
    disconnection: {
      text: 'La semaine dernière, combien de fois avez-vous consulté vos messages professionnels le soir, le week-end ou en congé ?',
      optionsByRank: ['Jamais', '1 ou 2 fois', '3 à 6 fois', 'Plus souvent'],
    },
    meaning_recognition: {
      text: 'Au cours des 3 derniers mois, combien de fois votre travail a-t-il été reconnu explicitement (remerciement, retour positif, mise en avant) ?',
      optionsByRank: ['Plus de 5 fois', '3 à 5 fois', '1 ou 2 fois', 'Jamais'],
    },
    conflicts: {
      text: 'Au cours du dernier mois, combien de désaccords avec un collègue ou un supérieur sont restés sans solution ?',
      optionsByRank: ['Aucun', 'Un', 'Deux ou trois', 'Plus de trois'],
    },
  },
  // Compétences techniques : impossible d'écrire à l'avance des questions justes
  // pour n'importe quelle compétence. En cas d'échec IA, le candidat réessaie.
  hard: {},
  // Expérience : questions propres au métier déclaré, même logique.
  exp: {},
};

// Étapes sans banque de secours : questions propres au CV du candidat, générées
// puis vérifiées par IA. En cas d'échec, le candidat réessaie.
export const AI_ONLY_STEPS: readonly StepId[] = ['hard', 'exp'];

export function buildFallbackQuestion(
  config: StepConfig,
  facet: string,
  optionValues: Record<string, number>,
): ClientQuestion | null {
  const entry = FALLBACK_BANKS[config.step][facet];
  if (!entry) return null;
  const options = Object.keys(optionValues).sort().map(key => {
    const rank = config.valueLadder.indexOf(optionValues[key]!);
    return { key, text: entry.optionsByRank[rank] ?? '' };
  });
  if (options.some(o => !o.text)) return null;
  return { questionText: entry.text, options };
}

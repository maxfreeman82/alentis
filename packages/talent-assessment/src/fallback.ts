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
        'Vous lui envoyez un email détaillé avec le planning révisé et proposez un appel s\'il a des questions.',
        'Vous attendez d\'avoir une date certaine avant de le prévenir, pour ne pas l\'inquiéter inutilement.',
        'Vous lui transmettez l\'explication technique complète de l\'équipe pour qu\'il ait toute l\'information.',
      ],
    },
    leadership: {
      text: 'Votre équipe doit livrer un projet important, mais deux membres ne s\'entendent pas sur la méthode et le travail stagne.',
      optionsByRank: [
        'Vous les réunissez, faites expliciter l\'objectif commun et les critères de choix, tranchez avec eux et fixez un point de bilan.',
        'Vous choisissez la méthode qui vous semble la meilleure et l\'annoncez clairement à l\'équipe.',
        'Vous laissez chacun avancer avec sa méthode sur sa partie pour éviter le conflit.',
        'Vous signalez la situation à votre hiérarchie pour qu\'elle décide.',
      ],
    },
    adaptability: {
      text: 'Le matin d\'une présentation importante, on vous annonce que le public a changé : ce seront des décideurs, pas des techniciens.',
      optionsByRank: [
        'Vous recentrez la présentation sur les enjeux et les décisions attendues, et gardez le détail technique en annexe.',
        'Vous gardez votre support mais adaptez votre discours oral au fil de la présentation.',
        'Vous demandez à reporter la présentation pour la retravailler correctement.',
        'Vous présentez comme prévu : le contenu reste valable quel que soit le public.',
      ],
    },
    problem_solving: {
      text: 'Les ventes d\'un produit ont chuté de 30 % depuis un mois, sans cause évidente.',
      optionsByRank: [
        'Vous découpez les données par zone, canal et période pour isoler où la baisse se concentre avant de proposer une action.',
        'Vous interrogez quelques clients et commerciaux pour recueillir leurs explications.',
        'Vous lancez une promotion pour relancer rapidement les ventes.',
        'Vous attendez le mois suivant pour voir si la tendance se confirme.',
      ],
    },
    critical_thinking: {
      text: 'Un collègue présente une étude selon laquelle un nouvel outil a doublé la productivité d\'une entreprise similaire, et propose de l\'adopter.',
      optionsByRank: [
        'Vous demandez comment la productivité a été mesurée, sur quelle durée, et si d\'autres changements ont eu lieu en même temps.',
        'Vous proposez de le tester d\'abord sur une petite équipe.',
        'Vous cherchez d\'autres avis d\'utilisateurs en ligne.',
        'Vous soutenez l\'adoption : l\'entreprise est comparable et le gain est net.',
      ],
    },
    collaboration: {
      text: 'Un collègue d\'un autre service vous demande de l\'aide sur un dossier alors que vous êtes vous-même très chargé(e).',
      optionsByRank: [
        'Vous clarifiez son besoin et son échéance, puis proposez un créneau réaliste ou une personne mieux placée.',
        'Vous l\'aidez tout de suite, quitte à finir votre propre travail tard le soir.',
        'Vous lui envoyez quelques documents utiles et lui dites de revenir vers vous si besoin.',
        'Vous lui expliquez que ce n\'est pas votre périmètre.',
      ],
    },
    stress_mgmt: {
      text: 'Trois urgences arrivent en même temps, une heure avant la fin de la journée.',
      optionsByRank: [
        'Vous évaluez l\'impact et l\'échéance réelle de chacune, traitez la plus critique et prévenez les autres demandeurs avec un délai.',
        'Vous commencez par la plus rapide pour en libérer une, puis enchaînez.',
        'Vous avancez sur les trois en parallèle pour ne délaisser personne.',
        'Vous restez tard pour tout terminer, sans prévenir personne.',
      ],
    },
    organization: {
      text: 'En début de semaine, vous avez douze tâches de tailles et d\'échéances différentes.',
      optionsByRank: [
        'Vous les classez par échéance et impact, bloquez des créneaux pour les plus importantes et regroupez les petites.',
        'Vous faites une liste et avancez dans l\'ordre d\'arrivée des demandes.',
        'Vous commencez par les plus faciles pour prendre de l\'élan.',
        'Vous traitez chaque tâche au moment où l\'on vous relance.',
      ],
    },
    learning_speed: {
      text: 'Vous devez utiliser dans dix jours un logiciel que vous ne connaissez pas.',
      optionsByRank: [
        'Vous identifiez les quelques fonctions dont vous aurez besoin, les pratiquez sur un cas réel et demandez un retour à un utilisateur expérimenté.',
        'Vous suivez une formation en ligne complète sur le logiciel.',
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
};

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

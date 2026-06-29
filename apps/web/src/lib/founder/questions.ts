// 10 questions comportementales — Boussole Fondateur
// L'archétype est RÉVÉLÉ, jamais choisi. Questions situationnelles, pas déclaratives.

export type FounderFamily = 'BATISSEUR' | 'PIONNIER' | 'ARTISAN' | 'CATALYSEUR' | 'GARDIEN';

export interface FounderOption {
  value: 'A' | 'B' | 'C' | 'D' | 'E';
  text:  string;
  family: FounderFamily;
}

export interface FounderQuestion {
  id:      string;
  text:    string;
  options: FounderOption[];
}

export const FOUNDER_QUESTIONS: FounderQuestion[] = [
  {
    id: 'F01',
    text: 'Vous avez 6 mois de trésorerie. Une opportunité risquée mais prometteuse apparaît. Vous :',
    options: [
      { value: 'A', text: 'Analysez les risques en détail avant toute décision',     family: 'BATISSEUR'  },
      { value: 'B', text: 'Foncez — les premières places sont rares',                family: 'PIONNIER'   },
      { value: 'C', text: 'Vérifiez si ça correspond à votre cœur de métier',        family: 'ARTISAN'    },
      { value: 'D', text: 'En parlez à votre réseau pour avoir d\'autres avis',      family: 'CATALYSEUR' },
      { value: 'E', text: 'Évaluez l\'impact à long terme sur votre vision',         family: 'GARDIEN'    },
    ],
  },
  {
    id: 'F02',
    text: 'Votre premier client est insatisfait. Votre réflexe immédiat :',
    options: [
      { value: 'A', text: 'Analyser ce qui a mal fonctionné et corriger le processus', family: 'BATISSEUR'  },
      { value: 'B', text: 'Proposer une solution innovante hors du cadre habituel',    family: 'PIONNIER'   },
      { value: 'C', text: 'Refaire le travail jusqu\'à ce que ce soit parfait',        family: 'ARTISAN'    },
      { value: 'D', text: 'Le rencontrer pour comprendre et réparer la relation',      family: 'CATALYSEUR' },
      { value: 'E', text: 'Honorer votre engagement quoi qu\'il en coûte',             family: 'GARDIEN'    },
    ],
  },
  {
    id: 'F03',
    text: 'Dans 5 ans, la réussite de votre entreprise ressemble à :',
    options: [
      { value: 'A', text: 'Une structure solide, rentable et bien organisée',        family: 'BATISSEUR'  },
      { value: 'B', text: 'Un marché que vous avez créé ou transformé',              family: 'PIONNIER'   },
      { value: 'C', text: 'Une référence de qualité reconnue dans votre secteur',    family: 'ARTISAN'    },
      { value: 'D', text: 'Une équipe soudée qui a changé des vies',                 family: 'CATALYSEUR' },
      { value: 'E', text: 'Un héritage durable que vous pouvez transmettre',         family: 'GARDIEN'    },
    ],
  },
  {
    id: 'F04',
    text: 'Vous recevez un premier investissement. Votre première décision :',
    options: [
      { value: 'A', text: 'Structurer les processus et sécuriser les fondations',   family: 'BATISSEUR'  },
      { value: 'B', text: 'Tester un nouveau marché ou un nouveau produit',          family: 'PIONNIER'   },
      { value: 'C', text: 'Améliorer la qualité de votre offre principale',          family: 'ARTISAN'    },
      { value: 'D', text: 'Recruter les bonnes personnes autour de vous',            family: 'CATALYSEUR' },
      { value: 'E', text: 'Renforcer votre impact social et vos valeurs',            family: 'GARDIEN'    },
    ],
  },
  {
    id: 'F05',
    text: 'Vous devez choisir entre deux associés potentiels. Lequel choisissez-vous ?',
    options: [
      { value: 'A', text: 'Celui qui gère les finances et les opérations',           family: 'BATISSEUR'  },
      { value: 'B', text: 'Celui qui ouvre des portes et pense différemment',        family: 'PIONNIER'   },
      { value: 'C', text: 'Celui qui partage votre exigence de qualité',             family: 'ARTISAN'    },
      { value: 'D', text: 'Celui qui sait fédérer et motiver des équipes',           family: 'CATALYSEUR' },
      { value: 'E', text: 'Celui qui partage vos valeurs profondes',                 family: 'GARDIEN'    },
    ],
  },
  {
    id: 'F06',
    text: 'Une semaine idéale dans votre entreprise, vous passez la majorité du temps à :',
    options: [
      { value: 'A', text: 'Planifier, organiser, optimiser les processus',           family: 'BATISSEUR'  },
      { value: 'B', text: 'Explorer, tester, rencontrer des acteurs du marché',      family: 'PIONNIER'   },
      { value: 'C', text: 'Produire, créer, affiner votre offre',                    family: 'ARTISAN'    },
      { value: 'D', text: 'Animer, motiver, développer vos équipes',                 family: 'CATALYSEUR' },
      { value: 'E', text: 'Réfléchir à l\'impact long terme de vos décisions',       family: 'GARDIEN'    },
    ],
  },
  {
    id: 'F07',
    text: 'Votre entreprise traverse une période difficile. Vous :',
    options: [
      { value: 'A', text: 'Coupez les coûts et sécurisez la trésorerie',             family: 'BATISSEUR'  },
      { value: 'B', text: 'Cherchez un nouveau modèle ou un nouveau marché',         family: 'PIONNIER'   },
      { value: 'C', text: 'Recentrez sur ce que vous faites vraiment bien',          family: 'ARTISAN'    },
      { value: 'D', text: 'Mobilisez l\'équipe autour d\'un projet commun',          family: 'CATALYSEUR' },
      { value: 'E', text: 'Restez fidèle à vos engagements même sous pression',      family: 'GARDIEN'    },
    ],
  },
  {
    id: 'F08',
    text: 'Ce qui vous motive profondément chaque matin c\'est :',
    options: [
      { value: 'A', text: 'Voir l\'organisation grandir et se structurer',           family: 'BATISSEUR'  },
      { value: 'B', text: 'Le sentiment d\'explorer quelque chose de nouveau',       family: 'PIONNIER'   },
      { value: 'C', text: 'La fierté d\'un travail bien fait',                       family: 'ARTISAN'    },
      { value: 'D', text: 'Le contact avec les personnes de l\'équipe et les clients', family: 'CATALYSEUR' },
      { value: 'E', text: 'Contribuer à quelque chose de plus grand que vous',       family: 'GARDIEN'    },
    ],
  },
  {
    id: 'F09',
    text: 'Face à une décision stratégique majeure, vous faites confiance à :',
    options: [
      { value: 'A', text: 'L\'analyse des données et des faits',                     family: 'BATISSEUR'  },
      { value: 'B', text: 'Votre intuition et votre lecture du marché',              family: 'PIONNIER'   },
      { value: 'C', text: 'Votre expertise et votre expérience terrain',             family: 'ARTISAN'    },
      { value: 'D', text: 'Le consensus de votre équipe et de vos proches',          family: 'CATALYSEUR' },
      { value: 'E', text: 'Vos valeurs et votre vision à long terme',                family: 'GARDIEN'    },
    ],
  },
  {
    id: 'F10',
    text: 'Dans 20 ans, vous voulez qu\'on dise de votre entreprise :',
    options: [
      { value: 'A', text: 'Elle a bâti quelque chose de solide et de durable',       family: 'BATISSEUR'  },
      { value: 'B', text: 'Elle a changé les règles du jeu dans son secteur',        family: 'PIONNIER'   },
      { value: 'C', text: 'Elle a toujours fait les choses à la perfection',         family: 'ARTISAN'    },
      { value: 'D', text: 'Elle a révélé et développé des talents extraordinaires',  family: 'CATALYSEUR' },
      { value: 'E', text: 'Elle a eu un impact réel sur la société africaine',       family: 'GARDIEN'    },
    ],
  },
];

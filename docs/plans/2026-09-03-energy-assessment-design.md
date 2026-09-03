# Energy Assessment Adaptatif — Design (tranche 1)

Source : `Teranga_HR_Assessment_IA_PRD.md`. Cette tranche couvre uniquement l'**Energy Assessment** (référentiel + moteur adaptatif + génération IA + restitution candidat). Hors périmètre : Technical Assessment, Target Energy / Energy Alignment recruteur, questions d'entretien générées, branchement dans l'onboarding existant.

## Contexte / audit préalable

Le modèle actuel (`lib/talent/assessment.ts`, `lib/passport/assessment.ts`) est un score composite 6D (H/S/X/L/E/R) statique, avec l'énergie noyée à 20% dans un score global. Deux banques de questions statiques et redondantes coexistent déjà, aucune n'est adaptative ni pilotée par IA. Le score recruteur ("Score 6D", `ScoreCircle`) affiche un pourcentage numérique — pratique que le PRD interdit pour l'Energy Alignment, mais hors périmètre ici puisqu'on ne touche pas au recrutement dans cette tranche.

Décision de périmètre : nouveau module **autonome**, non branché à l'onboarding ni au score 6D existant. Rien d'existant n'est modifié dans cette tranche — risque de régression nul sur le parcours obligatoire (Accueil→Choix du profil→Inscription→Connexion→Vérification Email→Onboarding→Dashboard) et sur la séparation des 4 espaces.

## Architecture

Répartition stricte code déterministe / IA (conforme à la règle PRD §9 : *"Le LLM ne doit jamais inventer librement... les dimensions mesurées"*) :

- Le moteur (TypeScript, pur, testable) décide seul : phase courante, dimension/hypothèse à tester ensuite, quand conclure, calcul de confiance/preuve.
- Claude (server-side, `lib/ai.ts`) est appelé uniquement pour rédiger le texte de la question et des options, à partir d'une consigne où `dimension_tested` et `energy_signals` sont déjà fixés par le moteur.
- La réponse IA est validée contre un schéma avant persistance (chaque option doit référencer un des 5 codes déjà décidés) ; en cas d'échec, un retry puis un template de secours — jamais de question non conforme envoyée au candidat.

## Référentiel

`lib/energy-assessment/referentiel.ts` — 5 dimensions stables et versionnées (`ENERGY_REF_V1`) :

| Code | Nom | Définition |
|---|---|---|
| P | Pilote | Donne une direction, arbitre, décide, réduit l'incertitude par l'orientation |
| I | Initialiseur | Imagine, explore, ouvre des possibilités, teste, initie |
| D | Dynamiseur | Mobilise, connecte, crée de l'adhésion, fait circuler l'énergie collective |
| A | Accomplisseur | Transforme objectifs/idées en actions, exécution, résultats |
| R | Régulateur | Analyse, structure, sécurise, fiabilise, prévient les risques |

Figées en code, jamais modifiables par l'IA. Dimensions comportementales transverses (incertitude, pression, changement, collectif, décision, exécution, innovation, risque, autonomie, résolution de problème) listées en constante à part.

## Données

Deux nouvelles tables, indépendantes de `talent_passports` / `assessment_sessions` :

**`energy_assessments`** (une ligne par passation)
- `id` uuid PK
- `profile_id` uuid FK → profiles, NOT NULL
- `assessment_route` text (`job_application` | `target_role` | `exploration`)
- `job_reference_id` uuid nullable
- `candidate_context_snapshot` jsonb — métier, secteur, niveau ; jamais photo/sexe/âge/origine/nom (PRD §24)
- `status` text (`in_progress` | `completed`)
- `dominant_energy` text nullable
- `secondary_energies` jsonb nullable
- `confidence_state` jsonb — interne, jamais exposé au candidat
- `profile_interpretation` text nullable
- `reference_version` text default `ENERGY_REF_V1`
- `inference_version` text default `ENGINE_V1`
- `created_at`, `updated_at` timestamptz

**`energy_assessment_questions`** (une ligne par question posée)
- `id` uuid PK
- `assessment_id` uuid FK → energy_assessments, NOT NULL
- `phase` text (`exploration` | `discrimination` | `confirmation`)
- `question_text` text
- `question_format` text (`forced_choice` | `arbitration` | `free_text` | `confirmation`)
- `dimension_tested` text
- `energy_signals` jsonb — mapping option → code energy, fixé par le moteur avant l'appel IA
- `hypothesis_tested` text nullable
- `candidate_answer` jsonb nullable
- `response_timestamp` timestamptz nullable

RLS : lecture/écriture restreinte à `profile_id = auth.uid()` (même politique que `talent_passports`).

## Moteur adaptatif

`lib/energy-assessment/engine.ts` — fonction pure `decideNextStep(state)` :

- Entrée : historique des questions/réponses de la passation.
- Sortie : soit `{ action: 'ask', phase, dimension_tested, hypothesis_tested, energy_signals }`, soit `{ action: 'conclude', dominant, secondary, confidence }`.

Règles :
- Phase **Exploration** : couvrir les 5 énergies dans des contextes différents avant toute hypothèse.
- Phase **Discrimination** : générée dès que deux hypothèses sont proches (ex. Accomplisseur vs Pilote).
- Phase **Confirmation** : retester la dominante supposée dans un contexte différent avant de conclure.
- Ne jamais conclure après seulement quelques réponses similaires ; exiger observation dans ≥2 contextes indépendants.
- Fourchette pilote : 12 à 20 questions ; seuils de confiance/arrêt posés comme constantes ajustables (non validés psychométriquement à ce stade — le PRD le précise explicitement).
- Profil hybride autorisé si deux énergies restent proches et bien étayées.

## Génération IA

Nouvelle fonction dans `lib/ai.ts`, suit le pattern existant (server-side uniquement, modèle `claude-sonnet-4-6`, JSON strict) :

```
generateEnergyQuestion(context_snapshot, phase, dimension_tested, hypothesis_tested, energy_signals)
  → { question_text, question_format, options: [{ text, energy_code }] }
```

Consigne système stricte : rédiger uniquement le texte/les options dans le cadre imposé, ne jamais introduire de dimension ou de mapping non fourni. Réponse validée par schéma avant toute persistance.

## Restitution candidat

Nouvelle page autonome (route à déterminer dans le routing existant, ex. `/passport/evaluations/energy-adaptive`), non branchée à l'onboarding. Écran final dans l'esprit "révélation" déjà utilisé pour le Passport : dominante + influence + complémentaire éventuelle. Aucun pourcentage affiché au candidat.

## Routes API

- `POST /api/energy-assessment/start` — crée la session, calcule et génère la première question.
- `POST /api/energy-assessment/answer` — enregistre la réponse à la question courante, appelle `decideNextStep`, retourne soit la question suivante (générée à la volée), soit le profil final.

Protection : `profile_id` du candidat authentifié uniquement (RLS + vérification serveur), même pattern que les autres routes `/api/talent/*`.

## Hors périmètre (tranche 1)

- Technical Assessment
- Target Energy / Energy Alignment côté recruteur
- Questions d'entretien générées automatiquement
- Branchement dans l'onboarding talent existant
- Remplacement du score "Score 6D" affiché au recruteur

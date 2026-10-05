# Questionnaire Talent Passport 6D entièrement adaptatif — Design

Suite de `2026-09-20-assessment-energy-wiring-design.md` (tranche 1 de 4 : énergie branchée, livrée). Ce document **remplace** les tranches 2 à 4 de ce plan, avec un changement de décision : **l'Expérience n'est plus déclarative**.

## Problème

Hors « Profil énergétique », `/assessment` reste une auto-évaluation Likert statique (`lib/talent/assessment.ts`). Le candidat peut gonfler ses réponses (« Maître reconnu », « > 10 ans ») sans aucune preuve, ou se sentir jugé par des formulations transparentes. De plus le client envoie lui-même les scores 1→5 à `/api/talent/assessment` : un `{"H1":5,…}` forgé passe la validation.

Objectif : chaque étape mesure par des questions adaptatives générées, dont la grille de score reste côté serveur.

## Décisions actées

1. **Approche A** : un moteur adaptatif générique (nouveau package `@teranga/talent-assessment`) configuré par étape, une paire de routes, deux tables. Le moteur énergie (`@teranga/energy-assessment`) reste inchangé.
2. **CV obligatoire** en tête du parcours (réutilise `/api/talent/cv`). Base des étapes Compétences et Expérience.
3. **Expérience = CV + questions de preuve** : `score_exp` = faits du CV × crédibilité mesurée ; badge `declared` / `corroborated`.
4. Règle PRD §9 conservée : le moteur décide facette, difficulté et valeurs des options ; l'IA ne rédige que le texte.

## Principe de mesure

Chaque question cible une **facette** ; chaque option porte une **valeur cachée ∈ [0,1]** fixée par le moteur avant l'appel IA, jamais envoyée au client.

| Étape | Facettes | Format | Valeur d'une option |
|---|---|---|---|
| `hard` — Compétences techniques | compétences extraites du CV (max 5 testées) | QCM / mini-cas, difficulté 1→5 | 1 si correcte, 0 sinon |
| `soft` — Soft Skills | les 10 colonnes `soft_*` (communication, leadership, adaptability, problem_solving, critical_thinking, collaboration, stress_mgmt, organization, learning_speed, emotional_intel) | SJT, 4 réactions plausibles | efficacité selon grille experte : 1 / 0.66 / 0.33 / 0 |
| `exp` — Expérience | affirmations du CV : années, management, secteur, complexité projets | question de terrain liée à l'affirmation | cohérence avec l'expérience déclarée : 1 / 0.5 / 0 |
| `life` — Life Score | épanouissement, alignement valeurs, équilibre, santé, activités hors travail, optimisme | faits concrets récents (fréquences) | position sur l'échelle de bien-être |
| `risk` — Risques & bien-être | surcharge, déconnexion, sens/reconnaissance, conflits | faits concrets récents | position sur l'échelle de risque (1 = risque max) |

### Moteur — `decideNextStep(stepConfig, answered)`

Fonction pure. Trois phases :
1. **Exploration** : chaque facette au moins une fois.
2. **Approfondissement** : facette la plus incertaine (peu de réponses ou variance élevée). En `hard`, difficulté +1 après réponse juste, −1 après réponse fausse (bornée 1–5).
3. **Arrêt** : chaque facette a atteint son minimum de preuves et une variance sous seuil, ou plafond atteint (`forced: true`).

Bornes par étape (constantes ajustables, non validées psychométriquement) :

| Étape | Min | Max |
|---|---|---|
| soft | 10 | 16 |
| hard | 8 | 14 |
| exp | 5 | 8 |
| life | 5 | 8 |
| risk | 5 | 8 |

Sortie `conclude` : score 0–100 par facette + score d'étape. `hard` : niveau 1–5 par compétence = difficulté maximale réussie de façon stable. `exp` : crédibilité 0–1.

### Intégrité

`response_ms` stocké par question ; temps extrêmes et incohérences (paires miroir de `lib/assessment/integrity.ts`) → `integrity_flags`. Signaler, jamais bloquer.

### Données sensibles

`life` / `risk` touchent la santé (loi sénégalaise 2008-12, CDP). L'employeur ne voit que les agrégats (`score_life`, `score_risk`), jamais les réponses détaillées.

## Données — migration `008_talent_adaptive_assessment.sql`

**`talent_assessment_sessions`**
- `id` uuid PK, `profile_id` uuid FK → profiles NOT NULL
- `step` text CHECK IN (`hard`,`soft`,`exp`,`life`,`risk`)
- `status` text (`in_progress` | `completed`)
- `context_snapshot` jsonb — poste, secteur, années, compétences CV ; jamais nom/âge/sexe/origine
- `result` jsonb nullable — scores par facette, interne
- `integrity_flags` jsonb default `[]`
- `engine_version` text default `TALENT_ENGINE_V1`
- `created_at`, `updated_at`
- Index unique partiel : une session `in_progress` par (`profile_id`, `step`)

**`talent_assessment_questions`**
- `id` uuid PK, `session_id` uuid FK NOT NULL
- `phase`, `facet`, `difficulty` smallint nullable
- `question_text`, `option_labels` jsonb (`[{key,text}]`)
- `option_values` jsonb — **jamais renvoyé au client**
- `candidate_answer` text nullable, `response_ms` integer nullable, `ai_generated` boolean
- `created_at`
- Index unique partiel : une question `candidate_answer IS NULL` par session

RLS : lecture restreinte au propriétaire via `profiles.user_id = auth.uid()` (pattern des migrations 006/007). Écritures uniquement via routes serveur (admin client).

**`talent_passports.exp_verification`** text CHECK IN (`declared`,`corroborated`) default `declared`.

## Routes

- `POST /api/talent-assessment/start { step }` — reprise si session en cours, sinon création + 1re question.
- `POST /api/talent-assessment/answer { sessionId, questionId, answerKey, responseMs }` — enregistre, décide, renvoie la question suivante ou `{ done: true }`.

Reprend les protections de `/api/energy-assessment/*` : vérification propriétaire (admin client bypass RLS), garde `.is('candidate_answer', null)` contre double-submit, chemin retry idempotent après échec IA, repli sur `23505`.

Clés d'options opaques (`k1`–`k4`) assignées aléatoirement par le moteur : la position ne trahit pas la valeur.

## Génération IA

`generateAdaptiveQuestion(step, facet, difficulty, optionValues, context)` dans `lib/ai.ts`, via `callAI`. Prompt par étape ; `<candidate_context>` traité comme donnée, jamais comme instruction. Sortie validée par schéma zod `.strict()` (clés attendues exactes). Échec → retry → **template de secours** depuis une banque statique par facette (`ai_generated = false`).

## Écriture finale

`/api/talent/assessment` ne reçoit plus de `responses`. Il exige les 5 sessions `completed` + énergie, lit leurs `result` et upsert `talent_passports` : `score_hard`, `score_soft` + `soft_*`, `score_exp`, `score_life`, `score_risk`, `exp_verification`, puis `hard_skills` (une ligne par compétence testée, `validated = true`, `level` mesuré). `computeAssessment()` (formule du score global) inchangée, alimentée par ces scores.

## UI

- Étape 0 **CV** bloquante si `profiles.cv_url` vide : carte d'upload (`/api/talent/cv`), puis résumé extrait corrigeable.
- Ordre : CV → Compétences → Soft Skills → Expérience → Énergie → Life Score → Risques.
- Composant générique `AdaptiveStep` (généralise `EnergyStepAdaptive`) : une question à la fois, options en cartes, progression indicative, état de chargement pendant la génération, pas de retour arrière (annoncé), écran neutre en fin d'étape, aucun score affiché pendant la passation.
- `QUESTIONS` statiques retirées de `lib/talent/assessment.ts` à la fin de la migration (sauf banque de secours).

## Erreurs

- IA en échec → retry puis template de secours.
- Réseau → bouton « Réessayer » rejouant la même réponse.
- Parsing CV en échec → fichier conservé, saisie manuelle proposée, `exp_verification` reste `declared`.
- « Générer mon Passport » désactivé tant que les 6 étapes ne sont pas terminées ; erreurs serveur affichées.

## Tests

- Vitest moteur pur : couverture facettes, difficulté adaptative, conditions d'arrêt, plafond, crédibilité, tirage des clés.
- Vitest validation : sortie IA non conforme rejetée.
- Routes : accès à la session d'un autre candidat refusé, double réponse, reprise.
- Playwright : parcours complet avec IA mockée.

## Tranches

1. Package moteur + migration + routes + `AdaptiveStep`, **Soft Skills** branchée.
2. **Life Score** + **Risques** (configuration).
3. **CV obligatoire** + **Compétences techniques**.
4. **Expérience** + badge, bascule de `/api/talent/assessment` sur les sessions, retrait des questions statiques.

Jusqu'à la tranche 4, les étapes non migrées gardent leurs questions statiques : aucune régression en cours de route.

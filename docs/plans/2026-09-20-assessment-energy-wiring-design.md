# Brancher "Profil énergétique" sur le moteur adaptatif — Design (tranche 1 de 4)

Contexte : `/assessment` (page "Questionnaire 6D", `AssessmentForm.tsx` + `lib/talent/assessment.ts`) mesure aujourd'hui 6 catégories via auto-évaluation Likert statique. L'utilisateur veut que les 6 deviennent "dynamiques" pour réduire la triche/le biais de désirabilité sociale (l'auto-notation Likert se fait trop facilement gonfler). Le module Energy Assessment adaptatif (`@teranga/energy-assessment`, routes `/api/energy-assessment/*`, page standalone `/energy-assessment`) construit précédemment démontre déjà le bon mécanisme (choix forcé entre comportements tous légitimes) pour la catégorie "Profil énergétique" — cette tranche le branche sur `/assessment` au lieu de dupliquer la logique.

## Périmètre de ce chantier global (4 tranches)

1. **Cette tranche** : brancher "Profil énergétique" sur le moteur déjà construit.
2. Moteur "choix forcé à score unique" (nouveau, plus simple que celui de l'énergie — pas de sous-dimensions qui s'affrontent) pour Soft Skills, Life Score, Risques & bien-être.
3. Quiz de compétences techniques adaptatif (QCM/mini-cas générés par IA selon le métier déclaré, correction juste/faux) pour Compétences techniques.
4. Expérience reste déclarative, inchangée — la dynamiser ne réduit pas la triche sur des faits de carrière.

## Décisions actées pour cette tranche

- **UI** : l'étape "Profil énergétique" dans `AssessmentForm` cesse d'afficher des questions Likert statiques ; elle exécute la boucle adaptative déjà construite (mêmes routes `/api/energy-assessment/start` et `/answer`, même moteur `@teranga/energy-assessment`) directement dans cette étape du wizard. Aucune nouvelle route API n'est nécessaire pour la boucle elle-même.
- **Pont de données** : la conclusion de l'assessment adaptatif (branche "conclude" de `/api/energy-assessment/answer`, déjà existante) écrit désormais directement dans `talent_passports` (`energy_pilotes/initialiseurs/accomplisseurs/dynamiseurs/regulateurs`, `dominant_family`, `dominant_profile`, `energy_level`), en normalisant les décomptes de preuves internes du moteur (jamais montrés au candidat) en pourcentages sommant à 100 — même calcul que l'ancien système, source différente.
- **Pourquoi le pont est nécessaire** (vérifié dans le code, pas supposé) : `passport/page.tsx` affiche un graphique en barres des 5 pourcentages, `boussole/correlation/page.tsx` calcule un écart numérique par famille vs l'archétype de l'organisation, et `recrutement/matching/page.tsx` + `lib/matching/diagnostic.ts` + `lib/recruitment/scoring.ts` utilisent le pourcentage de la famille requise comme score de matching. Ces trois usages ont besoin de vrais pourcentages par famille, pas seulement d'une dominante qualitative — le pont doit donc produire des nombres, pas juste un label.
- **`computeAssessment()` (H/S/X/L/R)** ne calcule plus la partie énergie à partir de réponses Likert (les questions `E_*` sont retirées de `QUESTIONS`/`QUESTION_STEPS`). Elle lit ce que l'étape adaptative a déjà écrit dans `talent_passports` pour composer `score_global` (le terme E reste dans la formule, sourcé différemment).
- **Rien d'autre ne change** : `passport/page.tsx`, `boussole/correlation/page.tsx`, le matching recrutement continuent de lire les mêmes colonnes `talent_passports`, remplies différemment en amont. La page standalone `/energy-assessment` continue d'exister telle quelle (même moteur, même tables `energy_assessments`/`energy_assessment_questions`) ; rien n'empêche qu'elle et l'étape du wizard partagent le même dédoublonnage déjà en place côté `/start`.

## Composants à modifier/créer

### 1. Référentiel — mapping des codes

`packages/energy-assessment` utilise les codes `P/I/D/A/R` ; `talent_passports` utilise les noms `pilotes/initialiseurs/accomplisseurs/dynamiseurs/regulateurs`. Un mapping simple (`P→pilotes, I→initialiseurs, D→dynamiseurs, A→accomplisseurs, R→regulateurs`) est nécessaire côté pont — à documenter clairement dans le code (source de confusion facile, les lettres D/A ne sont pas dans le même ordre entre les deux nomenclatures : D=Dynamiseur côté énergie, mais A=Accomplisseur ≠ D=Dynamiseur, attention à ne pas permuter).

### 2. Moteur — exposer les décomptes de preuves à la conclusion

`packages/energy-assessment/src/engine.ts` : `ConcludeAction` gagne un champ interne (ex. `evidence: Record<EnergyCode, number>`, les totaux bruts de `tallyEvidence` au moment de la conclusion) — jamais utilisé pour l'affichage candidat, uniquement pour permettre au pont de normaliser en pourcentages. Test unitaire à ajouter : la conclusion expose bien les 5 totaux, cohérents avec l'historique de réponses fourni.

### 3. Pont de données — écriture dans `talent_passports`

`apps/web/src/app/api/energy-assessment/answer/route.ts`, branche "conclude" : après avoir construit `interpretation` et mis à jour `energy_assessments`, upsert également `talent_passports` pour le `profile_id` courant avec les 5 pourcentages normalisés (`evidence[code] / sum(evidence) * 100`, arrondis, sommant à 100), `dominant_family`, `dominant_profile` (réutiliser la logique de mapping profil existante — `FAMILY_PROFILES` dans `lib/talent/assessment.ts`), `energy_level` (réutiliser `ENERGY_LEVELS`). Ne touche à aucune autre colonne de `talent_passports` (H/S/X/L/R/score_global restent gérés par `/api/talent/assessment`).

### 4. `lib/talent/assessment.ts` — retirer la partie énergie de `computeAssessment`

Retirer les 10 questions `E_*` de `QUESTIONS` et l'entrée `E` de `QUESTION_STEPS`. `computeAssessment()` ne calcule plus `energy`/`dominant_family`/`energy_level`/le terme E de `score_global` à partir de `responses` — ces valeurs sont lues depuis la ligne `talent_passports` existante (déjà remplie par le pont ci-dessus) au moment du calcul final.

### 5. `apps/web/src/app/api/talent/assessment/route.ts`

Avant d'upsert, lire la ligne `talent_passports` existante du profil (si elle existe) pour récupérer les champs énergie déjà posés par le pont, les inclure tels quels dans l'upsert final (ne pas les écraser avec des valeurs par défaut), et les utiliser dans le calcul de `score_global`.

### 6. UI — `AssessmentForm.tsx` + nouveau composant

- Nouveau composant (ex. `EnergyStepAdaptive.tsx`), calqué sur la logique déjà écrite dans `EnergyAssessmentClient.tsx` (états start/question/conclusion, mêmes appels réseau), mais sans son propre gate d'authentification (déjà géré par la page `/assessment` parente) et sans écran de démarrage séparé — il s'intègre comme contenu de l'étape "E" du wizard.
- `AssessmentForm.tsx` : la logique `stepComplete` pour l'étape "E" ne compare plus `stepAnswered === stepQuestions.length` (il n'y a plus de `stepQuestions` pour E) mais un état booléen `energyStepDone` levé par `EnergyStepAdaptive` à sa conclusion. Le rendu de l'étape bascule conditionnellement entre la liste de questions Likert (les 5 autres catégories, inchangé) et `<EnergyStepAdaptive />` (catégorie E).
- Le submit final ("Générer mon Passport") continue d'envoyer `responses` (H/S/X/L/R uniquement désormais) à `/api/talent/assessment` — inchangé côté contrat, juste moins de clés dans le payload.

## Hors périmètre (rappel)

Soft Skills, Life Score, Risques & bien-être, Compétences techniques, Expérience : aucun changement dans cette tranche.

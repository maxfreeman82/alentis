# Remplacer son CV (talent déjà inscrit) — Design

Contexte : un talent qui a déjà terminé l'onboarding n'a aujourd'hui aucun moyen de mettre à jour son CV. L'upload existant (étape 3 de l'onboarding, `TalentOnboardingWizard.tsx`) est de toute façon cassé en production : `/api/cv/parse` instancie directement `new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY})`, jamais migré vers le nouveau provider `daba.skyfora.ai` (`callAI` dans `lib/ai.ts`) utilisé pour corriger les 5 autres fonctions IA du projet. Même quand ça fonctionnait, rien n'était persisté : ni le fichier PDF (aucun bucket Supabase Storage n'existe dans ce projet — vérifié), ni les compétences extraites (perdues après l'onboarding).

## Vérifications préalables (base réelle, pas supposée)

- `profiles.cv_url TEXT` existe déjà en base réelle, sans migration trackée dans le repo (même dérive schéma que rencontrée précédemment sur `profiles.user_id`).
- `profiles.job_title`, `employer_name`, `sector`, `years_experience` existent déjà.
- Aucun bucket Supabase Storage n'existe (`storage.buckets` vide) — à créer.
- `hard_skills` exige un `passport_id NOT NULL REFERENCES talent_passports(id)` — un talent fraîchement inscrit n'a pas forcément de Talent Passport, donc cette table n'est pas utilisable pour stocker les compétences extraites sans complexité supplémentaire.

## Décisions actées

1. **Nouvelle route** `POST /api/talent/cv`, séparée de `/api/cv/parse` — l'onboarding n'est pas touché par ce chantier.
2. **Extraction de texte côté serveur puis réutilisation de `parseCV(cvText)`** (déjà dans `lib/ai.ts`, déjà migré vers `daba.skyfora.ai`) plutôt que d'envoyer le PDF brut à l'IA comme le fait l'actuel `/api/cv/parse` — évite une dépendance à un éventuel support multimodal chez le nouveau provider (non vérifié), et corrige le bug de provider sans toucher au code de l'onboarding.
3. **Stockage du PDF** dans un nouveau bucket Supabase Storage privé `cv-uploads`, chemin scopé par `profile_id`, un seul fichier courant par talent (écrase le précédent) — cohérent avec `cv_url` au singulier.
4. **Persistance** : `cv_url` + `job_title`/`employer_name`/`sector`/`years_experience` (colonnes existantes) ; nouvelle colonne JSONB `cv_extracted_skills` sur `profiles` pour la liste de compétences (pas de table `hard_skills`, pour éviter la dépendance à un Talent Passport existant).
5. **UI** : nouvelle page `/parametres` (lien déjà présent dans le menu talent, actuellement mort) avec une carte "Mon CV".
6. **Hors périmètre** : pas de recalcul de `score_hard` à partir des compétences extraites ; `/api/cv/parse` et le wizard d'onboarding restent inchangés.

## Schéma

Une migration :
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cv_extracted_skills JSONB NOT NULL DEFAULT '[]';
```
Plus la création du bucket `cv-uploads` (privé) et ses policies RLS (lecture/écriture restreintes au propriétaire, via jointure `profiles.user_id = auth.uid()` — même pattern que les migrations précédentes, PAS `profiles.id = auth.uid()`).

## Flux

1. Talent va sur `/parametres`, voit l'état actuel de son CV (nom de fichier extrait de `cv_url` si présent, sinon "aucun CV").
2. Upload un PDF → `POST /api/talent/cv` (multipart).
3. Route : auth + profil → upload Storage (écrase l'ancien) → extraction texte PDF → `parseCV(text)` → upsert `profiles` (`cv_url`, `job_title`, `employer_name`, `sector`, `years_experience`, `cv_extracted_skills`) → retourne les champs extraits.
4. UI affiche un résumé des champs mis à jour.

## Erreurs à gérer (mêmes conventions que le reste du projet)

- Fichier absent/mauvais type/trop volumineux → 400.
- Échec extraction texte PDF (PDF corrompu/scanné sans texte) → message clair, ne pas persister de données partielles incohérentes.
- Échec `parseCV` (IA) → toujours stocker le fichier uploadé (`cv_url`) même si le parsing échoue, mais ne pas écraser les autres champs profil avec des valeurs vides — l'upload du fichier a de la valeur même sans extraction réussie.

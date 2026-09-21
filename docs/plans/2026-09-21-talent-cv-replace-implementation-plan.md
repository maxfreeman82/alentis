# Remplacer son CV (talent déjà inscrit) — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permettre à un talent déjà inscrit de téléverser un nouveau CV depuis `/parametres`, en stockant le fichier et en persistant les champs extraits par IA — ce qui n'existe nulle part aujourd'hui, même à l'onboarding.

**Architecture:** Une route serveur dédiée (`/api/talent/cv`, séparée de l'onboarding) upload le PDF dans un nouveau bucket Supabase Storage privé, en extrait le texte, réutilise `parseCV()` (déjà migré vers le provider `daba.skyfora.ai`, actuellement mort code car sans appelant) pour obtenir les champs structurés, et upsert `profiles`.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (Postgres + Storage + RLS), `pdf-parse` (nouvelle dépendance), pnpm workspaces.

**Design source :** [`docs/plans/2026-09-21-talent-cv-replace-design.md`](2026-09-21-talent-cv-replace-design.md)

---

## Vérifications préalables déjà faites (à ne pas refaire)

- Aucune librairie d'extraction de texte PDF n'est présente dans le monorepo (`grep` sur `apps/web/package.json` et `node_modules/.pnpm` : rien) — `pdf-parse` doit être ajoutée.
- `parseCV(cvText: string)` existe dans `apps/web/src/lib/ai.ts`, déjà branché sur `callAI`/`daba.skyfora.ai`, mais **n'a aucun appelant actuel** (code mort) et son prompt renvoie un JSON `{hard_skills, experience_years, education, languages}` — pas les champs dont cette feature a besoin (`jobTitle`, `employer`, `sector`, `yearsExp`). Comme rien ne l'appelle, son prompt/sa forme de retour peuvent être adaptés sans casser quoi que ce soit.
- `profiles.cv_url` existe en base réelle (vérifié via Supabase), sans migration trackée dans le repo — pas la peine de la recréer, juste de l'utiliser.
- Aucun bucket Supabase Storage n'existe (`storage.buckets` vide, vérifié) — à créer dans la migration.
- `/api/cv/parse` (utilisé par l'onboarding) reste **intégralement inchangé** par ce plan — bug connu (SDK Anthropic direct), hors périmètre.

---

### Task 1 : Ajouter la dépendance d'extraction de texte PDF

**Files:**
- Modify: `apps/web/package.json`

**Step 1: Installer `pdf-parse`**

Run (depuis `apps/web`) :
```bash
pnpm add pdf-parse
pnpm add -D @types/pdf-parse
```

Si `@types/pdf-parse` n'existe pas sur npm (vérifier), `pdf-parse` fournit-il ses propres types ? Si aucun des deux, créer un petit fichier de déclaration `apps/web/src/types/pdf-parse.d.ts` :
```ts
declare module 'pdf-parse' {
  interface PdfParseResult { text: string; numpages: number; }
  function pdfParse(buffer: Buffer): Promise<PdfParseResult>;
  export = pdfParse;
}
```

**Step 2: Vérifier l'installation**

Run: `pnpm --filter web typecheck`
Expected: pas d'erreur liée à `pdf-parse` (le fichier qui l'importera n'existe pas encore, donc rien à vérifier de plus ici — juste confirmer que l'installation n'a pas cassé le lockfile).

**Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/types/pdf-parse.d.ts 2>/dev/null
git commit -m "chore(web): add pdf-parse dependency for CV text extraction"
```

(Le `2>/dev/null` sur le fichier de déclaration est au cas où `@types/pdf-parse` officiel existe et rend ce fichier inutile — adapte la commande à ce que tu as réellement créé.)

---

### Task 2 : Adapter `parseCV()` pour renvoyer les champs dont cette feature a besoin

**Files:**
- Modify: `apps/web/src/lib/ai.ts`

**Step 1: Vérifier qu'aucun appelant actuel ne serait cassé**

Run: `grep -rn "parseCV" apps/web/src`
Expected: seule la définition dans `lib/ai.ts` apparaît, aucun import ailleurs. Si tu trouves un appelant, STOP et pose la question avant de continuer — le plan suppose que c'est du code mort.

**Step 2: Réécrire le prompt et la forme de retour**

Remplacer la fonction `parseCV` actuelle par :

```ts
// 1. Parsing CV — extrait les champs structurés utilisés par le profil talent
// (job title, employeur, secteur, années d'expérience, compétences). Reprend
// exactement les mêmes secteurs autorisés que l'ancien /api/cv/parse (onboarding,
// inchangé par ailleurs) pour rester cohérent avec les données déjà en base.
export const CV_SECTORS = [
  'Technologie', 'Finance & Banque', 'Agriculture & Agritech',
  'Santé & Healthcare', 'Éducation & EdTech', 'Logistique & Transport',
  'Médias & Communication', 'BTP & Construction', 'Tourisme & Hôtellerie',
  'Microfinance & Inclusion', 'Énergie & Environnement', 'Commerce & Distribution',
  'Industrie & Manufacturing', 'Conseil & Services', 'Immobilier',
] as const;

export interface CvExtract {
  jobTitle:   string;
  employer:   string;
  sector:     string;
  yearsExp:   number;
  hardSkills: string[];
}

export async function parseCV(cvText: string): Promise<CvExtract> {
  const text = await callAI(
    `Expert RH africain. Analyse ce texte de CV et extrais les informations en JSON strict.
     Secteurs autorisés : ${CV_SECTORS.join(', ')}.
     Réponds UNIQUEMENT avec le JSON valide, sans markdown ni explication.`,
    `CV:\n\n${cvText}\n\nJSON attendu:
    {"jobTitle":"titre du poste actuel ou dernier poste",
     "employer":"nom de l'employeur actuel ou dernier",
     "sector":"un secteur parmi la liste autorisée",
     "yearsExp":"nombre entier d'années d'expérience totale",
     "hardSkills":["compétence1","..."] (max 12, noms courts)}`
  );

  let raw: unknown;
  try { raw = JSON.parse(text); } catch { raw = {}; }
  const r = raw as Partial<CvExtract>;

  return {
    jobTitle:   typeof r.jobTitle === 'string' ? r.jobTitle : '',
    employer:   typeof r.employer === 'string' ? r.employer : '',
    sector:     typeof r.sector === 'string' && (CV_SECTORS as readonly string[]).includes(r.sector) ? r.sector : '',
    yearsExp:   typeof r.yearsExp === 'number' ? Math.max(0, Math.round(r.yearsExp)) : 0,
    hardSkills: Array.isArray(r.hardSkills) ? r.hardSkills.slice(0, 12).map(String) : [],
  };
}
```

Cette version ne lève jamais d'exception sur un JSON malformé (contrairement aux 4 autres fonctions de ce fichier qui font `JSON.parse(text)` sans try/catch) — c'est un choix délibéré : mieux vaut un `CvExtract` vide/par défaut qu'un upload de CV qui échoue entièrement à cause d'un JSON légèrement invalide, puisque le fichier lui-même doit être stocké quoi qu'il arrive (cf. Task 4).

**Step 3: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: pas d'erreur.

**Step 4: Commit**

```bash
git add apps/web/src/lib/ai.ts
git commit -m "refactor(ai): adapt parseCV to return profile fields (jobTitle/employer/sector/yearsExp/hardSkills)"
```

---

### Task 3 : Migration Supabase — colonne + bucket + policies

**Files:**
- Create: `supabase/migrations/007_talent_cv.sql`

**Step 1: Écrire la migration**

```sql
-- ============================================================
-- TERANGA ALIGN — Remplacement du CV par le talent
-- Migration 007 : colonne profiles.cv_extracted_skills + bucket Storage
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cv_extracted_skills JSONB NOT NULL DEFAULT '[]';

-- Bucket privé : un seul CV courant par talent, chemin `{profile_id}/cv.pdf`.
-- L'upload/la lecture passent par la route API (service role, bypass RLS) —
-- ces policies sont une défense en profondeur pour un éventuel accès direct
-- depuis un client Supabase authentifié, pas le chemin principal.
INSERT INTO storage.buckets (id, name, public)
VALUES ('cv-uploads', 'cv-uploads', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "cv_own_select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cv-uploads'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "cv_own_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cv-uploads'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "cv_own_update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'cv-uploads'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM public.profiles WHERE user_id = auth.uid()
    )
  );
```

**Step 2: Ne PAS appliquer immédiatement**

Comme pour les migrations précédentes de ce projet, ce fichier est écrit et committé mais **pas appliqué** à la base réelle dans cette tâche — l'application est une étape séparée nécessitant une confirmation explicite de l'utilisateur (voir migration 006 pour le précédent de ce pattern).

**Step 3: Commit**

```bash
git add supabase/migrations/007_talent_cv.sql
git commit -m "feat(db): add cv_extracted_skills column and cv-uploads storage bucket"
```

---

### Task 4 : Route `POST /api/talent/cv`

**Files:**
- Create: `apps/web/src/app/api/talent/cv/route.ts`

**Step 1: Écrire la route**

Suit le pattern d'auth des autres routes talent (`requireAuth` + `getTalentProfile`), le pattern de validation de fichier de `/api/cv/parse` (taille/type), et upsert `profiles` via `createAdminClient`.

```ts
import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { getTalentProfile } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseCV } from '@/lib/ai';
// pdf-parse n'a pas de types ESM propres — import CJS classique.
import pdfParse from 'pdf-parse';

export async function POST(req: Request) {
  const user = await requireAuth();
  const ctx = await getTalentProfile(user.id);
  if (!ctx) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('cv') as File | null;
  if (!file) return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 5 Mo).' }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Format non supporté (PDF uniquement).' }, { status: 400 });
  }

  const bytes  = Buffer.from(await file.arrayBuffer());
  const admin  = createAdminClient();
  const path   = `${ctx.profileId}/cv.pdf`;

  // 1. Stocker le fichier D'ABORD : même si l'extraction/le parsing échoue
  // ensuite, l'upload du CV a de la valeur en soi et ne doit pas être perdu.
  const { error: uploadErr } = await admin.storage
    .from('cv-uploads')
    .upload(path, bytes, { contentType: 'application/pdf', upsert: true });
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  // 2. Extraction texte + parsing IA — best effort, ne bloque pas la réussite
  // de l'upload si ça échoue (PDF scanné sans texte, erreur IA, etc.).
  let extract: Awaited<ReturnType<typeof parseCV>> | null = null;
  try {
    const { text } = await pdfParse(bytes);
    if (text.trim().length > 0) {
      extract = await parseCV(text);
    }
  } catch (err) {
    console.error('[talent/cv] extraction/parsing failed:', err);
  }

  const updatePayload: Record<string, unknown> = { cv_url: path };
  if (extract) {
    if (extract.jobTitle)   updatePayload.job_title       = extract.jobTitle;
    if (extract.employer)   updatePayload.employer_name    = extract.employer;
    if (extract.sector)     updatePayload.sector           = extract.sector;
    if (extract.yearsExp)   updatePayload.years_experience = extract.yearsExp;
    updatePayload.cv_extracted_skills = extract.hardSkills;
  }

  const { error: updateErr } = await admin
    .from('profiles')
    .update(updatePayload)
    .eq('id', ctx.profileId);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    parsed: extract !== null,
    extract,
  });
}
```

Notes :
- `.update(...)` (pas `.upsert(...)`) car le profil existe forcément à ce stade (le talent est déjà inscrit — `getTalentProfile` a déjà réussi).
- Seuls les champs extraits non vides écrasent les colonnes existantes (`if (extract.jobTitle) ...`) — un parsing partiel ne doit pas effacer une valeur déjà correcte avec une chaîne vide.
- `updatePayload.cv_extracted_skills = extract.hardSkills` s'applique même si la liste est vide, volontairement : une liste vide est une information valide ("ce CV ne mentionne pas de compétences détectées"), contrairement aux autres champs où une chaîne vide signifierait probablement un échec d'extraction plutôt qu'une vraie valeur.

**Step 2: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: pas d'erreur. Si `pdf-parse` n'a pas de types compatibles avec l'import par défaut, ajuste l'import (`import * as pdfParse from 'pdf-parse'` ou `const pdfParse = require('pdf-parse')` selon ce que Task 1 a mis en place) — vérifie ce qui typecheck réellement plutôt que de deviner.

**Step 3: Commit**

```bash
git add apps/web/src/app/api/talent/cv/route.ts
git commit -m "feat(api): add POST /api/talent/cv for post-onboarding CV replacement"
```

---

### Task 5 : Page `/parametres` + composant d'upload

**Files:**
- Create: `apps/web/src/app/(talent)/parametres/page.tsx`
- Create: `apps/web/src/components/talent/CvUploadCard.tsx`

**Step 1: Vérifier le lien existant dans le menu**

Lis `apps/web/src/app/(talent)/layout.tsx` pour confirmer le lien `/parametres` existant (déjà repéré comme lien mort) et le style de layout des autres pages `(talent)` (ex. `apps/web/src/app/(talent)/passport/page.tsx`) pour matcher les conventions (Server Component avec `requireAuth`/`getTalentProfile`/`redirect('/onboarding')`, wrapper `<div className="space-y-6">`, etc.).

**Step 2: Page serveur**

```tsx
import { requireAuth } from '@/lib/supabase/user';
import { getTalentProfile } from '@/lib/supabase/auth';
import { redirect } from 'next/navigation';
import CvUploadCard from '@/components/talent/CvUploadCard';

export default async function ParametresPage() {
  const user = await requireAuth();
  const ctx = await getTalentProfile(user.id);
  if (!ctx) redirect('/onboarding');

  const { supabase, profileId } = ctx;
  const { data: profile } = await supabase
    .from('profiles')
    .select('cv_url, cv_extracted_skills')
    .eq('id', profileId)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-2">PARAMÈTRES</p>
        <h1 className="font-display text-slate-900 text-2xl">Mon compte</h1>
      </div>

      <CvUploadCard
        hasExistingCv={!!profile?.cv_url}
        existingSkills={(profile?.cv_extracted_skills as string[] | null) ?? []}
      />
    </div>
  );
}
```

(Adapte les noms exacts `supabase`/`profileId` à ce que `getTalentProfile` renvoie réellement — vérifie sa signature dans `apps/web/src/lib/supabase/auth.ts` avant d'écrire ce code, ne suppose pas.)

**Step 3: Composant client d'upload**

```tsx
'use client';

import { useState } from 'react';
import { Loader2, FileText, UploadCloud } from 'lucide-react';

interface CvExtract {
  jobTitle: string;
  employer: string;
  sector: string;
  yearsExp: number;
  hardSkills: string[];
}

interface Props {
  hasExistingCv: boolean;
  existingSkills: string[];
}

export default function CvUploadCard({ hasExistingCv, existingSkills }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ parsed: boolean; extract: CvExtract | null } | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('cv', file);
      const res = await fetch('/api/talent/cv', { method: 'POST', body: formData });
      const json = await res.json() as { ok?: boolean; error?: string; parsed?: boolean; extract?: CvExtract | null };
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'Échec de l\'envoi.');
        return;
      }
      setResult({ parsed: !!json.parsed, extract: json.extract ?? null });
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald/10 flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-emerald" />
        </div>
        <div>
          <p className="text-slate-900 font-semibold">Mon CV</p>
          <p className="text-slate-500 text-xs">
            {hasExistingCv ? 'Un CV est déjà enregistré.' : 'Aucun CV enregistré pour le moment.'}
          </p>
        </div>
      </div>

      {existingSkills.length > 0 && !result && (
        <p className="text-slate-600 text-xs">
          Compétences actuellement détectées : {existingSkills.join(', ')}
        </p>
      )}

      {error && (
        <div role="alert" className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-emerald/10 border border-emerald/20 rounded-xl px-4 py-3 text-xs text-slate-700 space-y-1">
          <p className="font-semibold text-emerald">CV enregistré.</p>
          {result.parsed && result.extract ? (
            <>
              {result.extract.jobTitle && <p>Poste détecté : {result.extract.jobTitle}</p>}
              {result.extract.employer && <p>Employeur détecté : {result.extract.employer}</p>}
              {result.extract.hardSkills.length > 0 && (
                <p>Compétences détectées : {result.extract.hardSkills.join(', ')}</p>
              )}
            </>
          ) : (
            <p>Le fichier est enregistré, mais l&apos;analyse automatique n&apos;a pas abouti — vous pouvez réessayer plus tard.</p>
          )}
        </div>
      )}

      <label className="inline-flex items-center gap-2 bg-emerald text-white py-2.5 px-4 rounded-xl font-semibold text-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors cursor-pointer w-fit">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
        {loading ? 'Envoi…' : hasExistingCv ? 'Remplacer mon CV' : 'Téléverser mon CV'}
        <input type="file" accept=".pdf,application/pdf" className="hidden" disabled={loading} onChange={handleFileChange} />
      </label>
    </div>
  );
}
```

**Step 4: Vérifier dans le navigateur**

Pas de test automatisé (convention du projet pour l'UI). Lancer le serveur de dev, se connecter en talent, aller sur `/parametres`, vérifier :
- Le lien "Paramètres" du menu mène bien à une vraie page (plus de lien mort).
- L'upload d'un vrai PDF fonctionne, le fichier apparaît dans le bucket Supabase Storage `cv-uploads/{profileId}/cv.pdf` (si la migration a été appliquée — sinon l'upload échouera avec une erreur claire, ce qui est attendu tant que la migration n'est pas appliquée).
- Réessayer avec un fichier non-PDF ou trop volumineux : message d'erreur clair.

Run: `pnpm --filter web build`
Expected: exit code 0, route `/parametres` listée.

**Step 5: Commit**

```bash
git add apps/web/src/app/\(talent\)/parametres apps/web/src/components/talent/CvUploadCard.tsx
git commit -m "feat(ui): add /parametres page with CV replace card"
```

---

## Ce que ce plan NE couvre PAS (rappel du périmètre)

Pas de recalcul de `score_hard`/`talent_passports` à partir des compétences extraites. Pas de modification de `/api/cv/parse` ni du wizard d'onboarding. Pas de fonctionnalité de téléchargement/prévisualisation du CV déjà uploadé (le bouton ne fait que remplacer — ajouter un lien de téléchargement nécessiterait de générer une URL signée depuis le bucket privé, hors périmètre ici). La migration 007 n'est pas appliquée automatiquement — étape séparée nécessitant confirmation explicite.

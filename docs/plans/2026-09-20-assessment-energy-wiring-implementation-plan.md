# Brancher "Profil énergétique" sur le moteur adaptatif — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Faire passer l'étape "Profil énergétique" de `/assessment` du questionnaire Likert statique au moteur adaptatif déjà construit (`@teranga/energy-assessment`), en préservant tout ce qui dépend aujourd'hui des colonnes `talent_passports` correspondantes (passport, corrélation org, matching recrutement).

**Architecture:** Le moteur adaptatif conclut déjà une passation (dominante/secondaire/confiance) sans jamais exposer de score au candidat. On ajoute un champ interne `evidence` (décomptes bruts par énergie) à sa conclusion, on le transforme en pourcentages par famille via un nouveau module de pont, et on écrit directement dans `talent_passports` à la conclusion — indépendamment du submit final de `/assessment`, qui ne gère plus que Compétences/Soft Skills/Expérience/Life Score/Risques.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase, vitest (package), pnpm workspaces.

**Design source :** [`docs/plans/2026-09-20-assessment-energy-wiring-design.md`](2026-09-20-assessment-energy-wiring-design.md)

---

## Décisions d'implémentation (précisent le design, n'en changent pas le sens)

- **`energy_level` et le terme "E" de `score_global`** : l'ancien système utilisait le score Likert brut (0-100) de la famille dominante pour les deux. Le moteur adaptatif ne produit pas d'équivalent direct — on réutilise la part normalisée de la famille dominante (`score_energy`, déjà nécessaire pour la colonne du même nom) comme substitut unique pour les deux usages. Plus simple qu'introduire une notion séparée, et conceptuellement cohérent (une dominante plus nette produit une part plus élevée).
- **`dominant_profile`** ne peut être calculé qu'une fois `score_global` connu (dépend de H/S/X/L/R), donc seulement au submit final de `/assessment` — pas à la conclusion de l'étape énergie. La conclusion énergie écrit tout le reste (`energy_pilotes/initialiseurs/accomplisseurs/dynamiseurs/regulateurs`, `dominant_family`, `score_energy`, `energy_level`) sans toucher `dominant_profile`.
- **Utilisateur qui saute l'étape énergie** (navigation libre entre onglets déjà permise par `AssessmentForm`, pré-existante) : `/api/talent/assessment` retombe sur `dominant_family='pilotes'`, `score_energy=20` si la ligne `talent_passports` n'a pas encore de profil énergie — même esprit que l'ancien défaut "3/Neutre" pour une question non répondue.
- **`upsert` Supabase ne touche que les colonnes fournies** dans le payload (comportement standard `ON CONFLICT DO UPDATE` Postgres) — la conclusion énergie et le submit final peuvent donc upserter chacun leur sous-ensemble de colonnes sans s'écraser mutuellement.

---

### Task 1 : Moteur — exposer les décomptes de preuves à la conclusion

**Files:**
- Modify: `packages/energy-assessment/src/engine.ts`
- Test: `packages/energy-assessment/src/engine.test.ts`

**Step 1: Write the failing test**

Ajouter à `engine.test.ts` :

```ts
describe('decideNextStep — evidence exposée à la conclusion', () => {
  it('inclut les décomptes bruts des 5 énergies dans une conclusion normale', () => {
    const contexts = ['incertitude', 'pression', 'changement', 'collectif', 'decision'];
    const answered: AnsweredQuestion[] = [
      ...Array.from({ length: 8 }, (_, i) => answeredFor('A', contexts[i % contexts.length])),
      answeredFor('P', 'incertitude'), answeredFor('I', 'pression'),
      answeredFor('D', 'changement'), answeredFor('R', 'collectif'),
    ];
    const decision = decideNextStep(answered);
    expect(decision.action).toBe('conclude');
    if (decision.action !== 'conclude') throw new Error('unreachable');
    expect(decision.evidence).toEqual({ A: 8, P: 1, I: 1, D: 1, R: 1 });
  });

  it('inclut les décomptes bruts dans une conclusion forcée', () => {
    const contexts = ['incertitude', 'pression', 'changement', 'collectif', 'decision'];
    const answered: AnsweredQuestion[] = Array.from({ length: 20 }, (_, i) =>
      answeredFor((['A', 'P', 'I', 'D', 'R'] as const)[i % 5], contexts[i % contexts.length])
    );
    const decision = decideNextStep(answered);
    expect(decision.action).toBe('conclude');
    if (decision.action !== 'conclude') throw new Error('unreachable');
    expect(decision.evidence.A + decision.evidence.P + decision.evidence.I + decision.evidence.D + decision.evidence.R).toBe(20);
  });
});
```

(`answeredFor` est déjà défini plus haut dans ce fichier de test, réutilise-le tel quel.)

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @teranga/energy-assessment test`
Expected: FAIL — `decision.evidence` est `undefined`.

**Step 3: Write minimal implementation**

Dans `engine.ts` :

```ts
export interface ConcludeAction {
  action: 'conclude';
  dominant: EnergyCode;
  secondary: EnergyCode[];
  confidence: number;
  forced: boolean;
  // Décomptes bruts par énergie au moment de la conclusion — jamais montrés au
  // candidat, utilisés uniquement par les intégrations en aval (ex. le pont
  // talent_passports) pour dériver des pourcentages par famille.
  evidence: Record<EnergyCode, number>;
}
```

Ajouter une petite fonction utilitaire juste avant `decideNextStep` :

```ts
function evidenceOf(ranked: ReturnType<typeof rankEvidence>): Record<EnergyCode, number> {
  return Object.fromEntries(ranked.map(r => [r.code, r.total])) as Record<EnergyCode, number>;
}
```

Puis ajouter `evidence: evidenceOf(ranked),` aux deux `return` qui construisent une `ConcludeAction` (la branche `canConclude` et la branche `count >= MAX_QUESTIONS`).

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @teranga/energy-assessment test`
Expected: PASS — tous les tests (les 2 nouveaux + les existants).

**Step 5: Commit**

```bash
git add packages/energy-assessment/src/engine.ts packages/energy-assessment/src/engine.test.ts
git commit -m "feat(energy-assessment): expose raw evidence counts on ConcludeAction"
```

---

### Task 2 : Pont talent_passports — module pur

**Files:**
- Create: `packages/energy-assessment/src/talent-passport-bridge.ts`
- Test: `packages/energy-assessment/src/talent-passport-bridge.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { bridgeConclusionToTalentPassport, ENERGY_CODE_TO_FAMILY } from './talent-passport-bridge';
import type { ConcludeAction } from './engine';

function conclude(evidence: Record<string, number>, dominant: 'P'|'I'|'D'|'A'|'R'): ConcludeAction {
  return {
    action: 'conclude', dominant, secondary: [], confidence: 0.7, forced: false,
    evidence: evidence as ConcludeAction['evidence'],
  };
}

describe('bridgeConclusionToTalentPassport', () => {
  it('normalise les décomptes en pourcentages sommant à 100', () => {
    const result = bridgeConclusionToTalentPassport(conclude({ A: 8, P: 1, I: 1, D: 1, R: 1 }, 'A'));
    const sum = Object.values(result.energyPercentages).reduce((s, v) => s + v, 0);
    expect(sum).toBe(100);
    expect(result.energyPercentages.accomplisseurs).toBeGreaterThan(result.energyPercentages.pilotes);
  });

  it('mappe le code dominant vers le nom de famille legacy', () => {
    const result = bridgeConclusionToTalentPassport(conclude({ A: 8, P: 1, I: 1, D: 1, R: 1 }, 'A'));
    expect(result.dominantFamily).toBe('accomplisseurs');
  });

  it('vérifie le mapping complet des 5 codes (attention à l\'ordre D/A qui diffère entre nomenclatures)', () => {
    expect(ENERGY_CODE_TO_FAMILY).toEqual({
      P: 'pilotes', I: 'initialiseurs', D: 'dynamiseurs', A: 'accomplisseurs', R: 'regulateurs',
    });
  });

  it('scoreEnergy est la part normalisée de la famille dominante', () => {
    const result = bridgeConclusionToTalentPassport(conclude({ A: 8, P: 1, I: 1, D: 1, R: 1 }, 'A'));
    expect(result.scoreEnergy).toBe(result.energyPercentages.accomplisseurs);
  });

  it('retombe sur 20% partout si aucune preuve (evidence vide/tout à zéro)', () => {
    const result = bridgeConclusionToTalentPassport(conclude({ A: 0, P: 0, I: 0, D: 0, R: 0 }, 'A'));
    expect(result.energyPercentages).toEqual({
      pilotes: 20, initialiseurs: 20, accomplisseurs: 20, dynamiseurs: 20, regulateurs: 20,
    });
  });

  it('dérive energyLevel (C1-C5) depuis scoreEnergy', () => {
    const result = bridgeConclusionToTalentPassport(conclude({ A: 8, P: 1, I: 1, D: 1, R: 1 }, 'A'));
    expect(['C1', 'C2', 'C3', 'C4', 'C5']).toContain(result.energyLevel);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @teranga/energy-assessment test`
Expected: FAIL — le fichier `talent-passport-bridge.ts` n'existe pas.

**Step 3: Write minimal implementation**

```ts
import { ENERGY_CODES, type EnergyCode } from './referentiel';
import type { ConcludeAction } from './engine';

// Pont entre le moteur (codes P/I/D/A/R, jamais de score visible) et les
// colonnes historiques de `talent_passports` (noms de familles, pourcentages
// normalisés) dont dépendent déjà passport/page.tsx, boussole/correlation et
// le matching recrutement. Attention : l'ordre des lettres ne correspond PAS
// à l'ordre des noms — D=Dynamiseur côté énergie, mais A=Accomplisseur.
export type TalentPassportEnergyFamily =
  | 'pilotes' | 'initialiseurs' | 'accomplisseurs' | 'dynamiseurs' | 'regulateurs';

export const ENERGY_CODE_TO_FAMILY: Record<EnergyCode, TalentPassportEnergyFamily> = {
  P: 'pilotes',
  I: 'initialiseurs',
  D: 'dynamiseurs',
  A: 'accomplisseurs',
  R: 'regulateurs',
};

const ENERGY_LEVELS = ['C1', 'C2', 'C3', 'C4', 'C5'] as const;

export interface TalentPassportEnergyBridge {
  energyPercentages: Record<TalentPassportEnergyFamily, number>;
  dominantFamily: TalentPassportEnergyFamily;
  scoreEnergy: number;
  energyLevel: string;
}

export function bridgeConclusionToTalentPassport(decision: ConcludeAction): TalentPassportEnergyBridge {
  const families = ENERGY_CODES.map(code => ENERGY_CODE_TO_FAMILY[code]);
  const raw = Object.fromEntries(families.map(f => [f, 0])) as Record<TalentPassportEnergyFamily, number>;
  for (const code of ENERGY_CODES) {
    raw[ENERGY_CODE_TO_FAMILY[code]] = decision.evidence[code];
  }

  const sum = families.reduce((s, f) => s + raw[f], 0);
  const energyPercentages = Object.fromEntries(
    families.map(f => [f, sum > 0 ? Math.round((raw[f] / sum) * 100) : 20])
  ) as Record<TalentPassportEnergyFamily, number>;

  const dominantFamily = ENERGY_CODE_TO_FAMILY[decision.dominant];
  const scoreEnergy = energyPercentages[dominantFamily];
  const levelIdx = Math.min(Math.floor(scoreEnergy / 20), 4);
  const energyLevel = ENERGY_LEVELS[levelIdx] ?? 'C3';

  return { energyPercentages, dominantFamily, scoreEnergy, energyLevel };
}
```

**Erratum constaté à l'implémentation :** le code ci-dessus (arrondi indépendant par famille) ne garantit pas une somme à 100 — vérifié : `{A:8,P:1,I:1,D:1,R:1}` produit 99, pas 100. L'implémentation réelle dans `talent-passport-bridge.ts` utilise un algorithme d'apportionnement au plus fort reste (Hamilton) à la place ; voir ce fichier pour le code correct.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @teranga/energy-assessment test`
Expected: PASS.

**Step 5: Export and typecheck**

Dans `packages/energy-assessment/src/index.ts`, ajouter :

```ts
export * from './talent-passport-bridge';
```

Run: `pnpm --filter @teranga/energy-assessment typecheck`
Expected: pas d'erreur.

**Step 6: Commit**

```bash
git add packages/energy-assessment
git commit -m "feat(energy-assessment): add talent_passports scoring bridge"
```

---

### Task 3 : Brancher le pont dans la conclusion de `/api/energy-assessment/answer`

**Files:**
- Modify: `apps/web/src/app/api/energy-assessment/answer/route.ts:123-145`

**Step 1: Modifier la branche "conclude"**

Import à ajouter en haut du fichier :

```ts
import { decideNextStep, findEnergySkill, bridgeConclusionToTalentPassport, type AnsweredQuestion, type EnergyCode } from '@teranga/energy-assessment';
```

Remplacer le bloc `if (decision.action === 'conclude') { ... }` (lignes 123-145 actuelles) par :

```ts
  if (decision.action === 'conclude') {
    const interpretation = buildInterpretation(decision.dominant, decision.secondary);
    const { error: concludeErr } = await admin
      .from('energy_assessments')
      .update({
        status: 'completed',
        dominant_energy: decision.dominant,
        secondary_energies: decision.secondary,
        confidence_state: { share: decision.confidence, forced: decision.forced },
        profile_interpretation: interpretation,
      })
      .eq('id', assessment.id);
    if (concludeErr) return NextResponse.json({ error: concludeErr.message }, { status: 500 });

    // Pont vers talent_passports : passport/page.tsx, boussole/correlation et le
    // matching recrutement lisent déjà ces colonnes et ont besoin de vrais
    // pourcentages par famille, pas seulement d'une dominante qualitative (cf.
    // design doc). N'écrit QUE ces colonnes — dominant_profile et le reste du
    // Talent Passport (H/S/X/L/R, score_global) restent gérés par
    // /api/talent/assessment, qui les upsertera séparément sans écraser ceci.
    const bridge = bridgeConclusionToTalentPassport(decision);
    const { error: bridgeErr } = await admin.from('talent_passports').upsert(
      {
        profile_id: ctx.profileId,
        energy_pilotes: bridge.energyPercentages.pilotes,
        energy_initialiseurs: bridge.energyPercentages.initialiseurs,
        energy_accomplisseurs: bridge.energyPercentages.accomplisseurs,
        energy_dynamiseurs: bridge.energyPercentages.dynamiseurs,
        energy_regulateurs: bridge.energyPercentages.regulateurs,
        dominant_family: bridge.dominantFamily,
        score_energy: bridge.scoreEnergy,
        energy_level: bridge.energyLevel,
      },
      { onConflict: 'profile_id' }
    );
    if (bridgeErr) return NextResponse.json({ error: bridgeErr.message }, { status: 500 });

    return NextResponse.json({
      done: true,
      profile: {
        dominant: findEnergySkill(decision.dominant),
        secondary: decision.secondary.map(findEnergySkill),
        interpretation,
      },
    });
  }
```

**Step 2: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: pas d'erreur.

**Step 3: Commit**

```bash
git add apps/web/src/app/api/energy-assessment/answer/route.ts
git commit -m "feat(api): bridge energy assessment conclusion into talent_passports"
```

---

### Task 4 : Retirer la partie énergie de `lib/talent/assessment.ts`

**Files:**
- Modify: `apps/web/src/lib/talent/assessment.ts`

**Step 1: Retirer les questions E_\* et l'entrée E des steps**

Supprimer le bloc de 10 lignes commençant par `// ── ÉNERGIE (E) — 5 familles × 2 questions ───` (les entrées `E_PIL1` à `E_REG2`) de `QUESTIONS`.

Dans `QUESTION_STEPS`, supprimer la ligne :
```ts
{ key: 'E',   label: 'Profil énergétique',       questions: QUESTIONS.filter(q => q.dim === 'E') },
```

**Step 2: Simplifier `computeAssessment` — ne plus calculer l'énergie**

Retirer de `computeAssessment` :
- Le bloc `// Énergie par famille` et `// Normaliser énergie` (calcul de `energyRaw`/`energy`).
- Le calcul de `dominant_family` et `const E = energyRaw[dominant_family] ?? 0;`.
- Retirer `energy`, `dominant_family`, `energy_level` de l'interface `AssessmentResult` et du `return` — ces valeurs ne sont plus produites par cette fonction, elles sont lues depuis `talent_passports` par l'appelant (Task 5).
- `dominant_profile` n'est plus calculé ICI non plus (dépend de `dominant_family`, désormais fourni par l'appelant) — retirer son calcul de `computeAssessment` et l'ajouter comme paramètre à la fonction à la place.

Nouvelle signature :

```ts
export interface AssessmentResult {
  scores: { H: number; S: number; X: number; L: number; R: number };
  score_global:     number;
  score_risk:       number;
  growth_potential: number;
  transfer_score:   number;
}

export function computeAssessment(
  responses: Record<string, number>,
  energyContext: { dominantFamily: EnergyFamily; scoreEnergy: number }
): AssessmentResult {
  // ... H, S, X, L calculés comme avant ...

  const rQs = QUESTIONS.filter(q => q.dim === 'R');
  const rRaw = rQs.reduce((s, q) => s + (responses[q.id] ?? 3), 0) / rQs.length;
  const R    = Math.round(rRaw * 20);

  const E = energyContext.scoreEnergy;
  const riskPenalty = R > 70 ? 0.10 * Math.pow(R / 100, 2) * 100 : 0.10 * (R / 100) * 100;
  const raw = 0.25 * H + 0.20 * S + 0.15 * X + 0.10 * L + 0.20 * E - riskPenalty;
  const score_global = Math.round(Math.max(0, Math.min(100, raw)));

  const growth_potential = Math.round((S * 0.6 + X * 0.4));
  const transfer_score   = Math.round((H * 0.3 + S * 0.4 + X * 0.3));

  return { scores: { H, S, X, L, R }, score_global, score_risk: R, growth_potential, transfer_score };
}
```

**Step 3 : Exporter `FAMILY_PROFILES`**

`FAMILY_PROFILES` est utilisé par Task 6 pour calculer `dominant_profile` une fois `score_global` connu — le rendre exporté :

```ts
export const FAMILY_PROFILES: Record<EnergyFamily, string[]> = { /* inchangé */ };
```

**Step 4 : Typecheck (attend des erreurs dans les fichiers appelants — normal à ce stade)**

Run: `pnpm --filter web typecheck`
Expected: erreurs dans `apps/web/src/app/api/talent/assessment/route.ts` (utilise encore l'ancienne signature) — corrigé à la Task suivante. Vérifie qu'il n'y a PAS d'autre fichier cassé que celui-là (`grep -rn "computeAssessment" apps/web/src` pour confirmer qu'il n'est appelé que depuis cette route).

**Step 5: Commit**

```bash
git add apps/web/src/lib/talent/assessment.ts
git commit -m "refactor(talent): remove energy computation from computeAssessment"
```

(Commit intermédiaire qui casse le typecheck de la route appelante — acceptable ici car la Task 5 le corrige immédiatement après ; ne pas pousser/déployer entre les deux.)

---

### Task 5 : Adapter `/api/talent/assessment` à la nouvelle signature

**Files:**
- Modify: `apps/web/src/app/api/talent/assessment/route.ts`

**Step 1: Lire le profil énergie existant avant de calculer**

Remplacer le corps de `POST` :

```ts
import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getTalentProfile } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeAssessment, FAMILY_PROFILES, type EnergyFamily } from '@/lib/talent/assessment';

const schema = z.object({
  responses: z.record(z.string(), z.number().min(1).max(5)),
});

export async function POST(req: Request) {
  const user = await requireAuth();
  const ctx = await getTalentProfile(user.id);
  if (!ctx) return NextResponse.json({ error: 'Profil introuvable — complétez l\'onboarding d\'abord.' }, { status: 401 });

  const body = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const admin = createAdminClient();

  // Profil énergie déjà posé par la conclusion de l'Energy Assessment adaptatif
  // (cf. /api/energy-assessment/answer). Si le candidat a sauté cette étape,
  // on retombe sur un défaut neutre — même esprit que l'ancien défaut "3/Neutre"
  // pour une question Likert non répondue.
  const { data: existingPassport } = await admin
    .from('talent_passports')
    .select('dominant_family, score_energy')
    .eq('profile_id', ctx.profileId)
    .maybeSingle();

  const dominantFamily = (existingPassport?.dominant_family as EnergyFamily | undefined) ?? 'pilotes';
  const scoreEnergy    = existingPassport?.score_energy ?? 20;

  const result = computeAssessment(parsed.data.responses, { dominantFamily, scoreEnergy });
  const passportRef = `TP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}-SN`;

  const profileIdx = Math.min(Math.floor(result.score_global / 34), 2);
  const dominantProfileList = FAMILY_PROFILES[dominantFamily] ?? ['Profil Unique'];
  const dominant_profile = dominantProfileList[profileIdx] ?? (dominantProfileList[0] ?? 'Profil Unique');

  const { error } = await admin.from('talent_passports').upsert(
    {
      profile_id:            ctx.profileId,
      score_global:          result.score_global,
      score_hard:            result.scores.H,
      score_soft:            result.scores.S,
      score_exp:             result.scores.X,
      score_life:            result.scores.L,
      score_risk:            result.score_risk,
      growth_potential:      result.growth_potential,
      transfer_score:        result.transfer_score,
      dominant_profile,
      last_assessment:       new Date().toISOString(),
      passport_version:      1,
      passport_id:           passportRef,
      verified:              false,
      soft_communication:    Math.round((parsed.data.responses['S1'] ?? 3) * 20),
      soft_leadership:       Math.round((parsed.data.responses['S2'] ?? 3) * 20),
      soft_adaptability:     Math.round((parsed.data.responses['S3'] ?? 3) * 20),
      soft_problem_solving:  Math.round((parsed.data.responses['S4'] ?? 3) * 20),
      soft_critical_thinking: Math.round((parsed.data.responses['S5'] ?? 3) * 20),
      soft_collaboration:    Math.round((parsed.data.responses['S6'] ?? 3) * 20),
      soft_stress_mgmt:      Math.round((parsed.data.responses['S7'] ?? 3) * 20),
      soft_organization:     Math.round((parsed.data.responses['S8'] ?? 3) * 20),
      soft_learning_speed:   Math.round((parsed.data.responses['S9'] ?? 3) * 20),
      soft_emotional_intel:  Math.round((parsed.data.responses['S10'] ?? 3) * 20),
    },
    { onConflict: 'profile_id' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from('onboarding_progress').upsert({
    profile_id:         ctx.profileId,
    passport_generated: true,
    step_energy_skills: true,
    updated_at:         new Date().toISOString(),
  }, { onConflict: 'profile_id' });

  return NextResponse.json({ ok: true, score_global: result.score_global });
}
```

Notes : `energy_pilotes/initialiseurs/accomplisseurs/dynamiseurs/regulateurs`, `dominant_family`, `score_energy`, `energy_level` sont volontairement ABSENTS de ce payload — l'upsert Supabase ne touche pas les colonnes non listées, donc ce qu'a écrit `/api/energy-assessment/answer` reste intact.

**Step 2: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: pas d'erreur (ni ici ni dans `lib/talent/assessment.ts`).

**Step 3: Commit**

```bash
git add apps/web/src/app/api/talent/assessment/route.ts
git commit -m "fix(api): read energy profile from talent_passports instead of Likert responses"
```

---

### Task 6 : Composant `EnergyStepAdaptive`

**Files:**
- Create: `apps/web/src/components/talent/EnergyStepAdaptive.tsx`

**Step 1: Écrire le composant**

Repris de `apps/web/src/app/(talent)/energy-assessment/EnergyAssessmentClient.tsx` (déjà testé en production), avec deux différences : pas d'écran de démarrage séparé en pleine page (s'intègre dans la carte du wizard), et un callback `onComplete` déclenché à la conclusion pour prévenir `AssessmentForm`.

```tsx
'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface QuestionOption { key: string; text: string; }
interface Question { id: string; text: string; format: 'forced_choice' | 'arbitration'; options: QuestionOption[]; }
interface EnergySkill { code: string; name: string; definition: string; }
interface FinalProfile { dominant: EnergySkill; secondary: EnergySkill[]; interpretation: string; }
type ApiError = string | Record<string, unknown>;
interface StartResponse { assessmentId?: string; question?: Question; error?: ApiError; }
interface AnswerResponse { done?: boolean; question?: Question; profile?: FinalProfile; error?: ApiError; }

function errorMessage(err: ApiError | undefined, fallback: string): string {
  return typeof err === 'string' && err.length > 0 ? err : fallback;
}

interface Props {
  onComplete: () => void;
}

export default function EnergyStepAdaptive({ onComplete }: Props) {
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [profile, setProfile] = useState<FinalProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastAnswerKey, setLastAnswerKey] = useState<string | null>(null);

  function resetToStart() {
    setAssessmentId(null);
    setQuestion(null);
    setProfile(null);
    setError('');
    setLastAnswerKey(null);
  }

  async function start() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/energy-assessment/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentRoute: 'exploration', contextSnapshot: {} }),
      });
      const json = await res.json() as StartResponse;
      if (!res.ok || !json.assessmentId || !json.question) {
        setError(errorMessage(json.error, "Impossible de démarrer l'assessment."));
        return;
      }
      setAssessmentId(json.assessmentId);
      setQuestion(json.question);
      setLastAnswerKey(null);
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  }

  async function answer(answerKey: string) {
    if (!assessmentId || !question) return;
    setLoading(true);
    setError('');
    setLastAnswerKey(answerKey);
    try {
      const res = await fetch('/api/energy-assessment/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, questionId: question.id, answerKey }),
      });
      const json = await res.json() as AnswerResponse;
      if (!res.ok) {
        setError(errorMessage(json.error, 'Une erreur est survenue.'));
        return;
      }
      if (json.done && json.profile) {
        setProfile(json.profile);
        setQuestion(null);
        setLastAnswerKey(null);
        onComplete();
        return;
      }
      if (json.question) {
        setQuestion(json.question);
        setLastAnswerKey(null);
      }
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && (
        <div role="alert" className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-xs mb-4">
          <p>{error}</p>
          {assessmentId && (
            <button onClick={resetToStart} className="mt-2 underline font-semibold hover:text-rose-300 transition-colors">
              Recommencer
            </button>
          )}
        </div>
      )}

      {!assessmentId && !profile && (
        <div className="text-center py-8">
          <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
            Une série de mises en situation pour comprendre votre façon naturelle d&apos;agir — pas de bonne ou mauvaise réponse.
          </p>
          <button onClick={start} disabled={loading}
            className="inline-flex items-center justify-center gap-2 bg-emerald text-white py-3.5 px-6 rounded-xl font-semibold text-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Démarrage…' : 'Commencer'}
          </button>
        </div>
      )}

      {question && (
        <div>
          <p className="text-slate-900 text-sm mb-5">{question.text}</p>
          <div className="space-y-2">
            {question.options.map(opt => (
              <button key={opt.key} onClick={() => answer(opt.key)} disabled={loading}
                className="w-full text-left border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 hover:border-emerald/50 disabled:opacity-50 transition-colors">
                {opt.text}
              </button>
            ))}
          </div>

          {error && lastAnswerKey && (
            <button onClick={() => answer(lastAnswerKey)} disabled={loading}
              className="w-full mt-3 flex items-center justify-center gap-2 bg-emerald/10 border border-emerald/30 text-emerald rounded-xl px-4 py-3 text-sm font-semibold hover:bg-emerald/20 disabled:opacity-50 transition-colors">
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Réessayer
            </button>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 text-slate-400 text-xs mt-4">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Question suivante…
            </div>
          )}
        </div>
      )}

      {profile && (
        <div className="text-center py-8">
          <p className="text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-2">Votre profil</p>
          <h3 className="font-display text-slate-900 text-xl mb-2">{profile.dominant.name}</h3>
          <p className="text-slate-400 text-sm mb-4 max-w-sm mx-auto">{profile.dominant.definition}</p>
          {profile.secondary.length > 0 && (
            <p className="text-slate-600 text-xs mb-4">
              Influence(s) : {profile.secondary.map(s => s.name).join(', ')}
            </p>
          )}
          <p className="text-slate-600 text-xs max-w-sm mx-auto">{profile.interpretation}</p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: pas d'erreur.

**Step 3: Commit**

```bash
git add apps/web/src/components/talent/EnergyStepAdaptive.tsx
git commit -m "feat(ui): add EnergyStepAdaptive component for embedding in AssessmentForm"
```

---

### Task 7 : Brancher `EnergyStepAdaptive` dans `AssessmentForm`

**Files:**
- Modify: `apps/web/src/components/talent/AssessmentForm.tsx`

**Step 1: État + logique de complétion pour l'étape E**

Ajouter l'import et un état :

```tsx
import EnergyStepAdaptive from './EnergyStepAdaptive';
```

```tsx
const [energyStepDone, setEnergyStepDone] = useState(false);
```

**Step 2: Adapter les calculs de complétion**

`stepComplete` et l'indicateur "done" dans la barre d'onglets doivent traiter l'étape `E` spécialement (elle n'a plus de `questions` à compter) :

```tsx
const stepQuestions  = currentStep.questions;
const stepAnswered   = stepQuestions.filter(q => responses[q.id] != null).length;
const stepComplete   = currentStep.key === 'E' ? energyStepDone : stepAnswered === stepQuestions.length;
```

Dans la barre d'onglets (`steps.map`), remplacer le calcul `sDone` :

```tsx
const sDone = s.key === 'E' ? energyStepDone : s.questions.length > 0 && s.questions.filter(q => responses[q.id] != null).length === s.questions.length;
```

Le compteur de progression global (`totalQ`/`answeredQ`) reste basé sur `steps.reduce(...)` — comme `QUESTION_STEPS` n'a plus d'entrée `E` avec des `questions` (Task 4), il ignore déjà naturellement cette étape ; pas de changement nécessaire là.

**Step 3: Rendu conditionnel du bloc questions**

Remplacer le rendu de `stepQuestions.map(...)` par un rendu conditionnel :

```tsx
{currentStep.key === 'E' ? (
  <EnergyStepAdaptive onComplete={() => setEnergyStepDone(true)} />
) : (
  <div className="space-y-8">
    {stepQuestions.map((q, qi) => (
      // ... contenu existant inchangé ...
    ))}
  </div>
)}
```

**Step 4: Vérifier dans le navigateur**

Pas de test automatisé pour ce composant (convention du projet). Lancer le serveur de dev, se connecter avec un compte talent, aller sur `/assessment`, cliquer sur l'onglet "Profil énergétique", vérifier que la boucle adaptative se lance (bouton "Commencer" → question générée → réponse → conclusion), que le bouton "Suivant" devient actif seulement après conclusion, et que les autres onglets fonctionnent comme avant.

Run: `pnpm --filter web build`
Expected: exit code 0.

**Step 5: Commit**

```bash
git add apps/web/src/components/talent/AssessmentForm.tsx
git commit -m "feat(ui): wire EnergyStepAdaptive into the Profil énergétique tab"
```

---

## Ce que ce plan NE couvre PAS (rappel du périmètre)

Soft Skills, Life Score, Risques & bien-être (tranche 2 — nouveau moteur "choix forcé à score unique"), Compétences techniques (tranche 3 — quiz adaptatif), Expérience (hors périmètre, reste déclaratif). La migration Supabase de cette tranche ne nécessite aucun nouveau champ (les colonnes `talent_passports` existent déjà) — rien à appliquer en base au-delà de ce qui l'est déjà.

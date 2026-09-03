# Energy Assessment Adaptatif — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Livrer un module autonome (référentiel + moteur adaptatif déterministe + génération IA de questions + API + UI de restitution) qui fait passer un candidat talent à travers un Energy Assessment adaptatif à 5 dimensions (P/I/D/A/R), sans toucher à l'onboarding ni au score 6D existants.

**Architecture:** Logique pure (référentiel, moteur de décision, validation des réponses IA) dans un nouveau package workspace `@teranga/energy-assessment` (testé en vitest, mirroring `packages/scoring`). Deux routes API dans `apps/web` orchestrent : appellent le moteur pour décider de la prochaine étape, appellent Claude (`lib/ai.ts`) uniquement pour rédiger le texte d'une question déjà entièrement cadrée par le moteur, persistent en base via `createAdminClient()`. Une page candidat autonome consomme ces routes.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (Postgres + RLS), `@anthropic-ai/sdk` (`claude-sonnet-4-6`), Zod, vitest, pnpm workspaces / Turborepo.

**Design source :** [`docs/plans/2026-09-03-energy-assessment-design.md`](2026-09-03-energy-assessment-design.md)

---

## Simplifications assumées pour cette tranche (à valider si en désaccord)

- Formats de question limités à `forced_choice` (5 options, une par énergie) et `arbitration` (2 options, phase discrimination). `free_text` et `confirmation` comme formats distincts sont **hors périmètre** — la phase "confirmation" du PRD est ici un `forced_choice` classique, seul le libellé de phase change.
- L'interprétation finale (`profile_interpretation`) est générée par un template déterministe à partir des définitions du référentiel — pas d'appel IA supplémentaire pour cette tranche (évite un point non-déterministe de plus, testable simplement).
- Seuils numériques (`MIN_QUESTIONS`, `CONFIDENCE_THRESHOLD`, etc.) sont des constantes explicitement documentées comme "pilote, à calibrer" — conforme au PRD §30 qui les laisse ouvertes.

---

### Task 1: Scaffold du package `@teranga/energy-assessment`

**Files:**
- Create: `packages/energy-assessment/package.json`
- Create: `packages/energy-assessment/tsconfig.json`
- Create: `packages/energy-assessment/src/index.ts`
- Modify: `apps/web/package.json` (ajouter la dépendance workspace)
- Modify: `package.json` (racine — ajouter un script `test:energy-assessment`)

**Step 1: Créer le package.json**

```json
{
  "name": "@teranga/energy-assessment",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "vitest": "^2.0.5"
  }
}
```

(Vérifier la version de `zod` réellement utilisée dans `apps/web/package.json` avant de figer le numéro — l'aligner dessus.)

**Step 2: Créer le tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler"
  },
  "include": ["src/**/*.ts"]
}
```

**Step 3: Créer un index.ts placeholder**

```ts
export const PACKAGE_READY = true;
```

**Step 4: Ajouter la dépendance dans apps/web**

Dans `apps/web/package.json`, section `dependencies`, ajouter à côté de `@teranga/scoring` :

```json
"@teranga/energy-assessment": "workspace:*",
```

**Step 5: Ajouter le script de test racine**

Dans `package.json` (racine), à côté de `test:scoring` :

```json
"test:energy-assessment": "turbo run test --filter=@teranga/energy-assessment",
```

**Step 6: Installer**

Run: `pnpm install`
Expected: lockfile mis à jour, pas d'erreur.

**Step 7: Commit**

```bash
git add packages/energy-assessment apps/web/package.json package.json pnpm-lock.yaml
git commit -m "chore: scaffold @teranga/energy-assessment package"
```

---

### Task 2: Référentiel Energy Skills

**Files:**
- Create: `packages/energy-assessment/src/referentiel.ts`
- Test: `packages/energy-assessment/src/referentiel.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { ENERGY_SKILLS, ENERGY_CODES, REFERENTIEL_VERSION, CONTEXT_TAGS } from './referentiel';

describe('referentiel', () => {
  it('expose exactement 5 dimensions Energy Skills', () => {
    expect(ENERGY_SKILLS).toHaveLength(5);
    expect(ENERGY_SKILLS.map(s => s.code).sort()).toEqual(['A', 'D', 'I', 'P', 'R']);
  });

  it('chaque dimension a un nom et une définition non vides', () => {
    for (const skill of ENERGY_SKILLS) {
      expect(skill.name.length).toBeGreaterThan(0);
      expect(skill.definition.length).toBeGreaterThan(0);
    }
  });

  it('ENERGY_CODES correspond aux codes du référentiel', () => {
    expect(ENERGY_CODES.sort()).toEqual(['A', 'D', 'I', 'P', 'R']);
  });

  it('la version du référentiel est figée', () => {
    expect(REFERENTIEL_VERSION).toBe('ENERGY_REF_V1');
  });

  it('expose au moins 5 tags de contexte pour varier les questions', () => {
    expect(CONTEXT_TAGS.length).toBeGreaterThanOrEqual(5);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @teranga/energy-assessment test`
Expected: FAIL — `referentiel.ts` n'existe pas.

**Step 3: Write minimal implementation**

```ts
export const REFERENTIEL_VERSION = 'ENERGY_REF_V1' as const;

export type EnergyCode = 'P' | 'I' | 'D' | 'A' | 'R';

export interface EnergySkillDefinition {
  code: EnergyCode;
  name: string;
  definition: string;
}

export const ENERGY_SKILLS: readonly EnergySkillDefinition[] = [
  { code: 'P', name: 'Pilote',        definition: "Donne une direction, arbitre, décide et réduit l'incertitude par l'orientation." },
  { code: 'I', name: 'Initialiseur',  definition: 'Imagine, explore, ouvre des possibilités, teste et initie.' },
  { code: 'D', name: 'Dynamiseur',    definition: "Mobilise, connecte, crée de l'adhésion et fait circuler l'énergie collective." },
  { code: 'A', name: 'Accomplisseur', definition: 'Transforme objectifs et idées en actions, exécution et résultats.' },
  { code: 'R', name: 'Régulateur',    definition: 'Analyse, structure, sécurise, fiabilise et prévient les risques.' },
] as const;

export const ENERGY_CODES: readonly EnergyCode[] = ENERGY_SKILLS.map(s => s.code);

// Dimensions comportementales transverses (PRD §8) — sous-ensemble utilisé pour
// faire tourner le "décor" des questions et diversifier les contextes observés.
export const CONTEXT_TAGS = [
  'incertitude', 'pression', 'changement', 'collectif', 'decision',
] as const;

export type ContextTag = typeof CONTEXT_TAGS[number];

export const TRANSVERSE_DIMENSIONS = [
  'incertitude', 'pression', 'changement', 'collectif', 'decision',
  'execution', 'innovation', 'risque', 'autonomie', 'resolution_probleme',
] as const;

export function findEnergySkill(code: EnergyCode): EnergySkillDefinition {
  const skill = ENERGY_SKILLS.find(s => s.code === code);
  if (!skill) throw new Error(`Code Energy Skill inconnu: ${code}`);
  return skill;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @teranga/energy-assessment test`
Expected: PASS (5 tests)

**Step 5: Export from index and typecheck**

Dans `packages/energy-assessment/src/index.ts`, remplacer le placeholder par :

```ts
export * from './referentiel';
```

Run: `pnpm --filter @teranga/energy-assessment typecheck`
Expected: pas d'erreur.

**Step 6: Commit**

```bash
git add packages/energy-assessment
git commit -m "feat(energy-assessment): add referentiel with 5 energy skills"
```

---

### Task 3: Moteur adaptatif — types et tally des preuves

**Files:**
- Create: `packages/energy-assessment/src/engine.ts`
- Test: `packages/energy-assessment/src/engine.test.ts`

**Step 1: Write the failing test (tally)**

```ts
import { describe, it, expect } from 'vitest';
import { tallyEvidence, type AnsweredQuestion } from './engine';

describe('tallyEvidence', () => {
  it('retourne un total de 0 pour toutes les énergies quand rien n\'est répondu', () => {
    const evidence = tallyEvidence([]);
    for (const code of ['P', 'I', 'D', 'A', 'R'] as const) {
      expect(evidence[code].total).toBe(0);
      expect(evidence[code].contexts.size).toBe(0);
    }
  });

  it('incrémente le total et les contextes selon la réponse choisie', () => {
    const answered: AnsweredQuestion[] = [
      { dimensionTested: null, hypothesisTested: null, contextTag: 'incertitude',
        energySignals: { opt_P: 'P', opt_I: 'I', opt_D: 'D', opt_A: 'A', opt_R: 'R' },
        candidateAnswer: 'opt_A' },
      { dimensionTested: null, hypothesisTested: null, contextTag: 'pression',
        energySignals: { opt_P: 'P', opt_I: 'I', opt_D: 'D', opt_A: 'A', opt_R: 'R' },
        candidateAnswer: 'opt_A' },
    ];
    const evidence = tallyEvidence(answered);
    expect(evidence.A.total).toBe(2);
    expect(evidence.A.contexts).toEqual(new Set(['incertitude', 'pression']));
    expect(evidence.P.total).toBe(0);
  });

  it('ignore les questions sans réponse', () => {
    const answered: AnsweredQuestion[] = [
      { dimensionTested: null, hypothesisTested: null, contextTag: 'incertitude',
        energySignals: { opt_P: 'P', opt_I: 'I', opt_D: 'D', opt_A: 'A', opt_R: 'R' },
        candidateAnswer: null },
    ];
    const evidence = tallyEvidence(answered);
    expect(evidence.P.total).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @teranga/energy-assessment test`
Expected: FAIL — `engine.ts` n'existe pas.

**Step 3: Write minimal implementation**

```ts
import { ENERGY_CODES, type EnergyCode, type ContextTag } from './referentiel';

export interface AnsweredQuestion {
  dimensionTested: EnergyCode | null;
  hypothesisTested: string | null;
  contextTag: string;
  energySignals: Record<string, EnergyCode>;
  candidateAnswer: string | null;
}

export interface EvidenceEntry {
  total: number;
  contexts: Set<string>;
}

export type EvidenceMap = Record<EnergyCode, EvidenceEntry>;

export function tallyEvidence(answered: AnsweredQuestion[]): EvidenceMap {
  const evidence = Object.fromEntries(
    ENERGY_CODES.map(code => [code, { total: 0, contexts: new Set<string>() }])
  ) as EvidenceMap;

  for (const q of answered) {
    if (!q.candidateAnswer) continue;
    const code = q.energySignals[q.candidateAnswer];
    if (!code) continue;
    evidence[code].total += 1;
    evidence[code].contexts.add(q.contextTag);
  }

  return evidence;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @teranga/energy-assessment test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/energy-assessment/src/engine.ts packages/energy-assessment/src/engine.test.ts
git commit -m "feat(energy-assessment): add evidence tally"
```

---

### Task 4: Moteur adaptatif — phase Exploration

**Files:**
- Modify: `packages/energy-assessment/src/engine.ts`
- Test: `packages/energy-assessment/src/engine.test.ts`

**Step 1: Write the failing test**

```ts
import { decideNextStep, BROAD_SIGNALS, CONTEXT_TAGS } from './engine';
// (BROAD_SIGNALS et CONTEXT_TAGS déjà exportés par referentiel/engine — ajuster l'import réel)

describe('decideNextStep — phase exploration', () => {
  it('démarre en exploration avec les 5 énergies proposées', () => {
    const decision = decideNextStep([]);
    expect(decision.action).toBe('ask');
    if (decision.action !== 'ask') throw new Error('unreachable');
    expect(decision.phase).toBe('exploration');
    expect(decision.dimensionTested).toBeNull();
    expect(Object.values(decision.energySignals).sort()).toEqual(['A', 'D', 'I', 'P', 'R']);
    expect(decision.contextTag).toBe(CONTEXT_TAGS[0]);
  });

  it('reste en exploration tant que les 5 énergies n\'ont pas toutes au moins 1 preuve', () => {
    const answered: AnsweredQuestion[] = Array.from({ length: 4 }, (_, i) => ({
      dimensionTested: null, hypothesisTested: null, contextTag: CONTEXT_TAGS[i % CONTEXT_TAGS.length],
      energySignals: BROAD_SIGNALS, candidateAnswer: 'opt_P', // toujours P → I/D/A/R jamais couverts
    }));
    const decision = decideNextStep(answered);
    expect(decision.action).toBe('ask');
    if (decision.action !== 'ask') throw new Error('unreachable');
    expect(decision.phase).toBe('exploration');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @teranga/energy-assessment test`
Expected: FAIL — `decideNextStep` n'existe pas.

**Step 3: Write minimal implementation**

Ajouter à `engine.ts` :

```ts
export const CONTEXT_TAGS_CYCLE = ['incertitude', 'pression', 'changement', 'collectif', 'decision'] as const;

export const BROAD_SIGNALS: Record<string, EnergyCode> = {
  opt_P: 'P', opt_I: 'I', opt_D: 'D', opt_A: 'A', opt_R: 'R',
};

export const MIN_QUESTIONS = 12;
export const MAX_QUESTIONS = 20;
export const CONFIDENCE_THRESHOLD = 0.65;
export const MIN_CONTEXTS_FOR_DOMINANT = 2;
export const CLOSE_GAP = 1;

export type Phase = 'exploration' | 'discrimination' | 'confirmation';

export interface AskAction {
  action: 'ask';
  phase: Phase;
  dimensionTested: EnergyCode | null;
  hypothesisTested: string | null;
  energySignals: Record<string, EnergyCode>;
  contextTag: string;
}

export interface ConcludeAction {
  action: 'conclude';
  dominant: EnergyCode;
  secondary: EnergyCode[];
  confidence: number;
  forced: boolean;
}

export type EngineDecision = AskAction | ConcludeAction;

function nextContextTag(answeredCount: number): string {
  return CONTEXT_TAGS_CYCLE[answeredCount % CONTEXT_TAGS_CYCLE.length];
}

function rankEvidence(evidence: EvidenceMap) {
  return ENERGY_CODES
    .map(code => ({ code, total: evidence[code].total, contextCount: evidence[code].contexts.size }))
    .sort((a, b) => b.total - a.total);
}

export function decideNextStep(answered: AnsweredQuestion[]): EngineDecision {
  const count = answered.length;
  const evidence = tallyEvidence(answered);
  const ranked = rankEvidence(evidence);
  const contextTag = nextContextTag(count);

  const allCovered = ranked.every(r => r.total >= 1);
  if (!allCovered || count < 5) {
    return {
      action: 'ask', phase: 'exploration',
      dimensionTested: null, hypothesisTested: null,
      energySignals: BROAD_SIGNALS, contextTag,
    };
  }

  // Phases suivantes : implémentées à la Task 5.
  throw new Error('not implemented past exploration');
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @teranga/energy-assessment test`
Expected: PASS pour les 2 tests exploration (les autres tests de la tâche 5 pas encore écrits).

**Step 5: Commit**

```bash
git add packages/energy-assessment/src/engine.ts packages/energy-assessment/src/engine.test.ts
git commit -m "feat(energy-assessment): engine exploration phase"
```

---

### Task 5: Moteur adaptatif — discrimination, confirmation, conclusion

**Files:**
- Modify: `packages/energy-assessment/src/engine.ts`
- Test: `packages/energy-assessment/src/engine.test.ts`

**Step 1: Write the failing tests**

```ts
function answeredFor(code: EnergyCode, contextTag: string): AnsweredQuestion {
  return {
    dimensionTested: null, hypothesisTested: null, contextTag,
    energySignals: BROAD_SIGNALS, candidateAnswer: `opt_${code}`,
  };
}

describe('decideNextStep — discrimination', () => {
  it('bascule en discrimination quand deux énergies sont proches après couverture complète', () => {
    // Couvre les 5 énergies, avec A et P proches (2 vs 2) et les autres à 1
    const answered: AnsweredQuestion[] = [
      answeredFor('A', 'incertitude'), answeredFor('A', 'pression'),
      answeredFor('P', 'changement'), answeredFor('P', 'collectif'),
      answeredFor('I', 'decision'), answeredFor('D', 'incertitude'), answeredFor('R', 'pression'),
    ];
    const decision = decideNextStep(answered);
    expect(decision.action).toBe('ask');
    if (decision.action !== 'ask') throw new Error('unreachable');
    expect(decision.phase).toBe('discrimination');
    expect(decision.hypothesisTested).toBe('A-P');
    expect(Object.values(decision.energySignals).sort()).toEqual(['A', 'P']);
  });
});

describe('decideNextStep — confirmation', () => {
  it('bascule en confirmation quand un leader est net mais count < MIN_QUESTIONS', () => {
    const answered: AnsweredQuestion[] = [
      answeredFor('A', 'incertitude'), answeredFor('A', 'pression'), answeredFor('A', 'changement'),
      answeredFor('P', 'collectif'), answeredFor('I', 'decision'),
      answeredFor('D', 'incertitude'), answeredFor('R', 'pression'),
    ];
    const decision = decideNextStep(answered);
    expect(decision.action).toBe('ask');
    if (decision.action !== 'ask') throw new Error('unreachable');
    expect(decision.phase).toBe('confirmation');
    expect(decision.dimensionTested).toBe('A');
  });
});

describe('decideNextStep — conclusion', () => {
  it('conclut quand le seuil de confiance et le nombre de contextes sont atteints après MIN_QUESTIONS', () => {
    const contexts = ['incertitude', 'pression', 'changement', 'collectif', 'decision'];
    const answered: AnsweredQuestion[] = [
      ...Array.from({ length: 8 }, (_, i) => answeredFor('A', contexts[i % contexts.length])),
      answeredFor('P', 'incertitude'), answeredFor('I', 'pression'),
      answeredFor('D', 'changement'), answeredFor('R', 'collectif'),
    ];
    const decision = decideNextStep(answered);
    expect(decision.action).toBe('conclude');
    if (decision.action !== 'conclude') throw new Error('unreachable');
    expect(decision.dominant).toBe('A');
    expect(decision.forced).toBe(false);
  });

  it('force la conclusion à MAX_QUESTIONS même sans seuil de confiance atteint', () => {
    const contexts = ['incertitude', 'pression', 'changement', 'collectif', 'decision'];
    const answered: AnsweredQuestion[] = Array.from({ length: 20 }, (_, i) =>
      answeredFor((['A', 'P', 'I', 'D', 'R'] as const)[i % 5], contexts[i % contexts.length])
    );
    const decision = decideNextStep(answered);
    expect(decision.action).toBe('conclude');
    if (decision.action !== 'conclude') throw new Error('unreachable');
    expect(decision.forced).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @teranga/energy-assessment test`
Expected: FAIL — `throw new Error('not implemented past exploration')`.

**Step 3: Write minimal implementation**

Remplacer la ligne `throw new Error('not implemented past exploration');` dans `decideNextStep` par :

```ts
  const leader = ranked[0];
  const challenger = ranked[1];
  const gap = leader.total - challenger.total;
  const totalEvidence = ranked.reduce((sum, r) => sum + r.total, 0);
  const share = totalEvidence > 0 ? leader.total / totalEvidence : 0;

  const canConclude =
    count >= MIN_QUESTIONS &&
    share >= CONFIDENCE_THRESHOLD &&
    leader.contextCount >= MIN_CONTEXTS_FOR_DOMINANT &&
    gap > CLOSE_GAP;

  const secondaryOf = (leaderCode: EnergyCode, leaderTotal: number) =>
    ranked
      .filter(r => r.code !== leaderCode && r.total > 0 && leaderTotal - r.total <= CLOSE_GAP)
      .map(r => r.code);

  if (canConclude) {
    return {
      action: 'conclude', dominant: leader.code,
      secondary: secondaryOf(leader.code, leader.total),
      confidence: share, forced: false,
    };
  }

  if (count >= MAX_QUESTIONS) {
    return {
      action: 'conclude', dominant: leader.code,
      secondary: secondaryOf(leader.code, leader.total),
      confidence: share, forced: true,
    };
  }

  if (gap <= CLOSE_GAP) {
    return {
      action: 'ask', phase: 'discrimination',
      dimensionTested: leader.code, hypothesisTested: `${leader.code}-${challenger.code}`,
      energySignals: { opt_1: leader.code, opt_2: challenger.code },
      contextTag,
    };
  }

  return {
    action: 'ask', phase: 'confirmation',
    dimensionTested: leader.code, hypothesisTested: leader.code,
    energySignals: BROAD_SIGNALS, contextTag,
  };
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @teranga/energy-assessment test`
Expected: PASS — tous les tests engine.test.ts (exploration + discrimination + confirmation + conclusion).

**Step 5: Export and typecheck**

Ajouter dans `packages/energy-assessment/src/index.ts` :

```ts
export * from './engine';
```

Run: `pnpm --filter @teranga/energy-assessment typecheck`
Expected: pas d'erreur.

**Step 6: Commit**

```bash
git add packages/energy-assessment
git commit -m "feat(energy-assessment): engine discrimination/confirmation/conclusion phases"
```

---

### Task 6: Validation des questions générées par l'IA

**Files:**
- Create: `packages/energy-assessment/src/validation.ts`
- Test: `packages/energy-assessment/src/validation.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { validateGeneratedQuestion } from './validation';

const signals = { opt_P: 'P', opt_I: 'I', opt_D: 'D', opt_A: 'A', opt_R: 'R' } as const;

describe('validateGeneratedQuestion', () => {
  it('accepte une réponse IA conforme au contrat', () => {
    const raw = {
      question_text: 'Votre équipe hésite sur la suite à donner. Que faites-vous en premier ?',
      question_format: 'forced_choice',
      options: [
        { key: 'opt_P', text: 'Je propose une direction claire.' },
        { key: 'opt_I', text: "J'explore une autre approche possible." },
        { key: 'opt_D', text: "Je réunis l'équipe pour trancher ensemble." },
        { key: 'opt_A', text: 'Je lance une première action concrète.' },
        { key: 'opt_R', text: "J'analyse les risques avant d'agir." },
      ],
    };
    const result = validateGeneratedQuestion(raw, signals);
    expect(result).not.toBeNull();
    expect(result?.options).toHaveLength(5);
  });

  it('rejette une réponse avec une clé d\'option manquante', () => {
    const raw = {
      question_text: 'Question incomplète',
      question_format: 'forced_choice',
      options: [{ key: 'opt_P', text: 'Direction.' }],
    };
    expect(validateGeneratedQuestion(raw, signals)).toBeNull();
  });

  it('rejette une réponse avec une clé d\'option inconnue', () => {
    const raw = {
      question_text: 'Question',
      question_format: 'arbitration',
      options: [{ key: 'opt_X', text: 'Invalide.' }, { key: 'opt_P', text: 'Direction.' }],
    };
    expect(validateGeneratedQuestion(raw, { opt_1: 'P', opt_2: 'A' })).toBeNull();
  });

  it('rejette un texte de question vide', () => {
    const raw = { question_text: '', question_format: 'forced_choice', options: [] };
    expect(validateGeneratedQuestion(raw, signals)).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @teranga/energy-assessment test`
Expected: FAIL — `validation.ts` n'existe pas.

**Step 3: Write minimal implementation**

```ts
import { z } from 'zod';
import type { EnergyCode } from './referentiel';

const RawQuestionSchema = z.object({
  question_text: z.string().min(1).max(500),
  question_format: z.enum(['forced_choice', 'arbitration']),
  options: z.array(z.object({
    key: z.string().min(1),
    text: z.string().min(1).max(300),
  })),
});

export interface ValidatedOption {
  key: string;
  text: string;
  energyCode: EnergyCode;
}

export interface ValidatedQuestion {
  questionText: string;
  questionFormat: 'forced_choice' | 'arbitration';
  options: ValidatedOption[];
}

export function validateGeneratedQuestion(
  raw: unknown,
  expectedSignals: Record<string, EnergyCode>
): ValidatedQuestion | null {
  const parsed = RawQuestionSchema.safeParse(raw);
  if (!parsed.success) return null;

  const expectedKeys = Object.keys(expectedSignals).sort();
  const actualKeys = parsed.data.options.map(o => o.key).sort();
  if (JSON.stringify(expectedKeys) !== JSON.stringify(actualKeys)) return null;

  return {
    questionText: parsed.data.question_text,
    questionFormat: parsed.data.question_format,
    options: parsed.data.options.map(o => ({
      key: o.key,
      text: o.text,
      energyCode: expectedSignals[o.key],
    })),
  };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @teranga/energy-assessment test`
Expected: PASS

**Step 5: Export and typecheck**

Ajouter dans `packages/energy-assessment/src/index.ts` :

```ts
export * from './validation';
```

Ajouter `zod` en dépendance si pas déjà fait (Task 1).

Run: `pnpm --filter @teranga/energy-assessment typecheck`
Expected: pas d'erreur.

**Step 6: Commit**

```bash
git add packages/energy-assessment
git commit -m "feat(energy-assessment): validate AI-generated questions against engine contract"
```

---

### Task 7: Migration Supabase — tables `energy_assessments` / `energy_assessment_questions`

**Files:**
- Create: `supabase/migrations/006_energy_assessment.sql`

**Step 1: Écrire la migration**

```sql
-- ============================================================
-- TERANGA ALIGN — Energy Assessment Adaptatif
-- Migration 006 : tables autonomes, non liées à talent_passports
-- ============================================================

CREATE TABLE public.energy_assessments (
  id                          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id                  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assessment_route            TEXT        NOT NULL DEFAULT 'exploration'
                                          CHECK (assessment_route IN ('job_application','target_role','exploration')),
  job_reference_id            UUID,
  candidate_context_snapshot  JSONB       NOT NULL DEFAULT '{}',
  status                      TEXT        NOT NULL DEFAULT 'in_progress'
                                          CHECK (status IN ('in_progress','completed')),
  dominant_energy             TEXT,
  secondary_energies          JSONB       NOT NULL DEFAULT '[]',
  confidence_state            JSONB,
  profile_interpretation      TEXT,
  reference_version           TEXT        NOT NULL DEFAULT 'ENERGY_REF_V1',
  inference_version           TEXT        NOT NULL DEFAULT 'ENGINE_V1',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.energy_assessment_questions (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id      UUID        NOT NULL REFERENCES public.energy_assessments(id) ON DELETE CASCADE,
  phase              TEXT        NOT NULL CHECK (phase IN ('exploration','discrimination','confirmation')),
  question_text      TEXT        NOT NULL,
  question_format    TEXT        NOT NULL CHECK (question_format IN ('forced_choice','arbitration')),
  dimension_tested   TEXT,
  hypothesis_tested  TEXT,
  energy_signals     JSONB       NOT NULL,
  candidate_answer   TEXT,
  response_timestamp TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_energy_assessments_profile ON public.energy_assessments(profile_id);
CREATE INDEX idx_energy_assessment_questions_assessment ON public.energy_assessment_questions(assessment_id);

CREATE TRIGGER trg_energy_assessments_updated_at
  BEFORE UPDATE ON public.energy_assessments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.energy_assessments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_assessment_questions ENABLE ROW LEVEL SECURITY;

-- Le candidat voit/modifie uniquement ses propres passations
-- (jointure via profiles.user_id — profiles.id n'est PAS auth.uid()).
CREATE POLICY "ea_own_select" ON public.energy_assessments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = energy_assessments.profile_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "ea_own_insert" ON public.energy_assessments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = energy_assessments.profile_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "ea_own_update" ON public.energy_assessments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = energy_assessments.profile_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "eaq_own" ON public.energy_assessment_questions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.energy_assessments ea
    JOIN public.profiles p ON p.id = ea.profile_id
    WHERE ea.id = energy_assessment_questions.assessment_id AND p.user_id = auth.uid()
  ));

-- Super admin : accès total pour revue/audit
CREATE POLICY "ea_superadmin" ON public.energy_assessments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin'
  ));
CREATE POLICY "eaq_superadmin" ON public.energy_assessment_questions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin'
  ));
```

**Step 2: Vérifier avant application**

⚠️ Ne pas appliquer aveuglément : le schéma réel en base a déjà divergé des fichiers de migration sur disque par le passé (`profiles.workos_user_id` présent en migration 001 mais absent en base réelle, `user_id` présent en base mais pas en migration). Avant d'exécuter cette migration :
1. Vérifier via le MCP Supabase (`list_tables` / `execute_sql` sur `information_schema.columns`) que `public.profiles` a bien une colonne `user_id UUID REFERENCES auth.users(id)` en base réelle (confirmé le 2026-09-03 dans cette conversation — à revérifier si le temps a passé).
2. Vérifier qu'aucune table `energy_assessments` n'existe déjà (nom neuf, collision improbable).
3. Appliquer via `mcp__*_Supabase__apply_migration` (nom exact de l'outil à confirmer selon connexion MCP active) ou `supabase db push` / dashboard SQL editor si le MCP n'est pas connecté.

**Step 3: Commit**

```bash
git add supabase/migrations/006_energy_assessment.sql
git commit -m "feat(db): add energy_assessments and energy_assessment_questions tables"
```

(Le commit versionne le fichier ; l'application effective en base est une étape d'exécution séparée, à confirmer avec l'utilisateur avant de la lancer contre le projet Supabase `oqrgmldwealqihlwvepc`.)

---

### Task 8: Génération de questions par IA

**Files:**
- Modify: `apps/web/src/lib/ai.ts`

**Step 1: Ajouter la fonction**

Ajouter en fin de fichier, en suivant le pattern existant (server-side uniquement, modèle `claude-sonnet-4-6`, JSON strict) :

```ts
import { validateGeneratedQuestion, type ValidatedQuestion } from '@teranga/energy-assessment';
import type { EnergyCode } from '@teranga/energy-assessment';

// 5. Génération d'une question Energy Assessment
// L'IA ne choisit NI la dimension testée NI le mapping option→énergie : ces
// deux éléments sont décidés par le moteur déterministe (packages/energy-assessment)
// et transmis ici en contrainte. L'IA rédige uniquement le texte.
export async function generateEnergyQuestion(
  contextSnapshot: Record<string, unknown>,
  phase: 'exploration' | 'discrimination' | 'confirmation',
  contextTag: string,
  energySignals: Record<string, EnergyCode>
): Promise<ValidatedQuestion | null> {
  const optionKeys = Object.keys(energySignals);

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: `Expert RH. Tu rédiges UNE question de mise en situation professionnelle pour un
             assessment comportemental. Contrainte stricte : tu ne dois PAS choisir quelles
             dimensions sont testées ni les associer à un chiffre — cela t'est déjà imposé.
             Chaque option doit décrire un comportement professionnellement légitime, sans
             révéler quelle "énergie" elle mesure. Réponds UNIQUEMENT en JSON valide, sans markdown.`,
    messages: [{
      role: 'user',
      content: `Contexte candidat: ${JSON.stringify(contextSnapshot)}
Phase: ${phase}
Tag de contexte à utiliser pour le décor de la situation: ${contextTag}
Clés d'options obligatoires (dans cet ordre, une phrase par clé): ${optionKeys.join(', ')}

JSON attendu:
{"question_text":"string","question_format":"${optionKeys.length === 2 ? 'arbitration' : 'forced_choice'}",
 "options":[${optionKeys.map(k => `{"key":"${k}","text":"string"}`).join(',')}]}`,
    }],
  });

  const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '{}';
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return null; }

  return validateGeneratedQuestion(raw, energySignals);
}
```

**Step 2: Typecheck**

Run: `pnpm --filter web typecheck` (ou `cd apps/web && pnpm typecheck` selon le nom du filtre réel — vérifier dans `package.json` racine)
Expected: pas d'erreur.

**Step 3: Commit**

```bash
git add apps/web/src/lib/ai.ts
git commit -m "feat(ai): add generateEnergyQuestion constrained by the deterministic engine"
```

---

### Task 9: Route API `POST /api/energy-assessment/start`

**Files:**
- Create: `apps/web/src/app/api/energy-assessment/start/route.ts`

**Step 1: Écrire la route**

Suit le pattern de `apps/web/src/app/api/talent/assessment/route.ts` (`requireAuth` + `getTalentProfile` + `createAdminClient`).

```ts
import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getTalentProfile } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { decideNextStep } from '@teranga/energy-assessment';
import { generateEnergyQuestion } from '@/lib/ai';

const schema = z.object({
  assessmentRoute: z.enum(['job_application', 'target_role', 'exploration']).default('exploration'),
  jobReferenceId: z.string().uuid().optional(),
  contextSnapshot: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(req: Request) {
  const user = await requireAuth();
  const ctx = await getTalentProfile(user.id);
  if (!ctx) return NextResponse.json({ error: 'Profil introuvable — complétez l\'onboarding d\'abord.' }, { status: 401 });

  const body = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const decision = decideNextStep([]);
  if (decision.action !== 'ask') {
    return NextResponse.json({ error: 'Le moteur ne peut pas démarrer sans question.' }, { status: 500 });
  }

  const generated = await generateEnergyQuestion(
    parsed.data.contextSnapshot, decision.phase, decision.contextTag, decision.energySignals
  );
  if (!generated) return NextResponse.json({ error: 'Échec de génération de la question.' }, { status: 502 });

  const admin = createAdminClient();

  const { data: assessment, error: assessmentErr } = await admin
    .from('energy_assessments')
    .insert({
      profile_id: ctx.profileId,
      assessment_route: parsed.data.assessmentRoute,
      job_reference_id: parsed.data.jobReferenceId ?? null,
      candidate_context_snapshot: parsed.data.contextSnapshot,
    })
    .select('id')
    .single();
  if (assessmentErr || !assessment) {
    return NextResponse.json({ error: assessmentErr?.message ?? 'Création impossible' }, { status: 500 });
  }

  const { data: question, error: questionErr } = await admin
    .from('energy_assessment_questions')
    .insert({
      assessment_id: assessment.id,
      phase: decision.phase,
      question_text: generated.questionText,
      question_format: generated.questionFormat,
      dimension_tested: decision.dimensionTested,
      hypothesis_tested: decision.hypothesisTested,
      energy_signals: decision.energySignals,
    })
    .select('id, question_text, question_format')
    .single();
  if (questionErr || !question) {
    return NextResponse.json({ error: questionErr?.message ?? 'Création question impossible' }, { status: 500 });
  }

  // Ne JAMAIS renvoyer energy_signals (mapping option → énergie) au client.
  return NextResponse.json({
    assessmentId: assessment.id,
    question: {
      id: question.id,
      text: question.question_text,
      format: question.question_format,
      options: generated.options.map(o => ({ key: o.key, text: o.text })),
    },
  });
}
```

**Step 2: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: pas d'erreur.

**Step 3: Commit**

```bash
git add apps/web/src/app/api/energy-assessment/start
git commit -m "feat(api): add POST /api/energy-assessment/start"
```

---

### Task 10: Route API `POST /api/energy-assessment/answer`

**Files:**
- Create: `apps/web/src/app/api/energy-assessment/answer/route.ts`

**Step 1: Écrire la route**

```ts
import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getTalentProfile } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { decideNextStep, findEnergySkill, type AnsweredQuestion, type EnergyCode } from '@teranga/energy-assessment';
import { generateEnergyQuestion } from '@/lib/ai';

const schema = z.object({
  assessmentId: z.string().uuid(),
  questionId: z.string().uuid(),
  answerKey: z.string().min(1),
});

function buildInterpretation(dominant: EnergyCode, secondary: EnergyCode[]): string {
  const dominantSkill = findEnergySkill(dominant);
  const parts = [`Dominante : ${dominantSkill.name}. ${dominantSkill.definition}`];
  if (secondary.length > 0) {
    const names = secondary.map(code => findEnergySkill(code).name).join(', ');
    parts.push(`Influence(s) : ${names}.`);
  }
  return parts.join(' ');
}

export async function POST(req: Request) {
  const user = await requireAuth();
  const ctx = await getTalentProfile(user.id);
  if (!ctx) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 401 });

  const body = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const admin = createAdminClient();

  const { data: assessment, error: assessmentErr } = await admin
    .from('energy_assessments')
    .select('id, profile_id, status, candidate_context_snapshot')
    .eq('id', parsed.data.assessmentId)
    .maybeSingle();
  if (assessmentErr || !assessment) return NextResponse.json({ error: 'Passation introuvable.' }, { status: 404 });
  if (assessment.profile_id !== ctx.profileId) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
  if (assessment.status === 'completed') return NextResponse.json({ error: 'Passation déjà terminée.' }, { status: 409 });

  // Enregistrer la réponse à la question courante
  const { data: currentQuestion, error: currentErr } = await admin
    .from('energy_assessment_questions')
    .select('id, energy_signals, candidate_answer')
    .eq('id', parsed.data.questionId)
    .eq('assessment_id', assessment.id)
    .maybeSingle();
  if (currentErr || !currentQuestion) return NextResponse.json({ error: 'Question introuvable.' }, { status: 404 });
  if (currentQuestion.candidate_answer) return NextResponse.json({ error: 'Question déjà répondue.' }, { status: 409 });
  if (!(parsed.data.answerKey in (currentQuestion.energy_signals as Record<string, string>))) {
    return NextResponse.json({ error: 'Réponse invalide.' }, { status: 400 });
  }

  const { error: updateErr } = await admin
    .from('energy_assessment_questions')
    .update({ candidate_answer: parsed.data.answerKey, response_timestamp: new Date().toISOString() })
    .eq('id', currentQuestion.id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Reconstruire l'historique pour le moteur
  const { data: allQuestions, error: allErr } = await admin
    .from('energy_assessment_questions')
    .select('dimension_tested, hypothesis_tested, energy_signals, candidate_answer, phase')
    .eq('assessment_id', assessment.id)
    .order('created_at', { ascending: true });
  if (allErr || !allQuestions) return NextResponse.json({ error: allErr?.message ?? 'Lecture impossible' }, { status: 500 });

  const answered: AnsweredQuestion[] = allQuestions.map(q => ({
    dimensionTested: q.dimension_tested as EnergyCode | null,
    hypothesisTested: q.hypothesis_tested,
    contextTag: q.phase, // approximation acceptable : le contexte réel n'est pas stocké séparément dans cette tranche
    energySignals: q.energy_signals as Record<string, EnergyCode>,
    candidateAnswer: q.candidate_answer,
  }));

  const decision = decideNextStep(answered);

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

    return NextResponse.json({
      done: true,
      profile: {
        dominant: findEnergySkill(decision.dominant),
        secondary: decision.secondary.map(findEnergySkill),
        interpretation,
      },
    });
  }

  const generated = await generateEnergyQuestion(
    assessment.candidate_context_snapshot as Record<string, unknown>,
    decision.phase, decision.contextTag, decision.energySignals
  );
  if (!generated) return NextResponse.json({ error: 'Échec de génération de la question suivante.' }, { status: 502 });

  const { data: nextQuestion, error: nextErr } = await admin
    .from('energy_assessment_questions')
    .insert({
      assessment_id: assessment.id,
      phase: decision.phase,
      question_text: generated.questionText,
      question_format: generated.questionFormat,
      dimension_tested: decision.dimensionTested,
      hypothesis_tested: decision.hypothesisTested,
      energy_signals: decision.energySignals,
    })
    .select('id, question_text, question_format')
    .single();
  if (nextErr || !nextQuestion) return NextResponse.json({ error: nextErr?.message ?? 'Création impossible' }, { status: 500 });

  return NextResponse.json({
    done: false,
    question: {
      id: nextQuestion.id,
      text: nextQuestion.question_text,
      format: nextQuestion.question_format,
      options: generated.options.map(o => ({ key: o.key, text: o.text })),
    },
  });
}
```

**Step 2: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: pas d'erreur.

**Step 3: Commit**

```bash
git add apps/web/src/app/api/energy-assessment/answer
git commit -m "feat(api): add POST /api/energy-assessment/answer"
```

---

### Task 11: Page candidat autonome

**Files:**
- Create: `apps/web/src/app/(talent)/energy-assessment/page.tsx`

**Step 1: Écrire la page**

Client component, calque le style de `sign-up/page.tsx` (mêmes classes Tailwind : `bg-bg`, `bg-card`, `border-slate-200`, `bg-emerald`, `rounded-xl`). Trois états : démarrage (bouton "Commencer"), question en cours (options cliquables ou texte selon `question.format`), écran final (révélation dominante/influence, sans aucun pourcentage).

```tsx
'use client';

import { useState } from 'react';

interface Question {
  id: string;
  text: string;
  format: 'forced_choice' | 'arbitration';
  options: { key: string; text: string }[];
}

interface FinalProfile {
  dominant: { code: string; name: string; definition: string };
  secondary: { code: string; name: string; definition: string }[];
  interpretation: string;
}

export default function EnergyAssessmentPage() {
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [profile, setProfile] = useState<FinalProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/energy-assessment/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentRoute: 'exploration', contextSnapshot: {} }),
      });
      const json = await res.json() as { assessmentId?: string; question?: Question; error?: string };
      if (!res.ok || !json.assessmentId || !json.question) {
        setError(json.error ?? 'Impossible de démarrer l\'assessment.');
        return;
      }
      setAssessmentId(json.assessmentId);
      setQuestion(json.question);
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
    try {
      const res = await fetch('/api/energy-assessment/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, questionId: question.id, answerKey }),
      });
      const json = await res.json() as { done?: boolean; question?: Question; profile?: FinalProfile; error?: string };
      if (!res.ok) { setError(json.error ?? 'Erreur.'); return; }
      if (json.done && json.profile) { setProfile(json.profile); setQuestion(null); return; }
      if (json.question) setQuestion(json.question);
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-xs mb-4">
            {error}
          </div>
        )}

        {!assessmentId && !profile && (
          <div className="text-center">
            <h1 className="font-display text-slate-900 text-2xl mb-4">Energy Assessment</h1>
            <p className="text-slate-400 text-sm mb-6">
              Une série de mises en situation pour comprendre votre façon naturelle d&apos;agir.
            </p>
            <button onClick={start} disabled={loading}
              className="bg-emerald text-white py-3.5 px-6 rounded-xl font-semibold text-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors">
              {loading ? 'Démarrage…' : 'Commencer'}
            </button>
          </div>
        )}

        {question && (
          <div className="bg-card border border-slate-200 rounded-xl p-6">
            <p className="text-slate-900 text-sm mb-5">{question.text}</p>
            <div className="space-y-2">
              {question.options.map(opt => (
                <button key={opt.key} onClick={() => answer(opt.key)} disabled={loading}
                  className="w-full text-left border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 hover:border-emerald/50 disabled:opacity-50 transition-colors">
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {profile && (
          <div className="text-center">
            <h1 className="font-display text-slate-900 text-2xl mb-2">Votre Energy Profile</h1>
            <p className="text-emerald font-semibold text-lg mb-1">{profile.dominant.name}</p>
            <p className="text-slate-400 text-sm mb-4">{profile.dominant.definition}</p>
            {profile.secondary.length > 0 && (
              <p className="text-slate-600 text-xs mb-4">
                Influence(s) : {profile.secondary.map(s => s.name).join(', ')}
              </p>
            )}
            <p className="text-slate-600 text-xs">{profile.interpretation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Vérifier dans le navigateur**

Run: `pnpm --filter web dev` (depuis `apps/web`, ou `cd apps/web && pnpm dev`)
Ouvrir `http://localhost:3000/energy-assessment`, se connecter avec un compte talent de test, dérouler le flux jusqu'à l'écran final.
Expected: le flux se déroule sans erreur console, aucune donnée `energy_signals`/mapping n'apparaît dans les requêtes réseau renvoyées au client (vérifier l'onglet Network).

**Step 3: Build**

Run: `pnpm --filter web build`
Expected: exit code 0, route `/energy-assessment` listée dans la sortie.

**Step 4: Commit**

```bash
git add apps/web/src/app/(talent)/energy-assessment
git commit -m "feat(ui): add standalone Energy Assessment candidate page"
```

---

## Ce que ce plan NE couvre PAS (rappel du périmètre)

Technical Assessment, Target Energy / Energy Alignment côté recruteur, questions d'entretien générées, branchement dans l'onboarding, remplacement du "Score 6D" affiché au recruteur — voir le design doc pour le hors-périmètre complet.

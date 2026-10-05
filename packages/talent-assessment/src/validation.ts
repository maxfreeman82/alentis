import { z } from 'zod';
import type { ClientQuestion } from './types';

// Pare-feu entre le moteur et le JSON libre de l'IA : `.strict()` aux deux
// niveaux pour qu'aucune valeur/score ne puisse être glissé par l'IA.
const RawSchema = z.object({
  question_text: z.string().trim().min(1).max(700),
  options: z.array(
    z.object({
      key:  z.string().min(1),
      text: z.string().trim().min(1).max(300),
    }).strict(),
  ),
}).strict();

// Biais de longueur : constaté avec le modèle réel, la meilleure réaction était
// la plus longue dans 4 cas sur 5 — un candidat la repère sans rien savoir.
// Elle ne doit pas dépasser le plus long distracteur de plus de ce ratio.
export const MAX_BEST_LENGTH_RATIO = 1.1;

export function bestOptionStandsOut(question: ClientQuestion, optionValues: Record<string, number>): boolean {
  const best = question.options.find(o => optionValues[o.key] === 1);
  const others = question.options.filter(o => optionValues[o.key] !== 1);
  if (!best || others.length === 0) return false;
  const longestOther = Math.max(...others.map(o => o.text.length));
  return best.text.length > longestOther * MAX_BEST_LENGTH_RATIO;
}

// Ne lève jamais : null = « ne pas persister, ne pas montrer au candidat ».
export function validateAdaptiveQuestion(raw: unknown, expectedKeys: string[]): ClientQuestion | null {
  const parsed = RawSchema.safeParse(raw);
  if (!parsed.success) return null;

  const actual = parsed.data.options.map(o => o.key);
  if (actual.length !== expectedKeys.length) return null;
  if (new Set(actual).size !== actual.length) return null;
  if (!expectedKeys.every(k => actual.includes(k))) return null;

  const byKey = new Map(parsed.data.options.map(o => [o.key, o.text]));
  return {
    questionText: parsed.data.question_text,
    options: expectedKeys.map(key => ({ key, text: byKey.get(key)! })),
  };
}

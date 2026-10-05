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

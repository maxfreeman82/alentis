import { z } from 'zod';
import type { EnergyCode } from './referentiel';

// `.strict()` on both levels: this schema is the firewall between the
// deterministic engine and the AI's free-form JSON output. The AI must
// never be able to smuggle extra fields (e.g. a self-invented energyCode
// per option) past this gate — only the shape we explicitly allow.
const RawQuestionSchema = z.object({
  question_text: z.string().min(1).max(500),
  question_format: z.enum(['forced_choice', 'arbitration']),
  options: z.array(
    z.object({
      key: z.string().min(1),
      text: z.string().min(1).max(300),
    }).strict()
  ),
}).strict();

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

/**
 * Validates a raw AI-generated question against the exact contract decided
 * by the deterministic engine (`expectedSignals`): the AI may only write the
 * question text and option text — it must never alter, invent, or drop the
 * option key → energy code mapping already chosen by `decideNextStep`.
 *
 * Returns null (never throws) on any contract violation, so callers can
 * uniformly treat rejection as "do not persist / do not show to candidate".
 */
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
      energyCode: expectedSignals[o.key]!,
    })),
  };
}

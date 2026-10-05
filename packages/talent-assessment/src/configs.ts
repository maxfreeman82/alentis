import type { StepConfig, StepId } from './types';
import { SOFT_CONFIG } from './steps/soft';
import { LIFE_CONFIG } from './steps/life';
import { RISK_CONFIG } from './steps/risk';
import { HARD_CONFIG_TEMPLATE, buildHardConfig, sanitizeSkills } from './steps/hard';
import { EXP_CONFIG } from './steps/exp';

export const STEP_CONFIGS: Record<StepId, StepConfig> = {
  soft: SOFT_CONFIG,
  life: LIFE_CONFIG,
  risk: RISK_CONFIG,
  hard: HARD_CONFIG_TEMPLATE,
  exp:  EXP_CONFIG,
};

// Config effective d'une session : les compétences techniques dépendent du CV
// (context_snapshot.skills), les autres étapes sont fixes.
export function resolveStepConfig(step: StepId, context: Record<string, unknown>): StepConfig {
  if (step === 'hard') return buildHardConfig(sanitizeSkills(context.skills));
  return STEP_CONFIGS[step];
}

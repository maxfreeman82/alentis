import type { StepConfig, StepId } from './types';
import { SOFT_CONFIG } from './steps/soft';
import { LIFE_CONFIG } from './steps/life';
import { RISK_CONFIG } from './steps/risk';

export const STEP_CONFIGS: Record<StepId, StepConfig> = {
  soft: SOFT_CONFIG,
  life: LIFE_CONFIG,
  risk: RISK_CONFIG,
};

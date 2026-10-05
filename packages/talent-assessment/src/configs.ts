import type { StepConfig, StepId } from './types';
import { SOFT_CONFIG } from './steps/soft';

export const STEP_CONFIGS: Record<StepId, StepConfig> = {
  soft: SOFT_CONFIG,
};

export interface IASInput {
  capabilityFit: number; // C — compétences vs vision (0-100)
  energyFit:     number; // E — mix énergétique vs archétype (0-100)
  adhesion:      number; // P — Vision Pulse score (0-100)
  velocity:      number; // V — % OKR on track (0-100)
  trajectories:  number; // T — % trajectoires alignées (0-100)
}

export type IASStatus = 'aligned' | 'moderate' | 'critical';

export interface IASResult {
  score: number;
  status: IASStatus;
  label: string;
  color: 'emerald' | 'amber' | 'rose';
}

export function computeIAS(input: IASInput): IASResult {
  const score = Math.round(
    0.30 * input.capabilityFit +
    0.25 * input.energyFit +
    0.20 * input.adhesion +
    0.15 * input.velocity +
    0.10 * input.trajectories
  );

  return { score, ...iasLabel(score) };
}

export function iasLabel(ias: number): { status: IASStatus; label: string; color: 'emerald' | 'amber' | 'rose' } {
  if (ias >= 80) return { status: 'aligned',  label: 'Aligné',               color: 'emerald' };
  if (ias >= 60) return { status: 'moderate', label: 'Friction modérée',     color: 'amber'   };
  return              { status: 'critical', label: 'Désalignement critique', color: 'rose'    };
}

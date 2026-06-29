export type TrainingCategory = 'technique' | 'management' | 'soft_skills' | 'reglementaire' | 'metier';
export type TrainingFormat   = 'presentiel' | 'distanciel' | 'blended' | 'e_learning';
export type EnrollmentStatus = 'enrolled' | 'in_progress' | 'completed' | 'cancelled';

export const CATEGORY_LABELS: Record<TrainingCategory, { label: string; color: string }> = {
  technique:       { label: 'Technique',        color: '#0EA5E9' },
  management:      { label: 'Management',       color: '#8B5CF6' },
  soft_skills:     { label: 'Soft Skills',      color: '#10B981' },
  reglementaire:   { label: 'Réglementaire',    color: '#F97316' },
  metier:          { label: 'Métier',           color: '#F59E0B' },
};

export const FORMAT_LABELS: Record<TrainingFormat, string> = {
  presentiel:   'Présentiel',
  distanciel:   'Distanciel',
  blended:      'Hybride',
  e_learning:   'E-learning',
};

export const STATUS_LABELS: Record<EnrollmentStatus, { label: string; color: string }> = {
  enrolled:    { label: 'Inscrit',      color: '#0EA5E9' },
  in_progress: { label: 'En cours',    color: '#F59E0B' },
  completed:   { label: 'Complété',    color: '#10B981' },
  cancelled:   { label: 'Annulé',      color: '#64748B' },
};

export interface TrainingStats {
  total:          number;
  totalEnrolled:  number;
  completionRate: number;
  hoursPlanned:   number;
  hoursCompleted: number;
}

export function computeTrainingStats(
  trainings: { duration_hours: number | null; status: string }[],
  enrollments: { status: EnrollmentStatus }[]
): TrainingStats {
  const active    = trainings.filter(t => t.status === 'active');
  const completed = enrollments.filter(e => e.status === 'completed');

  return {
    total:          active.length,
    totalEnrolled:  enrollments.length,
    completionRate: enrollments.length > 0
      ? Math.round((completed.length / enrollments.length) * 100)
      : 0,
    hoursPlanned:   active.reduce((s, t) => s + (t.duration_hours ?? 0), 0),
    hoursCompleted: completed.length * 4, // approximation : 4h moyen par formation
  };
}

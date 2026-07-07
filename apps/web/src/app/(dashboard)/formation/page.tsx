import { requireAuth } from '@/lib/supabase/user';
import Link from 'next/link';
import { BookOpen, Clock, Users, TrendingUp, Plus } from 'lucide-react';
import { SectionHeader } from '@/components/shared';
import { getUserOrg } from '@/lib/supabase/auth';
import { CATEGORY_LABELS, FORMAT_LABELS, STATUS_LABELS, computeTrainingStats } from '@/lib/formation/training';
import type { TrainingCategory, TrainingFormat, EnrollmentStatus } from '@/lib/formation/training';

export default async function FormationPage() {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);

  if (!ctx) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Profil en cours de configuration…</p>
      </div>
    );
  }

  const { supabase, organizationId } = ctx;

  const [trainingsRes, enrollmentsRes] = await Promise.all([
    supabase
      .from('trainings')
      .select('id, title, description, category, format, duration_hours, instructor, max_participants, start_date, end_date, status')
      .eq('organization_id', organizationId)
      .neq('status', 'archived')
      .order('start_date', { ascending: true }),
    supabase
      .from('training_enrollments')
      .select('training_id, profile_id, status, progress')
      .eq('organization_id', organizationId),
  ]);

  const trainings   = trainingsRes.data   ?? [];
  const enrollments = enrollmentsRes.data ?? [];

  const stats = computeTrainingStats(
    trainings.map(t => ({ duration_hours: t.duration_hours, status: t.status })),
    enrollments.map(e => ({ status: e.status as EnrollmentStatus }))
  );

  // Grouper les inscriptions par formation
  const enrollByTraining = new Map<string, typeof enrollments>();
  for (const e of enrollments) {
    const arr = enrollByTraining.get(e.training_id) ?? [];
    arr.push(e);
    enrollByTraining.set(e.training_id, arr);
  }

  const KPIS = [
    { label: 'Formations actives',    value: stats.total,           icon: BookOpen,   color: '#0EA5E9' },
    { label: 'Taux de complétion',    value: `${stats.completionRate}%`, icon: TrendingUp, color: '#10B981' },
    { label: 'Heures planifiées',     value: stats.hoursPlanned,    icon: Clock,      color: '#8B5CF6' },
    { label: 'Inscriptions totales',  value: stats.totalEnrolled,   icon: Users,      color: '#F59E0B' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <SectionHeader
          tag="FORMATION & DÉVELOPPEMENT"
          title="Plan de formation"
          subtitle="Catalogue, inscriptions et suivi des compétences"
        />
        <Link href="/formation/nouveau" className="btn-primary text-sm flex-shrink-0 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle formation
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPIS.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${k.color}15` }}>
                <Icon className="w-5 h-5" style={{ color: k.color }} />
              </div>
              <div>
                <p className="text-slate-900 font-bold text-xl font-mono">{k.value}</p>
                <p className="text-slate-500 text-[10px]">{k.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Catalogue formations */}
      {trainings.length === 0 ? (
        <div className="card py-16 text-center">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 mb-1">Aucune formation planifiée</p>
          <p className="text-slate-600 text-sm">Créez votre premier plan de formation pour commencer.</p>
          <Link href="/formation/nouveau" className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Ajouter une formation
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="font-display text-slate-900 text-sm">Catalogue ({trainings.length})</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {trainings.map(t => {
              const cat        = CATEGORY_LABELS[t.category as TrainingCategory];
              const enrolled   = enrollByTraining.get(t.id) ?? [];
              const completed  = enrolled.filter(e => e.status === 'completed').length;
              const compRate   = enrolled.length > 0 ? Math.round((completed / enrolled.length) * 100) : 0;

              return (
                <Link key={t.id} href={`/formation/${t.id}`}
                  className="card hover:border-slate-200 transition-colors border border-transparent space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 font-semibold text-sm truncate">{t.title}</p>
                      {t.description && (
                        <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">{t.description}</p>
                      )}
                    </div>
                    {cat && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0"
                        style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                        {cat.label}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    {t.format && <span>{FORMAT_LABELS[t.format as TrainingFormat]}</span>}
                    {t.duration_hours && <span>{t.duration_hours}h</span>}
                    {t.instructor && <span>· {t.instructor}</span>}
                    {t.start_date && (
                      <span>· {new Date(t.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <Users className="w-3 h-3 text-slate-500" />
                      <span className="text-slate-400">{enrolled.length}
                        {t.max_participants ? ` / ${t.max_participants}` : ''} inscrits</span>
                    </div>
                    {enrolled.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-bg rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${compRate}%` }} />
                        </div>
                        <span className="text-xs text-emerald-400 font-mono">{compRate}%</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Mes inscriptions */}
      {enrollments.length > 0 && (
        <div className="card space-y-3">
          <h3 className="font-display text-slate-900 text-sm">Mes inscriptions</h3>
          <div className="divide-y divide-slate-200">
            {enrollments.slice(0, 5).map(e => {
              const training = trainings.find(t => t.id === e.training_id);
              const s = STATUS_LABELS[e.status as EnrollmentStatus];
              return (
                <div key={e.training_id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-slate-900 text-sm">{training?.title ?? '—'}</p>
                    <div className="w-32 h-1 bg-bg rounded-full mt-1.5">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${e.progress}%` }} />
                    </div>
                  </div>
                  {s && (
                    <span className="text-xs px-2 py-0.5 rounded"
                      style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                      {s.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

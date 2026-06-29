import { withAuth } from '@workos-inc/authkit-nextjs';
import { notFound } from 'next/navigation';
import { Clock, Users, Calendar, BookOpen } from 'lucide-react';
import { SectionHeader } from '@/components/shared';
import { getUserOrg } from '@/lib/supabase/auth';
import { CATEGORY_LABELS, FORMAT_LABELS, STATUS_LABELS } from '@/lib/formation/training';
import type { TrainingCategory, TrainingFormat, EnrollmentStatus } from '@/lib/formation/training';
import EnrollButton from '@/components/formation/EnrollButton';

interface PageProps { params: Promise<{ id: string }> }

export default async function TrainingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return notFound();

  const { supabase, organizationId, profileId } = ctx;

  const [trainingRes, enrollmentsRes, myEnrollRes] = await Promise.all([
    supabase.from('trainings').select('*').eq('id', id).eq('organization_id', organizationId).maybeSingle(),
    supabase.from('training_enrollments').select(`
      id, status, progress, completed_at,
      profiles!training_enrollments_profile_id_fkey (first_name, last_name)
    `).eq('training_id', id),
    supabase.from('training_enrollments').select('status, progress').eq('training_id', id).eq('profile_id', profileId).maybeSingle(),
  ]);

  const training  = trainingRes.data;
  if (!training) return notFound();

  const enrollments = enrollmentsRes.data ?? [];
  const myEnroll    = myEnrollRes.data;

  const cat    = CATEGORY_LABELS[training.category as TrainingCategory];
  const format = FORMAT_LABELS[training.format as TrainingFormat];
  const completed = enrollments.filter(e => e.status === 'completed').length;
  const compRate  = enrollments.length > 0 ? Math.round((completed / enrollments.length) * 100) : 0;
  const spotsLeft = training.max_participants
    ? training.max_participants - enrollments.filter(e => e.status !== 'cancelled').length
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <SectionHeader
        tag="FORMATION & DÉVELOPPEMENT"
        title={training.title}
        subtitle={training.description ?? ''}
      />

      {/* Meta */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cat && (
          <div className="card text-center py-3">
            <BookOpen className="w-4 h-4 mx-auto mb-1" style={{ color: cat.color }} />
            <p className="text-white text-xs font-semibold">{cat.label}</p>
            <p className="text-slate-500 text-[10px]">Catégorie</p>
          </div>
        )}
        {format && (
          <div className="card text-center py-3">
            <Calendar className="w-4 h-4 mx-auto mb-1 text-slate-400" />
            <p className="text-white text-xs font-semibold">{format}</p>
            <p className="text-slate-500 text-[10px]">Format</p>
          </div>
        )}
        {training.duration_hours && (
          <div className="card text-center py-3">
            <Clock className="w-4 h-4 mx-auto mb-1 text-slate-400" />
            <p className="text-white text-xs font-semibold">{training.duration_hours}h</p>
            <p className="text-slate-500 text-[10px]">Durée</p>
          </div>
        )}
        <div className="card text-center py-3">
          <Users className="w-4 h-4 mx-auto mb-1 text-slate-400" />
          <p className="text-white text-xs font-semibold">
            {enrollments.length}{training.max_participants ? `/${training.max_participants}` : ''}
          </p>
          <p className="text-slate-500 text-[10px]">Inscrits</p>
        </div>
      </div>

      {/* Dates + Formateur */}
      {(training.instructor || training.start_date) && (
        <div className="card space-y-2">
          {training.instructor && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Formateur</span>
              <span className="text-white">{training.instructor}</span>
            </div>
          )}
          {training.start_date && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Période</span>
              <span className="text-white">
                {new Date(training.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                {training.end_date && ` → ${new Date(training.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
              </span>
            </div>
          )}
          {spotsLeft !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Places restantes</span>
              <span className={`font-mono font-bold ${spotsLeft <= 2 ? 'text-rose-400' : 'text-emerald-400'}`}>{Math.max(0, spotsLeft)}</span>
            </div>
          )}
        </div>
      )}

      {/* CTA inscription */}
      <EnrollButton
        trainingId={id}
        currentStatus={myEnroll?.status as EnrollmentStatus | undefined}
        progress={myEnroll?.progress ?? 0}
        spotsLeft={spotsLeft}
      />

      {/* Taux de complétion */}
      {enrollments.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-white text-sm">Complétion globale</h3>
            <span className="font-mono text-emerald-400 font-bold">{compRate}%</span>
          </div>
          <div className="h-2 bg-bg rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${compRate}%` }} />
          </div>

          {/* Liste participants */}
          <div className="divide-y divide-white/[0.04] pt-2">
            {enrollments.map(e => {
              const profile = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
              const name = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : 'Inconnu';
              const s = STATUS_LABELS[e.status as EnrollmentStatus];
              return (
                <div key={e.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs text-slate-300 font-bold">
                      {name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white text-xs font-medium">{name}</p>
                      <div className="w-20 h-1 bg-bg rounded-full mt-1">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${e.progress}%` }} />
                      </div>
                    </div>
                  </div>
                  {s && (
                    <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: `${s.color}15`, color: s.color }}>
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

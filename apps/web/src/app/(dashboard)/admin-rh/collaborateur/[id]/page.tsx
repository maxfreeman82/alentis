import { withAuth } from '@workos-inc/authkit-nextjs';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Mail, Calendar, FileText, BookOpen, TrendingUp } from 'lucide-react';
import { SectionHeader, ScoreCircle } from '@/components/shared';
import { getUserOrg } from '@/lib/supabase/auth';

const ROLE_LABELS: Record<string, string> = {
  org_admin: 'Administrateur', org_manager: 'Manager', org_hr: 'RH',
  org_recruiter: 'Recruteur', org_employee: 'Collaborateur',
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  conge_annuel: 'Congé annuel', maladie: 'Maladie',
  maternite: 'Maternité', paternite: 'Paternité', sans_solde: 'Sans solde', autre: 'Autre',
};

interface PageProps { params: Promise<{ id: string }> }

export default async function CollaborateurDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return notFound();

  const { supabase, organizationId } = ctx;

  const [profileRes, passportRes, evalsRes, leavesRes, docsRes, enrollmentsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).eq('organization_id', organizationId).maybeSingle(),
    supabase.from('talent_passports').select('score_global, score_risk, dominant_family, passport_id, verified').eq('profile_id', id).maybeSingle(),
    supabase.from('quarterly_evaluations').select('quarter, year, correlation_score, departure_risk').eq('profile_id', id).eq('organization_id', organizationId).order('year', { ascending: false }).order('quarter', { ascending: false }).limit(4),
    supabase.from('leave_requests').select('id, type, start_date, end_date, days, status').eq('profile_id', id).eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(5),
    supabase.from('hr_documents').select('id, type, title, expiry_date, status').eq('profile_id', id).eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(5),
    supabase.from('training_enrollments').select(`
      status, progress,
      trainings!training_enrollments_training_id_fkey (title, category)
    `).eq('profile_id', id).eq('organization_id', organizationId).limit(5),
  ]);

  const profile = profileRes.data;
  if (!profile) return notFound();

  const passport    = passportRes.data;
  const evals       = evalsRes.data ?? [];
  const leaves      = leavesRes.data ?? [];
  const docs        = docsRes.data ?? [];
  const enrollments = enrollmentsRes.data ?? [];

  const name     = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || profile.email;
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const totalLeaveDays = leaves.filter(l => l.status === 'approved').reduce((s, l) => s + l.days, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <SectionHeader
        tag="ADMIN RH · COLLABORATEUR"
        title={name}
        subtitle={`${ROLE_LABELS[profile.role] ?? profile.role} · Depuis ${new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`}
      />

      {/* Profil card */}
      <div className="card flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-2xl text-emerald-400 flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <Mail className="w-3.5 h-3.5" />
            <span>{profile.email}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>Membre depuis {new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
        {passport && (
          <div className="flex-shrink-0 text-center">
            <ScoreCircle value={passport.score_global ?? 0} size="md" />
            <p className="text-slate-500 text-[10px] mt-1">Score 6D</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Évaluations performance */}
        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            <h3 className="font-display text-white text-sm">Performance</h3>
          </div>
          {evals.length === 0 ? (
            <p className="text-slate-500 text-xs">Aucune évaluation enregistrée.</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {evals.map(e => {
                const corrColor = (e.correlation_score ?? 0) >= 80 ? '#10B981' : (e.correlation_score ?? 0) >= 65 ? '#F59E0B' : '#F43F5E';
                return (
                  <div key={`${e.quarter}-${e.year}`} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-slate-400">Q{e.quarter} {e.year}</span>
                    <span className="font-mono font-bold" style={{ color: corrColor }}>{e.correlation_score ?? '—'}</span>
                  </div>
                );
              })}
            </div>
          )}
          <Link href={`/performance/results/${id}`} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Voir détail →
          </Link>
        </div>

        {/* Formations */}
        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-400" />
            <h3 className="font-display text-white text-sm">Formations ({enrollments.length})</h3>
          </div>
          {enrollments.length === 0 ? (
            <p className="text-slate-500 text-xs">Aucune inscription enregistrée.</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {enrollments.map((e, i) => {
                const training = Array.isArray(e.trainings) ? e.trainings[0] : e.trainings;
                return (
                  <div key={i} className="flex items-center justify-between py-2">
                    <p className="text-white text-xs truncate pr-2">{training?.title ?? '—'}</p>
                    <span className={`text-[10px] font-semibold ${e.status === 'completed' ? 'text-emerald-400' : e.status === 'in_progress' ? 'text-amber-400' : 'text-slate-400'}`}>
                      {e.progress}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Congés */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <h3 className="font-display text-white text-sm">Congés</h3>
            </div>
            <span className="text-xs text-slate-500">{totalLeaveDays}j approuvés</span>
          </div>
          {leaves.length === 0 ? (
            <p className="text-slate-500 text-xs">Aucune demande de congé.</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {leaves.map(l => (
                <Link key={l.id} href={`/admin-rh/conges/${l.id}`}
                  className="flex items-center justify-between py-2 hover:opacity-80 transition-opacity">
                  <div>
                    <p className="text-white text-xs">{LEAVE_TYPE_LABELS[l.type] ?? l.type}</p>
                    <p className="text-slate-500 text-[10px]">
                      {new Date(l.start_date).toLocaleDateString('fr-FR')} · {l.days}j
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold ${l.status === 'approved' ? 'text-emerald-400' : l.status === 'pending' ? 'text-amber-400' : 'text-rose-400'}`}>
                    {l.status === 'approved' ? 'Approuvé' : l.status === 'pending' ? 'En attente' : 'Refusé'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <h3 className="font-display text-white text-sm">Documents ({docs.length})</h3>
          </div>
          {docs.length === 0 ? (
            <p className="text-slate-500 text-xs">Aucun document enregistré.</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {docs.map(d => (
                <div key={d.id} className="flex items-center justify-between py-2">
                  <p className="text-white text-xs truncate pr-2">{d.title}</p>
                  {d.expiry_date && (
                    <p className="text-slate-500 text-[10px] flex-shrink-0">
                      exp. {new Date(d.expiry_date).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { requireAuth } from '@/lib/supabase/user';
import { notFound } from 'next/navigation';
import { Calendar, User } from 'lucide-react';
import { SectionHeader } from '@/components/shared';
import { getUserOrg } from '@/lib/supabase/auth';
import LeaveActions from '@/components/admin-rh/LeaveActions';

const LEAVE_TYPE_LABELS: Record<string, string> = {
  conge_annuel: 'Congé annuel', maladie: 'Maladie',
  maternite: 'Maternité', paternite: 'Paternité',
  sans_solde: 'Sans solde', autre: 'Autre',
};

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  pending:   { label: 'En attente',  color: '#F59E0B' },
  approved:  { label: 'Approuvé',   color: '#10B981' },
  rejected:  { label: 'Refusé',     color: '#F43F5E' },
  cancelled: { label: 'Annulé',     color: '#64748B' },
};

interface PageProps { params: Promise<{ id: string }> }

export default async function LeaveDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return notFound();

  const { supabase, organizationId, role } = ctx;

  const { data: leave } = await supabase
    .from('leave_requests')
    .select('id, type, start_date, end_date, days, status, reason, created_at, profile_id')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (!leave) return notFound();

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, role')
    .eq('id', leave.profile_id)
    .maybeSingle();

  const name = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : 'Inconnu';
  const statusInfo: { label: string; color: string } = STATUS_STYLE[leave.status] ?? { label: leave.status, color: '#64748B' };
  const canApprove = ['org_admin', 'org_hr', 'org_manager'].includes(role) && leave.status === 'pending';

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
      <SectionHeader
        tag="ADMIN RH · CONGÉS"
        title="Demande de congé"
        subtitle={`Soumise par ${name}`}
      />

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <p className="text-slate-900 font-semibold">{name}</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full font-semibold"
            style={{ backgroundColor: `${statusInfo.color}15`, color: statusInfo.color }}>
            {statusInfo.label}
          </span>
        </div>

        <div className="divide-y divide-white/[0.04] text-sm">
          <div className="flex justify-between py-3">
            <span className="text-slate-400">Type</span>
            <span className="text-slate-900">{LEAVE_TYPE_LABELS[leave.type] ?? leave.type}</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-slate-400">Période</span>
            <span className="text-slate-900">
              {new Date(leave.start_date).toLocaleDateString('fr-FR')} → {new Date(leave.end_date).toLocaleDateString('fr-FR')}
            </span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-slate-400">Durée</span>
            <span className="text-slate-900 font-mono font-bold">{leave.days} jour{leave.days > 1 ? 's' : ''}</span>
          </div>
          {leave.reason && (
            <div className="py-3">
              <p className="text-slate-400 mb-1">Motif</p>
              <p className="text-slate-900 text-sm">{leave.reason}</p>
            </div>
          )}
          <div className="flex justify-between py-3">
            <span className="text-slate-400">Demandé le</span>
            <span className="text-slate-600">
              {new Date(leave.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {canApprove && <LeaveActions leaveId={id} />}
    </div>
  );
}

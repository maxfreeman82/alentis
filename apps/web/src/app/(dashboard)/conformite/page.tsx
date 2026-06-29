import { withAuth } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';
import { ShieldCheck, AlertTriangle, CheckCircle, Clock, Plus } from 'lucide-react';
import { SectionHeader } from '@/components/shared';
import { getUserOrg } from '@/lib/supabase/auth';
import ComplianceActions from '@/components/conformite/ComplianceActions';
import { DEFAULT_COMPLIANCE_ITEMS } from '@/lib/dei/metrics';

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  social:    { label: 'Social',    color: '#0EA5E9' },
  fiscal:    { label: 'Fiscal',    color: '#F59E0B' },
  securite:  { label: 'Sécurité', color: '#F43F5E' },
  emploi:    { label: 'Emploi',    color: '#8B5CF6' },
  formation: { label: 'Formation', color: '#10B981' },
  autre:     { label: 'Autre',     color: '#64748B' },
};

const FREQ_LABELS: Record<string, string> = {
  mensuel: 'Mensuel', trimestriel: 'Trimestriel', semestriel: 'Semestriel', annuel: 'Annuel', unique: 'Unique',
};

function statusStyle(status: string) {
  if (status === 'completed')      return { color: '#10B981', bg: 'bg-emerald-500/10', label: 'Complété', Icon: CheckCircle };
  if (status === 'overdue')        return { color: '#F43F5E', bg: 'bg-rose-500/10',    label: 'En retard', Icon: AlertTriangle };
  if (status === 'not_applicable') return { color: '#64748B', bg: 'bg-slate-500/10',   label: 'N/A',        Icon: ShieldCheck };
  return { color: '#F59E0B', bg: 'bg-amber-500/10', label: 'En attente', Icon: Clock };
}

export default async function ConformitePage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return <div className="flex items-center justify-center h-64"><p className="text-slate-400">Profil en cours de configuration…</p></div>;

  const { supabase, organizationId } = ctx;

  let { data: items } = await supabase
    .from('compliance_items')
    .select('id, category, title, description, frequency, due_date, last_completed, status, notes')
    .eq('organization_id', organizationId)
    .order('due_date', { ascending: true, nullsFirst: false });

  // Premier lancement : seed des obligations Sénégal
  if (!items || items.length === 0) {
    await supabase.from('compliance_items').insert(
      DEFAULT_COMPLIANCE_ITEMS.map(item => ({ ...item, organization_id: organizationId }))
    );
    const refreshed = await supabase
      .from('compliance_items')
      .select('id, category, title, description, frequency, due_date, last_completed, status, notes')
      .eq('organization_id', organizationId)
      .order('due_date', { ascending: true, nullsFirst: false });
    items = refreshed.data;
  }

  const rows = items ?? [];

  const total      = rows.length;
  const completed  = rows.filter(r => r.status === 'completed').length;
  const overdue    = rows.filter(r => r.status === 'overdue').length;
  const pending    = rows.filter(r => r.status === 'pending').length;
  const complianceRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const byCategory = rows.reduce<Record<string, typeof rows>>((acc, r) => {
    const cat = r.category ?? 'autre';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(r);
    return acc;
  }, {});

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        tag="CONFORMITÉ LÉGALE"
        title="Obligations légales & réglementaires"
        subtitle="Suivi des obligations sociales, fiscales et emploi (droit sénégalais)"
        action={
          ctx.role === 'org_admin' || ctx.role === 'org_hr' ? (
            <Link href="/conformite/nouveau" className="btn-primary text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Ajouter
            </Link>
          ) : null
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Taux conformité',  value: `${complianceRate}%`, color: complianceRate >= 70 ? '#10B981' : complianceRate >= 40 ? '#F59E0B' : '#F43F5E' },
          { label: 'Complétées',       value: completed,             color: '#10B981' },
          { label: 'En attente',       value: pending,               color: '#F59E0B' },
          { label: 'En retard',        value: overdue,               color: '#F43F5E' },
        ].map(k => (
          <div key={k.label} className="card">
            <p className="font-display text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-slate-500 text-xs mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Barre progression globale */}
      <div className="card space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Progression globale</span>
          <span className="font-mono text-white">{completed}/{total} obligations</span>
        </div>
        <div className="h-3 bg-bg rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${complianceRate}%`, backgroundColor: complianceRate >= 70 ? '#10B981' : complianceRate >= 40 ? '#F59E0B' : '#F43F5E' }} />
        </div>
      </div>

      {/* Par catégorie */}
      {Object.entries(byCategory).map(([cat, catItems]) => {
        const cfg = CATEGORY_LABELS[cat] ?? { label: cat, color: '#64748B' };
        return (
          <div key={cat} className="space-y-2">
            <h3 className="font-display text-white text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
              {cfg.label}
              <span className="text-slate-600 text-xs">({catItems.length})</span>
            </h3>
            <div className="space-y-2">
              {catItems.map(item => {
                const ss = statusStyle(item.status ?? 'pending');
                const StatusIcon = ss.Icon;
                return (
                  <div key={item.id} className="card flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ss.bg}`}>
                      <StatusIcon className="w-4 h-4" style={{ color: ss.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-white text-sm font-medium">{item.title}</p>
                          {item.description && <p className="text-slate-500 text-xs mt-0.5">{item.description}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ss.bg}`} style={{ color: ss.color }}>
                            {ss.label}
                          </span>
                          {item.frequency && (
                            <p className="text-slate-600 text-[10px] mt-1">{FREQ_LABELS[item.frequency] ?? item.frequency}</p>
                          )}
                        </div>
                      </div>
                      {item.due_date && (
                        <p className="text-slate-600 text-xs mt-1">
                          Échéance : {new Date(item.due_date).toLocaleDateString('fr-FR')}
                          {item.last_completed && ` · Dernière fois : ${new Date(item.last_completed).toLocaleDateString('fr-FR')}`}
                        </p>
                      )}
                    </div>
                    <ComplianceActions itemId={item.id} currentStatus={item.status ?? 'pending'} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

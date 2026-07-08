import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/supabase/user';
import Link from 'next/link';
import { Scale, Users, TrendingUp, Globe, Plus } from 'lucide-react';
import { SectionHeader, ScoreCircle } from '@/components/shared';
import { getUserOrg } from '@/lib/supabase/auth';
import { computeDeiMetrics } from '@/lib/dei/metrics';
import type { DeiRow } from '@/lib/dei/metrics';

const GENDER_LABELS: Record<string, { label: string; color: string }> = {
  homme:       { label: 'Hommes',       color: '#0EA5E9' },
  femme:       { label: 'Femmes',       color: '#EC4899' },
  autre:       { label: 'Autre',        color: '#8B5CF6' },
  non_precise: { label: 'Non précisé', color: '#64748B' },
};

const AGE_ORDER = ['18-25', '26-35', '36-45', '46-55', '55+'];

const BAND_LABELS: Record<string, string> = {
  junior: 'Junior', intermediaire: 'Intermédiaire', senior: 'Senior',
  expert: 'Expert', direction: 'Direction',
};

export default async function DeiPage() {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) redirect('/setup-org');

  const { supabase, organizationId } = ctx;

  const { data } = await supabase
    .from('dei_profiles')
    .select('gender, age_range, nationality, department, salary_band, is_manager, disability')
    .eq('organization_id', organizationId);

  const rows   = (data ?? []) as DeiRow[];
  const metrics = computeDeiMetrics(rows);

  const KPIS = [
    { label: 'Score Inclusion',      value: metrics.inclusionScore, icon: ScoreCircle, isScore: true, color: '#10B981' },
    { label: 'Profils DEI renseignés', value: metrics.totalProfiles, icon: Users,       color: '#8B5CF6' },
    { label: 'Parité managériale',   value: `${metrics.femaleManagerPct}%`, icon: TrendingUp, color: '#EC4899' },
    { label: 'Nationalités',         value: metrics.nationalityCount, icon: Globe,       color: '#F59E0B' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        tag="DIVERSITÉ, ÉQUITÉ & INCLUSION"
        title="Tableau de bord DEI"
        subtitle="Données anonymisées et volontaires — respect de la vie privée garanti"
        action={
          <Link href="/dei/profil" className="btn-primary text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Mon profil DEI
          </Link>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPIS.map(k => {
          const Icon = k.icon as React.ComponentType<{ value?: number; size?: string; className?: string; style?: React.CSSProperties }>;
          return (
            <div key={k.label} className="card flex items-center gap-3">
              {k.isScore ? (
                <ScoreCircle value={k.value as number} size="md" />
              ) : (
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${k.color}15` }}>
                  <Icon className="w-5 h-5" style={{ color: k.color }} />
                </div>
              )}
              <div>
                <p className="text-slate-900 font-bold text-xl font-mono">{k.value}</p>
                <p className="text-slate-500 text-[10px]">{k.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {metrics.totalProfiles === 0 ? (
        <div className="card py-16 text-center">
          <Scale className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 mb-1">Aucune donnée DEI enregistrée</p>
          <p className="text-slate-600 text-sm max-w-sm mx-auto">Invitez vos collaborateurs à renseigner volontairement leur profil DEI pour accéder aux métriques de diversité.</p>
          <Link href="/dei/profil" className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Renseigner mon profil
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribution genre */}
          <div className="card space-y-4">
            <h3 className="font-display text-slate-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-pink-400" /> Répartition par genre
            </h3>
            <div className="space-y-3">
              {Object.entries(metrics.genderDist).map(([g, cnt]) => {
                const cfg = GENDER_LABELS[g] ?? { label: g, color: '#64748B' };
                const pct = Math.round((cnt / metrics.totalProfiles) * 100);
                return (
                  <div key={g} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-900">{cfg.label}</span>
                      <span className="font-mono text-slate-400">{cnt} · {pct}%</span>
                    </div>
                    <div className="h-2 bg-bg rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Distribution âge */}
          <div className="card space-y-4">
            <h3 className="font-display text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-400" /> Répartition par tranche d&apos;âge
            </h3>
            <div className="space-y-3">
              {AGE_ORDER.filter(a => metrics.ageDist[a]).map(a => {
                const cnt = metrics.ageDist[a] ?? 0;
                const pct = Math.round((cnt / metrics.totalProfiles) * 100);
                return (
                  <div key={a} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-900">{a} ans</span>
                      <span className="font-mono text-slate-400">{cnt} · {pct}%</span>
                    </div>
                    <div className="h-2 bg-bg rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Équité salariale par genre */}
          <div className="card space-y-4">
            <h3 className="font-display text-slate-900 text-sm flex items-center gap-2">
              <Scale className="w-4 h-4 text-violet-400" /> Équité salariale — Répartition par bande
            </h3>
            <div className="space-y-3">
              {['junior','intermediaire','senior','expert','direction'].map(band => {
                const bData = metrics.salaryBandByGender[band];
                if (!bData) return null;
                const total = bData.homme + bData.femme;
                if (total === 0) return null;
                const fPct = Math.round((bData.femme / total) * 100);
                return (
                  <div key={band} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-900">{BAND_LABELS[band]}</span>
                      <span className="text-slate-400">{bData.femme}F · {bData.homme}H</span>
                    </div>
                    <div className="h-2 bg-[#0EA5E9] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-pink-500" style={{ width: `${fPct}%` }} />
                    </div>
                  </div>
                );
              })}
              <p className="text-slate-600 text-[10px] pt-1">Rose = femmes · Bleu = hommes</p>
            </div>
          </div>

          {/* Stats diversité */}
          <div className="card space-y-4">
            <h3 className="font-display text-slate-900 text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-400" /> Diversité & inclusion
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-400">Nationalités représentées</span>
                <span className="font-mono text-slate-900 font-bold">{metrics.nationalityCount}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-400">Index de diversité</span>
                <span className="font-mono font-bold" style={{ color: metrics.diversityIndex > 0.7 ? '#10B981' : metrics.diversityIndex > 0.4 ? '#F59E0B' : '#F43F5E' }}>
                  {metrics.diversityIndex.toFixed(2)} / 1.00
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-400">Parité managériale</span>
                <span className={`font-mono font-bold ${metrics.femaleManagerPct >= 40 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {metrics.femaleManagerPct}% femmes managers
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Inclusion handicap déclaré</span>
                <span className="font-mono text-slate-900">{metrics.disabilityPct}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

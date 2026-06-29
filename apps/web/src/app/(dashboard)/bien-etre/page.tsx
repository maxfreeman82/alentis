import { withAuth } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';
import { Heart, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { SectionHeader, ScoreCircle, AlertCard } from '@/components/shared';
import { getUserOrg } from '@/lib/supabase/auth';
import { WELLBEING_DIMENSIONS } from '@/lib/wellbeing/survey';
import type { WellbeingDimension } from '@/lib/wellbeing/survey';

const DIM_KEYS: WellbeingDimension[] = ['stress', 'balance', 'relations', 'meaning', 'autonomy'];

const wellbeingLabel = (s: number) =>
  s >= 80 ? 'Épanoui' : s >= 65 ? 'Satisfait' : s >= 50 ? 'Neutre' : s >= 35 ? 'En tension' : 'En détresse';

export default async function BienEtrePage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return <div className="flex items-center justify-center h-64"><p className="text-slate-400">Profil en cours de configuration…</p></div>;

  const { supabase, organizationId } = ctx;
  const now = new Date();

  const { data: surveys } = await supabase
    .from('wellbeing_surveys')
    .select('id, score_global, score_stress, score_balance, score_relations, score_meaning, score_autonomy, burnout_risk, month, year, profile_id')
    .eq('organization_id', organizationId)
    .eq('month', now.getMonth() + 1)
    .eq('year', now.getFullYear())
    .order('score_global', { ascending: true });

  const rows = surveys ?? [];

  // Lookup des profils pour nommage (tous les répondants)
  const allProfileIds = [...new Set(rows.map(r => r.profile_id))];
  const profilesData = allProfileIds.length > 0
    ? ((await supabase.from('profiles').select('id, first_name, last_name, role').in('id', allProfileIds)).data ?? [])
    : [];
  const profileMap = new Map(profilesData.map(p => [p.id, p]));
  const count = rows.length;

  const avgScore    = count > 0 ? Math.round(rows.reduce((s, r) => s + (r.score_global ?? 0), 0) / count) : 0;
  const avgBurnout  = count > 0 ? Math.round(rows.reduce((s, r) => s + (r.burnout_risk ?? 0), 0) / count) : 0;
  const highBurnout = rows.filter(r => (r.burnout_risk ?? 0) > 65);

  const dimAvg = (key: keyof typeof rows[0]) =>
    count > 0 ? Math.round(rows.reduce((s, r) => s + ((r[key] as number | null) ?? 0), 0) / count) : 0;

  const dimScores: Record<WellbeingDimension, number> = {
    stress:    dimAvg('score_stress' as keyof typeof rows[0]),
    balance:   dimAvg('score_balance' as keyof typeof rows[0]),
    relations: dimAvg('score_relations' as keyof typeof rows[0]),
    meaning:   dimAvg('score_meaning' as keyof typeof rows[0]),
    autonomy:  dimAvg('score_autonomy' as keyof typeof rows[0]),
  };

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        tag={`BIEN-ÊTRE · ${now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}`}
        title="Baromètre bien-être"
        subtitle={`${count} collaborateur${count > 1 ? 's' : ''} ont répondu ce mois`}
        action={
          <Link href="/bien-etre/bilan" className="btn-primary flex items-center gap-2 text-sm">
            <Heart className="w-4 h-4" /> Mon bilan
          </Link>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card flex items-center gap-4">
          <ScoreCircle value={avgScore} size="lg" />
          <div>
            <p className="section-tag text-slate-500 mb-1">Score moyen</p>
            <p className="font-display text-white">{avgScore > 0 ? wellbeingLabel(avgScore) : '—'}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <p className="text-white font-bold text-xl font-mono">{avgBurnout}%</p>
            <p className="text-slate-500 text-[10px]">Risque burnout moyen</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-white font-bold text-xl font-mono">{highBurnout.length}</p>
            <p className="text-slate-500 text-[10px]">Profils à risque élevé</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <p className="text-white font-bold text-xl font-mono">{count}</p>
            <p className="text-slate-500 text-[10px]">Répondants ce mois</p>
          </div>
        </div>
      </div>

      {/* Alertes burnout */}
      {highBurnout.length > 0 && (
        <div className="space-y-2">
          {highBurnout.slice(0, 3).map(r => {
            const p = profileMap.get(r.profile_id);
            const name = p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : 'Anonyme';
            return (
              <AlertCard key={r.id} severity="critical"
                title={`Risque burnout élevé — ${name}`}
                description={`Score bien-être ${r.score_global}/100 · Burnout ${r.burnout_risk}% — Entretien individuel recommandé`}
              />
            );
          })}
        </div>
      )}

      {/* Radar dimensions */}
      {count > 0 && (
        <div className="card space-y-5">
          <h3 className="font-display text-white">Dimensions — moyennes organisationnelles</h3>
          <div className="space-y-4">
            {DIM_KEYS.map(d => {
              const score = dimScores[d];
              const cfg   = WELLBEING_DIMENSIONS[d];
              return (
                <div key={d} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2 text-white">
                      <span>{cfg?.icon}</span>{cfg?.label}
                    </span>
                    <span className={score >= 70 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400'}>
                      {score}/100
                    </span>
                  </div>
                  <div className="h-2 bg-bg rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${score}%`, backgroundColor: cfg?.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table collaborateurs */}
      {count > 0 && (
        <div className="card !p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <p className="text-white font-semibold text-sm">Détail par collaborateur</p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {rows.map(r => {
              const p = profileMap.get(r.profile_id);
              const name = p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : 'Anonyme';
              const burnoutColor = (r.burnout_risk ?? 0) > 65 ? '#F43F5E' : (r.burnout_risk ?? 0) > 40 ? '#F59E0B' : '#10B981';
              return (
                <div key={r.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">
                    {name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{name}</p>
                    <p className="text-slate-500 text-xs">{p?.role?.replace('org_', '') ?? ''}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono font-bold text-sm" style={{ color: (r.score_global ?? 0) >= 65 ? '#10B981' : (r.score_global ?? 0) >= 50 ? '#F59E0B' : '#F43F5E' }}>
                      {r.score_global}
                    </p>
                    <p className="text-slate-600 text-[10px]">score</p>
                  </div>
                  <div className="text-center w-16">
                    <p className="font-mono font-bold text-sm" style={{ color: burnoutColor }}>{r.burnout_risk}%</p>
                    <p className="text-slate-600 text-[10px]">burnout</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {count === 0 && (
        <div className="card py-16 text-center">
          <Heart className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 mb-1">Aucun bilan ce mois</p>
          <p className="text-slate-600 text-sm">Invitez vos collaborateurs à compléter leur bilan bien-être.</p>
          <Link href="/bien-etre/bilan" className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">
            Compléter mon bilan
          </Link>
        </div>
      )}
    </div>
  );
}

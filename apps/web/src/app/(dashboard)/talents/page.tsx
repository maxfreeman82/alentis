import { withAuth } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';
import { SectionHeader, ScoreCircle } from '@/components/shared';
import { scoreColor } from '@teranga/scoring';
import { scoreHex } from '@/lib/utils';
import { getUserOrg } from '@/lib/supabase/auth';

const ENERGY_COLORS: Record<string, string> = {
  accomplisseurs:  '#10B981',
  pilotes:         '#F97316',
  initialiseurs:   '#8B5CF6',
  dynamiseurs:     '#0EA5E9',
  regulateurs:     '#F59E0B',
};

export default async function TalentsPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);

  if (!ctx) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Profil en cours de configuration…</p>
      </div>
    );
  }

  const { supabase, organizationId } = ctx;

  // Jointure passport + profil
  const { data: rows } = await supabase
    .from('talent_passports')
    .select(`
      id,
      passport_id,
      score_global,
      score_risk,
      dominant_family,
      energy_level,
      profile_id,
      profiles (
        first_name,
        last_name,
        role,
        email
      )
    `)
    .eq('organization_id', organizationId)
    .order('score_global', { ascending: false });

  const passports = (rows ?? []).map(r => {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      id:            r.passport_id ?? r.id,
      profileId:     r.profile_id,
      name:          profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : 'Inconnu',
      role:          profile?.role ?? '',
      score:         r.score_global ?? 0,
      risk:          r.score_risk ?? 0,
      energy:        r.dominant_family ?? '—',
      energyColor:   ENERGY_COLORS[r.dominant_family ?? ''] ?? '#64748B',
      level:         r.energy_level ?? '—',
    };
  });

  const avgScore   = passports.length > 0 ? Math.round(passports.reduce((s, p) => s + p.score, 0) / passports.length) : 0;
  const highRisk   = passports.filter(p => p.risk > 40).length;

  const STATS = [
    { label: 'Passports actifs',    value: passports.length, sub: 'dans l\'organisation' },
    { label: 'Score moyen',         value: avgScore,          sub: 'score 6D global' },
    { label: 'Risque élevé',        value: highRisk,          sub: 'départ probable < 12 mois' },
    { label: 'Archétypes distincts', value: new Set(passports.map(p => p.energy).filter(e => e !== '—')).size, sub: 'familles énergétiques' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <SectionHeader
          tag="TALENT PASSPORT"
          title="Cartographie des talents"
          subtitle="Profils énergie, scores 6D et risques départ de votre organisation"
        />
        <Link href="/talents/passport/questionnaire" className="btn-primary text-sm flex-shrink-0">
          + Nouveau Passport
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-2xl font-bold text-white font-mono">{s.value}</p>
            <p className="text-emerald text-xs font-semibold mt-0.5">{s.label}</p>
            <p className="text-slate-500 text-[10px] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Table Passports */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <p className="text-white font-semibold text-sm">Passports actifs</p>
          <p className="text-slate-500 text-xs">{passports.length} collaborateurs</p>
        </div>

        {passports.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-slate-500">Aucun Talent Passport — invitez vos collaborateurs à remplir le questionnaire.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {passports.map(p => {
              const color    = scoreColor(p.score);
              const hex      = scoreHex(color);
              const riskColor = p.risk > 40 ? '#F43F5E' : p.risk > 25 ? '#F59E0B' : '#10B981';

              return (
                <Link
                  key={p.id}
                  href={`/talents/passport/${p.profileId}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
                    style={{ backgroundColor: `${hex}18`, color: hex, border: `1px solid ${hex}35` }}
                  >
                    {p.name.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.name}</p>
                    <p className="text-slate-500 text-xs truncate">{p.role}</p>
                  </div>

                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded hidden sm:block capitalize"
                    style={{ backgroundColor: `${p.energyColor}15`, color: p.energyColor }}
                  >
                    {p.energy}
                  </span>

                  <span className="font-mono text-xs text-slate-400 w-6 text-center">{p.level}</span>

                  <span
                    className="font-mono text-xs font-bold w-12 text-right"
                    style={{ color: riskColor }}
                    title={`Risque départ : ${p.risk}%`}
                  >
                    ↗{p.risk}%
                  </span>

                  <div className="flex-shrink-0">
                    <ScoreCircle value={p.score} size="sm" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

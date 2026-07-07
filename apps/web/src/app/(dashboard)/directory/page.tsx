import { requireAuth } from '@/lib/supabase/user';
import Link from 'next/link';
import { BookUser, Search, Award, Star } from 'lucide-react';
import { SectionHeader } from '@/components/shared';
import { getUserOrg } from '@/lib/supabase/auth';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  org_admin:   { label: 'Admin',     color: '#F43F5E' },
  org_hr:      { label: 'RH',        color: '#F59E0B' },
  org_manager: { label: 'Manager',   color: '#8B5CF6' },
  org_member:  { label: 'Membre',    color: '#64748B' },
};

export default async function DirectoryPage() {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return <div className="flex items-center justify-center h-64"><p className="text-slate-400">Profil en cours de configuration…</p></div>;

  const { supabase, organizationId } = ctx;

  const [profilesRes, passportsRes, deiRes] = await Promise.all([
    supabase.from('profiles')
      .select('id, first_name, last_name, email, role, created_at')
      .eq('organization_id', organizationId)
      .order('first_name', { ascending: true }),
    supabase.from('talent_passports')
      .select('profile_id, score_global, dominant_family')
      .eq('organization_id', organizationId),
    supabase.from('dei_profiles')
      .select('profile_id, department, is_manager, salary_band')
      .eq('organization_id', organizationId),
  ]);

  const profiles  = profilesRes.data  ?? [];
  const passports = passportsRes.data ?? [];
  const deis      = deiRes.data       ?? [];

  const passportByProfile = new Map(passports.map(p => [p.profile_id, p]));
  const deiByProfile      = new Map(deis.map(d => [d.profile_id, d]));

  const ENERGY_COLOR: Record<string, string> = {
    accomplisseurs: '#10B981', pilotes: '#F97316', initialiseurs: '#8B5CF6',
    dynamiseurs: '#0EA5E9', regulateurs: '#F59E0B',
  };

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        tag="ANNUAIRE"
        title="Répertoire des collaborateurs"
        subtitle={`${profiles.length} membre${profiles.length > 1 ? 's' : ''} · ${ctx.orgName}`}
      />

      {/* Barre recherche — côté client via search params */}
      <div className="card flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <p className="text-slate-500 text-sm">Utilisez Ctrl+F pour chercher dans la page</p>
        <span className="ml-auto text-slate-600 text-xs">{profiles.length} résultats</span>
      </div>

      {/* Grille collaborateurs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {profiles.map(profile => {
          const name      = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email;
          const initials  = [profile.first_name?.[0], profile.last_name?.[0]].filter(Boolean).join('').toUpperCase() || profile.email[0]?.toUpperCase() || '?';
          const roleCfg   = ROLE_LABELS[profile.role] ?? { label: profile.role, color: '#64748B' };
          const passport  = passportByProfile.get(profile.id);
          const dei       = deiByProfile.get(profile.id);
          const energyColor = passport?.dominant_family ? (ENERGY_COLOR[passport.dominant_family] ?? '#64748B') : '#64748B';
          const isAdmin   = ['org_admin', 'org_hr'].includes(ctx.role);

          return (
            <div key={profile.id} className="card hover:border-slate-200 border border-transparent transition-all space-y-3">
              {/* En-tête */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
                  style={{ backgroundColor: `${energyColor}20`, color: energyColor }}>
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-slate-900 font-medium text-sm truncate">{name}</p>
                  <p className="text-slate-500 text-xs truncate">{profile.email}</p>
                </div>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: `${roleCfg.color}15`, color: roleCfg.color }}>
                  {roleCfg.label}
                </span>
              </div>

              {/* Méta */}
              <div className="flex flex-wrap gap-2 text-[10px]">
                {dei?.department && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">{dei.department}</span>
                )}
                {dei?.is_manager && (
                  <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-400">Manager</span>
                )}
                {passport?.dominant_family && (
                  <span className="px-2 py-0.5 rounded" style={{ backgroundColor: `${energyColor}15`, color: energyColor }}>
                    {passport.dominant_family}
                  </span>
                )}
              </div>

              {/* Score talent */}
              {passport?.score_global != null && (
                <div className="flex items-center gap-2">
                  <Star className="w-3 h-3 text-amber-400" />
                  <div className="flex-1 h-1 bg-bg rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${passport.score_global}%` }} />
                  </div>
                  <span className="font-mono text-xs text-amber-400">{passport.score_global}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1 border-t border-slate-200">
                <Link href={`/chat/${profile.id}`} className="flex-1 text-center py-1.5 rounded-lg bg-sky-500/10 text-sky-400 text-xs hover:bg-sky-500/20 transition-colors">
                  Message
                </Link>
                {isAdmin && (
                  <Link href={`/admin-rh/collaborateur/${profile.id}`}
                    className="flex-1 text-center py-1.5 rounded-lg bg-slate-50 text-slate-400 text-xs hover:bg-slate-50 transition-colors flex items-center justify-center gap-1">
                    <Award className="w-3 h-3" /> Profil RH
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {profiles.length === 0 && (
        <div className="card py-16 text-center">
          <BookUser className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">Aucun collaborateur dans l&apos;annuaire.</p>
        </div>
      )}
    </div>
  );
}

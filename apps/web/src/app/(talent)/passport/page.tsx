import { withAuth } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';
import { ClipboardList, Share2, Star, Zap, Shield, TrendingUp, Heart, Cpu } from 'lucide-react';
import { getTalentProfile } from '@/lib/supabase/auth';
import { redirect } from 'next/navigation';
import { ScoreCircle } from '@/components/shared';

const ENERGY_COLORS = {
  pilotes: '#F97316', initialiseurs: '#8B5CF6',
  accomplisseurs: '#10B981', dynamiseurs: '#0EA5E9', regulateurs: '#F59E0B',
};
const ENERGY_LABELS = {
  pilotes: 'Pilotes', initialiseurs: 'Initialiseurs',
  accomplisseurs: 'Accomplisseurs', dynamiseurs: 'Dynamiseurs', regulateurs: 'Régulateurs',
};

function scoreColor(v: number) {
  if (v >= 80) return '#10B981';
  if (v >= 70) return '#0EA5E9';
  if (v >= 60) return '#F59E0B';
  return '#F43F5E';
}

export default async function PassportPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getTalentProfile(user.id);
  if (!ctx) { redirect('/talent/onboarding'); return null; }

  const { supabase, profileId } = ctx;

  const [passportRes, profileRes] = await Promise.all([
    supabase.from('talent_passports')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle(),
    supabase.from('profiles')
      .select('first_name, last_name, email')
      .eq('id', profileId)
      .maybeSingle(),
  ]);

  const p    = passportRes.data;
  const prof = profileRes.data;
  const name = [prof?.first_name, prof?.last_name].filter(Boolean).join(' ') || prof?.email || 'Talent';

  if (!p) {
    return (
      <div className="text-center py-20 space-y-4">
        <Star className="w-12 h-12 text-slate-700 mx-auto" />
        <h2 className="font-display text-white text-xl">Aucun Talent Passport</h2>
        <p className="text-slate-400 text-sm">Complétez l'évaluation pour générer votre profil complet.</p>
        <Link href="/talent/assessment" className="inline-flex items-center gap-2 bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors mt-2">
          <ClipboardList className="w-4 h-4" /> Commencer l'évaluation
        </Link>
      </div>
    );
  }

  const energyFamilies = [
    { key: 'pilotes',        value: p.energy_pilotes        ?? 0 },
    { key: 'initialiseurs',  value: p.energy_initialiseurs  ?? 0 },
    { key: 'accomplisseurs', value: p.energy_accomplisseurs ?? 0 },
    { key: 'dynamiseurs',    value: p.energy_dynamiseurs    ?? 0 },
    { key: 'regulateurs',    value: p.energy_regulateurs    ?? 0 },
  ].sort((a, b) => b.value - a.value) as { key: keyof typeof ENERGY_COLORS; value: number }[];

  const DIMS = [
    { key: 'H', label: 'Hard Skills',  icon: Cpu,       value: p.score_hard   ?? 0 },
    { key: 'S', label: 'Soft Skills',  icon: Zap,       value: p.score_soft   ?? 0 },
    { key: 'X', label: 'Expérience',   icon: TrendingUp, value: p.score_exp   ?? 0 },
    { key: 'L', label: 'Life Score',   icon: Heart,     value: p.score_life   ?? 0 },
    { key: 'E', label: 'Énergie',      icon: Star,      value: p.score_energy ?? 0 },
    { key: 'R', label: 'Risque',       icon: Shield,    value: p.score_risk   ?? 0, inverse: true },
  ];

  return (
    <div className="space-y-6">
      {/* Header passport */}
      <div className="bg-card rounded-2xl border border-white/[0.06] p-6" style={{ borderTop: `4px solid ${scoreColor(p.score_global ?? 0)}` }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <ScoreCircle value={p.score_global ?? 0} size="lg" />
            <div>
              <p className="text-slate-500 text-xs font-mono mb-1">{p.passport_id ?? 'TP-EN-COURS'}</p>
              <h1 className="font-display text-white text-xl">{name}</h1>
              <p className="text-emerald-400 text-sm font-semibold mt-0.5">{p.dominant_profile ?? '—'}</p>
              <p className="text-slate-500 text-xs mt-1">
                {p.dominant_family ? ENERGY_LABELS[p.dominant_family as keyof typeof ENERGY_LABELS] : '—'} · Niveau {p.energy_level ?? 'C3'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="p-2 rounded-lg border border-white/[0.06] text-slate-400 hover:text-white transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
            <Link href="/talent/assessment"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] text-slate-400 hover:text-white text-xs transition-colors">
              <ClipboardList className="w-3.5 h-3.5" /> Refaire
            </Link>
          </div>
        </div>

        {/* Dernière évaluation */}
        {p.last_assessment && (
          <p className="text-slate-600 text-xs mt-4 border-t border-white/[0.04] pt-3">
            Évaluation du {new Date(p.last_assessment).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Score 6D */}
      <div className="card space-y-4">
        <h2 className="font-display text-white text-sm">Score 6D — Détail par dimension</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {DIMS.map(d => {
            const Icon  = d.icon;
            const color = d.inverse ? (d.value > 60 ? '#F43F5E' : '#10B981') : scoreColor(d.value);
            const label = d.inverse ? (d.value > 60 ? 'Risque élevé' : 'Risque faible') : '';
            return (
              <div key={d.key} className="bg-bg rounded-xl p-3 text-center">
                <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
                <p className="font-mono text-xl font-bold" style={{ color }}>{d.value}</p>
                <p className="text-slate-400 text-xs">{d.label}</p>
                {label && <p className="text-[10px] mt-0.5" style={{ color }}>{label}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Profil énergétique */}
      <div className="card space-y-4">
        <h2 className="font-display text-white text-sm">Profil énergétique</h2>
        <div className="space-y-3">
          {energyFamilies.map(({ key, value }) => {
            const color = ENERGY_COLORS[key] ?? '#64748B';
            return (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span style={{ color }} className="font-medium">{ENERGY_LABELS[key]}</span>
                  <span className="font-mono text-slate-400">{value}%</span>
                </div>
                <div className="h-2.5 bg-bg rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Indicateurs secondaires */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="font-mono text-2xl font-bold text-sky-400">{p.growth_potential ?? 0}</p>
          <p className="text-slate-400 text-xs mt-1">Potentiel de croissance</p>
        </div>
        <div className="card text-center">
          <p className="font-mono text-2xl font-bold text-violet-400">{p.transfer_score ?? 0}</p>
          <p className="text-slate-400 text-xs mt-1">Score transférabilité</p>
        </div>
      </div>

      {/* CTA suggestions */}
      <Link href="/talent/suggestions"
        className="block w-full text-center py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold hover:bg-emerald-500/15 transition-colors">
        Découvrir les opportunités qui correspondent à mon profil →
      </Link>
    </div>
  );
}

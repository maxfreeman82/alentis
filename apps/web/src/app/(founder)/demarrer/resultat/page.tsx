import { withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Star, AlertTriangle, Users, Banknote, Sparkles } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { FOUNDER_ARCHETYPE_META, type FounderArchetype } from '@/lib/founder/archetypes';

const SCORE_BAR_COLORS: Record<FounderArchetype, string> = {
  BATISSEUR: '#10B981', PIONNIER: '#8B5CF6', ARTISAN: '#0EA5E9',
  CATALYSEUR: '#F97316', GARDIEN: '#F59E0B',
};

export default async function ResultatPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const supabase  = createServerClient();

  const { data: profile } = await supabase
    .from('profiles').select('id, first_name').eq('workos_user_id', user.id).maybeSingle();

  const { data: founder } = profile
    ? await supabase.from('founders')
        .select('archetype, archetype_scores, confidence, vision_statement')
        .eq('profile_id', profile.id)
        .maybeSingle()
    : { data: null };

  if (!founder?.archetype) redirect('/demarrer/questionnaire');

  const archetype = founder.archetype as FounderArchetype;
  const meta      = FOUNDER_ARCHETYPE_META[archetype];
  const scores    = (founder.archetype_scores ?? {}) as Record<FounderArchetype, number>;
  const color     = meta.color;
  const total     = Object.values(scores).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header résultat */}
      <div className="rounded-2xl border border-white/[0.06] p-6 text-center space-y-3"
        style={{ borderTop: `4px solid ${color}`, background: `linear-gradient(135deg, ${color}08 0%, transparent 60%)` }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>
          VOTRE ARCHÉTYPE FONDATEUR
        </p>
        <h1 className="font-display text-white text-3xl">{meta.label}</h1>
        <p className="text-slate-300 text-base italic">&ldquo;{meta.tagline}&rdquo;</p>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: `${color}15`, color }}>
          <Star className="w-3 h-3" /> Confiance {founder.confidence}% · Énergie {meta.energyFamily}
        </div>
      </div>

      {/* Vision statement */}
      {founder.vision_statement && (
        <div className="border border-violet-500/20 bg-violet-500/5 rounded-xl p-4 space-y-2">
          <p className="text-violet-400 text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> ÉNONCÉ DE VISION
          </p>
          <p className="text-slate-300 text-sm leading-relaxed italic">{founder.vision_statement}</p>
        </div>
      )}

      {/* Distribution des scores */}
      <div className="card space-y-3">
        <h2 className="font-display text-white text-sm">Distribution de vos réponses</h2>
        {Object.entries(scores).sort(([, a], [, b]) => b - a).map(([arch, score]) => {
          const pct   = Math.round((score / total) * 100);
          const c     = SCORE_BAR_COLORS[arch as FounderArchetype] ?? '#64748B';
          const meta2 = FOUNDER_ARCHETYPE_META[arch as FounderArchetype];
          return (
            <div key={arch} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium" style={{ color: c }}>{meta2.label}</span>
                <span className="font-mono text-slate-400">{score}/10 · {pct}%</span>
              </div>
              <div className="h-2 bg-bg rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: c }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Forces & angles morts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4" style={{ color }} />
            <h3 className="text-white text-sm font-semibold">Vos forces naturelles</h3>
          </div>
          <ul className="space-y-1.5">
            {meta.strengths.map(s => (
              <li key={s} className="flex items-start gap-2 text-slate-400 text-xs">
                <span style={{ color }} className="mt-0.5 flex-shrink-0">✦</span> {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h3 className="text-white text-sm font-semibold">Points de vigilance</h3>
          </div>
          <ul className="space-y-1.5">
            {meta.blindspots.map(b => (
              <li key={b} className="flex items-start gap-2 text-slate-400 text-xs">
                <span className="text-rose-400 mt-0.5 flex-shrink-0">▲</span> {b}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Associé complémentaire */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-sky-400" />
          <h3 className="text-white text-sm font-semibold">L&apos;associé qui vous complète</h3>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed">{meta.needsPartner}</p>
      </div>

      {/* Financement */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <Banknote className="w-4 h-4 text-emerald-400" />
          <h3 className="text-white text-sm font-semibold">Financement adapté à votre profil</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {meta.fundingMatch.map(f => (
            <span key={f} className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* CTA prochaine étape */}
      <div className="text-center space-y-3 pt-2">
        <Link href="/creation"
          className="inline-flex items-center gap-3 px-10 py-4 bg-amber-500 text-white rounded-2xl font-semibold hover:bg-amber-600 transition-colors">
          Étape suivante : Créer mon entreprise <ArrowRight className="w-5 h-5" />
        </Link>
        <p className="text-slate-600 text-xs">
          Structure juridique · RCCM · NINEA · Compte bancaire
        </p>
      </div>
    </div>
  );
}

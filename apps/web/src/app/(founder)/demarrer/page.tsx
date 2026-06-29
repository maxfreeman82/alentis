import { withAuth } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';
import { ArrowRight, Clock, Sparkles, ShieldCheck } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';

export default async function DemarrerPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const supabase  = createServerClient();

  // Vérifier si la boussole a déjà été complétée
  const { data: profile } = await supabase
    .from('profiles').select('id').eq('workos_user_id', user.id).maybeSingle();

  const { data: founder } = profile
    ? await supabase.from('founders').select('archetype, boussole_done').eq('profile_id', profile.id).maybeSingle()
    : { data: null };

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      {/* Hero */}
      <div className="text-center space-y-4 py-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
          <Sparkles className="w-3 h-3" /> 100% GRATUIT · AUCUNE CARTE BANCAIRE
        </div>
        <h1 className="font-display text-white text-3xl leading-tight">
          Découvrez votre<br />
          <span className="text-amber-400">Archétype Fondateur</span>
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed max-w-lg mx-auto">
          Avant de créer une entreprise, il faut se connaître. 10 questions comportementales
          révèlent votre profil fondateur naturel et orientent chaque décision à venir.
        </p>
      </div>

      {/* Déjà fait ? */}
      {founder?.boussole_done && founder.archetype && (
        <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-emerald-400 text-sm">
            Votre archétype : <strong>{founder.archetype}</strong>
          </span>
          <Link href="/demarrer/resultat" className="text-emerald-400 text-xs hover:underline">
            Revoir les résultats →
          </Link>
        </div>
      )}

      {/* 3 promesses */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Clock,       color: '#F59E0B', title: '8 minutes',    desc: '10 questions situationnelles. Pas de bonne ou mauvaise réponse.' },
          { icon: Sparkles,    color: '#8B5CF6', title: 'Votre profil', desc: '5 archétypes : Bâtisseur, Pionnier, Artisan, Catalyseur, Gardien.' },
          { icon: ShieldCheck, color: '#10B981', title: 'Confidentiel', desc: 'Données chiffrées, jamais partagées sans votre accord.' },
        ].map(p => {
          const Icon = p.icon;
          return (
            <div key={p.title} className="card text-center space-y-2">
              <Icon className="w-5 h-5 mx-auto" style={{ color: p.color }} />
              <p className="text-white text-sm font-semibold">{p.title}</p>
              <p className="text-slate-500 text-xs leading-relaxed">{p.desc}</p>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="text-center space-y-3">
        <Link href="/demarrer/questionnaire"
          className="inline-flex items-center gap-3 px-10 py-4 bg-amber-500 text-white rounded-2xl font-semibold text-base hover:bg-amber-600 transition-colors">
          Découvrir mon archétype <ArrowRight className="w-5 h-5" />
        </Link>
        <p className="text-slate-600 text-xs">
          Déjà un compte ? Vos réponses sont sauvegardées automatiquement.
        </p>
      </div>

      {/* Ce que vous obtenez */}
      <div className="border border-white/[0.06] rounded-2xl p-6 space-y-4">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Après la Boussole</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            'Votre archétype avec ses forces et angles morts',
            'Le profil d\'associé complémentaire à rechercher',
            'Les sources de financement adaptées à votre profil',
            'Un énoncé de vision généré pour votre projet',
            'Le guide de création d\'entreprise personnalisé',
            'Le simulateur de coût employeur temps réel',
          ].map(item => (
            <div key={item} className="flex items-start gap-2">
              <span className="text-amber-400 mt-0.5 flex-shrink-0">✦</span>
              <span className="text-slate-400 text-xs leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

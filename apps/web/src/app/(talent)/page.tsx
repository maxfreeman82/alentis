import { withAuth } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';
import { ClipboardList, User, Lightbulb, ArrowRight, Star } from 'lucide-react';
import { getUserOrg } from '@/lib/supabase/auth';

export default async function TalentHomePage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);

  const hasPassport = ctx
    ? (await ctx.supabase.from('talent_passports').select('id').eq('profile_id', ctx.profileId).maybeSingle()).data !== null
    : false;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center space-y-4 py-8">
        <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto">
          <Star className="w-7 h-7 text-emerald-400" />
        </div>
        <h1 className="font-display text-white text-3xl">Votre Talent Passport</h1>
        <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
          Évaluez vos compétences, générez votre profil 6D certifié, et accédez aux meilleures opportunités du marché africain.
        </p>
        {hasPassport ? (
          <Link href="/talent/passport"
            className="inline-flex items-center gap-2 bg-emerald-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-emerald-600 transition-colors">
            Voir mon Passport <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <Link href="/talent/assessment"
            className="inline-flex items-center gap-2 bg-emerald-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-emerald-600 transition-colors">
            Commencer l'évaluation <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* 3 étapes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            step: '01', icon: ClipboardList, color: '#0EA5E9',
            title: 'Évaluation 6D',
            desc: '40 questions · 15 min · Hard Skills, Soft Skills, Expérience, Life Score, Énergie, Risque',
            href: '/talent/assessment',
          },
          {
            step: '02', icon: User, color: '#10B981',
            title: 'Talent Passport',
            desc: 'Votre profil complet avec score global, distribution énergétique et indicateurs de potentiel',
            href: '/talent/passport',
          },
          {
            step: '03', icon: Lightbulb, color: '#8B5CF6',
            title: 'Opportunités',
            desc: 'Offres d\'emploi matchées avec votre profil énergétique et votre score de compatibilité',
            href: '/talent/suggestions',
          },
        ].map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.step} href={item.href}
              className="card hover:border-white/10 transition-all group space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${item.color}15` }}>
                  <Icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <span className="font-mono text-xs" style={{ color: item.color }}>{item.step}</span>
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{item.title}</p>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">{item.desc}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </Link>
          );
        })}
      </div>

      {/* Badges confiance */}
      <div className="border-t border-white/[0.04] pt-6 flex flex-wrap justify-center gap-6 text-xs text-slate-600">
        <span>🔒 Données chiffrées</span>
        <span>🌍 Réseau panafricain</span>
        <span>⚡ Score mis à jour en temps réel</span>
        <span>🎯 Matching algorithmique</span>
      </div>
    </div>
  );
}

import { getSignInUrl } from '@workos-inc/authkit-nextjs';
import { ArrowRight, Briefcase, Star, Shield, Globe } from 'lucide-react';

export default async function SignInPage() {
  const signInUrl = await getSignInUrl();

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald rounded-lg flex items-center justify-center">
            <span className="font-display text-white font-bold text-sm">TA</span>
          </div>
          <span className="font-display text-white font-semibold">Teranga Align</span>
        </div>
        <span className="text-slate-600 text-xs hidden sm:block">Le moteur d&apos;alignement stratégique africain</span>
      </header>

      {/* Corps principal */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {/* Titre */}
          <div className="text-center mb-10">
            <p className="text-emerald text-xs font-semibold uppercase tracking-widest mb-3">Bienvenue</p>
            <h1 className="font-display text-white text-3xl sm:text-4xl mb-3">
              Votre carrière,<br />
              <span className="text-emerald">votre impact.</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              Découvrez votre Talent Passport · Trouvez des opportunités alignées à vos forces
            </p>
          </div>

          {/* Deux parcours */}
          <div className="space-y-3 mb-8">

            {/* Parcours Talent */}
            <a href={signInUrl}
              className="group flex items-center gap-4 p-5 rounded-2xl border border-emerald/30 bg-emerald/5 hover:bg-emerald/10 hover:border-emerald/50 transition-all cursor-pointer">
              <div className="w-11 h-11 rounded-xl bg-emerald/20 flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 text-emerald" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-semibold text-sm">Je suis un talent / candidat</p>
                <p className="text-slate-400 text-xs mt-0.5">Créer mon Talent Passport · Découvrir des offres</p>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </a>

            {/* Parcours Entreprise */}
            <a href={signInUrl}
              className="group flex items-center gap-4 p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.15] transition-all cursor-pointer">
              <div className="w-11 h-11 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-semibold text-sm">Je représente une entreprise</p>
                <p className="text-slate-400 text-xs mt-0.5">Recrutement · RH · Gestion équipe</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </a>
          </div>

          {/* CTA principal */}
          <a href={signInUrl}
            className="w-full flex items-center justify-center gap-2 bg-emerald text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-emerald-500 transition-colors">
            Continuer avec mon compte
            <ArrowRight className="w-4 h-4" />
          </a>

          <p className="text-slate-600 text-xs text-center mt-4">
            Vous n&apos;avez pas de compte ?{' '}
            <a href={signInUrl} className="text-emerald hover:underline">Créer un compte gratuitement</a>
          </p>
        </div>
      </main>

      {/* Bandeau confiance */}
      <footer className="border-t border-white/[0.04] py-6">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center justify-center gap-6 text-slate-600 text-xs">
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Données chiffrées</span>
            <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> 12 pays africains</span>
            <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> Gratuit pour les talents</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

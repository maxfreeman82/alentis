import { getSignInUrl } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, LogIn } from 'lucide-react';

export default async function SignInPage() {
  const signInUrl = await getSignInUrl();

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header minimal */}
      <header className="border-b border-white/[0.04] px-6 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald rounded-md flex items-center justify-center">
              <span className="font-display text-white font-bold text-sm">TA</span>
            </div>
            <span className="font-display text-white text-sm font-semibold">Teranga Align</span>
          </Link>
          <Link href="/choisir-profil" className="text-slate-500 hover:text-white text-xs transition-colors">
            Nouveau compte →
          </Link>
        </div>
      </header>

      {/* Contenu */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Icône + titre */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-emerald/10 border border-emerald/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <LogIn className="w-6 h-6 text-emerald" />
            </div>
            <h1 className="font-display text-white text-2xl mb-2">
              Bon retour !
            </h1>
            <p className="text-slate-400 text-sm">
              Connectez-vous pour accéder à votre espace Teranga Align.
            </p>
          </div>

          {/* CTA principal */}
          <a href={signInUrl}
            className="w-full flex items-center justify-center gap-2 bg-emerald text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-emerald-500 transition-colors mb-4">
            Se connecter avec mon compte
            <ArrowRight className="w-4 h-4" />
          </a>

          {/* Séparateur */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-slate-600 text-xs">ou</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Pas encore de compte */}
          <div className="bg-card border border-white/[0.06] rounded-xl p-5 text-center">
            <p className="text-slate-400 text-sm mb-3">
              Vous n&apos;avez pas encore de compte ?
            </p>
            <Link href="/choisir-profil"
              className="inline-flex items-center gap-1.5 text-emerald font-semibold text-sm hover:underline">
              Créer un compte gratuitement
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Retour */}
          <div className="text-center mt-6">
            <Link href="/"
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-300 text-xs transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour à l&apos;accueil
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}

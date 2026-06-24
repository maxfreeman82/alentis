import { getSignInUrl } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';

export default async function SignInPage() {
  const signInUrl = await getSignInUrl();

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-emerald rounded-lg flex items-center justify-center">
            <span className="font-display text-white font-bold text-lg">TA</span>
          </div>
          <div>
            <p className="font-display text-white text-xl">Teranga Align</p>
            <p className="text-slate-400 text-xs">Le moteur d&apos;alignement stratégique</p>
          </div>
        </div>

        <div className="card p-8 text-center">
          <h1 className="font-display text-2xl text-white mb-2">
            Bienvenue
          </h1>
          <p className="text-slate-400 mb-8 text-sm">
            Connectez-vous pour accéder à votre espace Teranga Align
          </p>

          <Link
            href={signInUrl}
            className="btn-primary w-full block text-center py-3 rounded-lg"
          >
            Se connecter
          </Link>

          <p className="text-slate-500 text-xs mt-6">
            En vous connectant, vous acceptez nos{' '}
            <span className="text-emerald">conditions d&apos;utilisation</span>
          </p>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          Afrique. Vision. Alignement.
        </p>
      </div>
    </div>
  );
}

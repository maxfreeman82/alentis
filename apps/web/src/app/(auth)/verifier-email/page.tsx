import Link from 'next/link';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';

export default function VerifierEmailPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header minimal */}
      <header className="border-b border-white/[0.04] px-6 py-4">
        <div className="max-w-md mx-auto flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald rounded-md flex items-center justify-center">
              <span className="font-display text-white font-bold text-sm">TA</span>
            </div>
            <span className="font-display text-white text-sm font-semibold">Teranga Align</span>
          </Link>
        </div>
      </header>

      {/* Barre de progression */}
      <div className="border-b border-white/[0.04]">
        <div className="max-w-md mx-auto px-6 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-5 h-5 rounded-full bg-emerald/20 text-emerald flex items-center justify-center font-bold text-[10px]">✓</span>
            <span>Choix du profil</span>
          </div>
          <div className="flex-1 h-px bg-white/[0.06]" />
          <div className="flex items-center gap-2 text-xs">
            <span className="w-5 h-5 rounded-full bg-emerald text-white flex items-center justify-center font-bold text-[10px]">2</span>
            <span className="text-white font-medium">Vérification</span>
          </div>
          <div className="flex-1 h-px bg-white/[0.06]" />
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-5 h-5 rounded-full border border-white/[0.10] flex items-center justify-center font-bold text-[10px]">3</span>
            <span>Onboarding</span>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">

          {/* Illustration */}
          <div className="w-20 h-20 bg-emerald/10 border border-emerald/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Mail className="w-9 h-9 text-emerald" />
          </div>

          <h1 className="font-display text-white text-2xl mb-3">
            Vérifiez votre email
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
            Nous avons envoyé un lien de vérification à votre adresse email.
            Cliquez sur le lien pour activer votre compte.
          </p>

          {/* Étapes */}
          <div className="bg-card border border-white/[0.06] rounded-2xl p-6 text-left space-y-4 mb-8">
            {[
              { num: '1', text: 'Ouvrez votre boîte email' },
              { num: '2', text: 'Cherchez un email de Teranga Align' },
              { num: '3', text: 'Cliquez sur "Vérifier mon adresse"' },
              { num: '4', text: 'Vous serez redirigé vers votre onboarding' },
            ].map(s => (
              <div key={s.num} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald/10 border border-emerald/20 text-emerald text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {s.num}
                </span>
                <span className="text-slate-300 text-sm">{s.text}</span>
              </div>
            ))}
          </div>

          {/* Pas reçu l'email */}
          <div className="space-y-3">
            <p className="text-slate-600 text-xs">Vous n&apos;avez pas reçu l&apos;email ?</p>
            <Link href="/choisir-profil"
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
              Recommencer l&apos;inscription
            </Link>
          </div>

          {/* Retour */}
          <div className="mt-8">
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

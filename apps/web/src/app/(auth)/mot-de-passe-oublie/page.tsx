'use client';

import { useState, useTransition, useMemo } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

export default function MotDePasseOubliePage() {
  const router   = useRouter();
  const [email,      setEmail]      = useState('');
  const [error,      setError]      = useState('');
  const [isPending,  startTransition] = useTransition();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      // signInWithOtp envoie un code OTP à 6 chiffres à l'email (si l'utilisateur existe)
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (err) {
        // Supabase retourne une erreur vague pour ne pas révéler si l'email existe
        // On affiche quand même un message orienté UX
        setError('Impossible d\'envoyer le code. Vérifiez l\'adresse ou créez un compte.');
        return;
      }
      sessionStorage.setItem('ta_otp_ctx', JSON.stringify({ recovery: true }));
      router.push(`/verifier-email?email=${encodeURIComponent(email)}&step=recovery`);
    });
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="border-b border-slate-200 px-6 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald rounded-md flex items-center justify-center">
              <span className="font-display text-slate-900 font-bold text-sm">TA</span>
            </div>
            <span className="font-display text-slate-900 text-sm font-semibold">Teranga Align</span>
          </Link>
          <Link href="/sign-in" className="text-slate-500 hover:text-slate-800 text-xs transition-colors">
            Se connecter →
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <KeyRound className="w-6 h-6 text-amber-400" />
            </div>
            <h1 className="font-display text-slate-900 text-2xl mb-2">Mot de passe oublié</h1>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              Entrez votre adresse email. Nous vous enverrons un code à 6 chiffres pour réinitialiser votre mot de passe.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs mb-1.5">Adresse email</label>
              <input
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="w-full bg-card border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-emerald/50 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 bg-emerald text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {isPending ? 'Envoi du code…' : 'Recevoir le code'}
            </button>
          </form>

          <div className="text-center mt-6">
            <Link href="/sign-in"
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-600 text-xs transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Retour à la connexion
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

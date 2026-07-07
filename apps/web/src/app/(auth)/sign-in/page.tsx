'use client';

import { useState, useTransition, useMemo } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); return; }
      router.push('/');
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 px-6 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald rounded-md flex items-center justify-center">
              <span className="font-display text-slate-900 font-bold text-sm">TA</span>
            </div>
            <span className="font-display text-slate-900 text-sm font-semibold">Teranga Align</span>
          </Link>
          <Link href="/choisir-profil" className="text-slate-500 hover:text-slate-800 text-xs transition-colors">
            Nouveau compte →
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-emerald/10 border border-emerald/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <LogIn className="w-6 h-6 text-emerald" />
            </div>
            <h1 className="font-display text-slate-900 text-2xl mb-2">Bon retour !</h1>
            <p className="text-slate-400 text-sm">Connectez-vous à votre espace Teranga Align.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs mb-1.5">Adresse email</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="w-full bg-card border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-emerald/50 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-400 text-xs">Mot de passe</label>
                <Link href="/mot-de-passe-oublie" className="text-xs text-slate-500 hover:text-emerald transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} required value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-card border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-emerald/50 transition-colors pr-10"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <button type="submit" disabled={isPending}
              className="w-full flex items-center justify-center gap-2 bg-emerald text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors">
              {isPending ? 'Connexion…' : 'Se connecter'}
              {!isPending && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-slate-600 text-xs">
              Pas encore de compte ?{' '}
              <Link href="/choisir-profil" className="text-emerald hover:underline">
                Créer un compte
              </Link>
            </p>
            <Link href="/"
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-600 text-xs transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

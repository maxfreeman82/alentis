'use client';

import { useState, useTransition, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';

export default function NouveauMotDePassePage() {
  const router   = useRouter();
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [showCfm,   setShowCfm]   = useState(false);
  const [error,     setError]     = useState('');
  const [done,      setDone]      = useState(false);
  const [isPending, startTransition] = useTransition();

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Mot de passe : 8 caractères minimum'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    startTransition(async () => {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) { setError(err.message); return; }
      setDone(true);
      setTimeout(() => router.push('/sign-in'), 2500);
    });
  }

  if (done) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-xs">
          <div className="w-16 h-16 rounded-full bg-emerald/10 border border-emerald/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald" />
          </div>
          <h1 className="font-display text-slate-900 text-2xl">Mot de passe mis à jour</h1>
          <p className="text-slate-400 text-sm">Redirection vers la connexion…</p>
          <Link href="/sign-in" className="block text-emerald text-sm hover:underline">
            Connexion →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="border-b border-slate-200 px-6 py-4">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald rounded-md flex items-center justify-center">
            <span className="font-display text-slate-900 font-bold text-sm">TA</span>
          </div>
          <span className="font-display text-slate-900 text-sm font-semibold">Teranga Align</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-emerald/10 border border-emerald/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <ShieldCheck className="w-6 h-6 text-emerald" />
            </div>
            <h1 className="font-display text-slate-900 text-2xl mb-2">Nouveau mot de passe</h1>
            <p className="text-slate-400 text-sm">Choisissez un mot de passe sécurisé.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs mb-1.5">
                Nouveau mot de passe <span className="text-slate-600">(8 caractères min.)</span>
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoFocus
                  autoComplete="new-password"
                  value={password}
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

            <div>
              <label className="block text-slate-400 text-xs mb-1.5">Confirmer le mot de passe</label>
              <div className="relative">
                <input
                  type={showCfm ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full bg-card border rounded-xl px-4 py-3 text-slate-900 text-sm placeholder-slate-400 outline-none transition-colors pr-10 ${
                    confirm && confirm !== password ? 'border-rose-500/50' : 'border-slate-200 focus:border-emerald/50'
                  }`}
                />
                <button type="button" onClick={() => setShowCfm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600">
                  {showCfm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
              {isPending ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

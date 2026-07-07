'use client';

import { Suspense, useState, useTransition, useMemo } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserPlus, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const PROFILE_LABELS: Record<string, string> = {
  talent:     'Talent / Candidat',
  entreprise: 'Entreprise / RH',
  fondateur:  'Fondateur / Entrepreneur',
};

// ─── Formulaire (besoin de useSearchParams → Suspense obligatoire) ─────────────

function SignUpForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const profile      = searchParams.get('profile') ?? 'talent';

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
      // Stocker le contexte OTP (mot de passe + type de profil) temporairement
      sessionStorage.setItem('ta_otp_ctx', JSON.stringify({ pw: password, pt: profile }));

      // signInWithOtp envoie un code à 6 chiffres (pas de magic link)
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (err) {
        sessionStorage.removeItem('ta_otp_ctx');
        setError(err.message === 'User already registered'
          ? 'Ce compte existe déjà. Connectez-vous.'
          : err.message);
        return;
      }
      router.push(`/verifier-email?email=${encodeURIComponent(email)}&step=signup`);
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
          <Link href="/sign-in" className="text-slate-500 hover:text-slate-800 text-xs transition-colors">
            Déjà un compte ? →
          </Link>
        </div>
      </header>

      {/* Barre de progression */}
      <div className="border-b border-slate-200">
        <div className="max-w-md mx-auto px-6 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-5 h-5 rounded-full bg-emerald/20 text-emerald flex items-center justify-center font-bold text-[10px]">✓</span>
            <span>Choix du profil</span>
          </div>
          <div className="flex-1 h-px bg-slate-50" />
          <div className="flex items-center gap-2 text-xs">
            <span className="w-5 h-5 rounded-full bg-emerald text-white flex items-center justify-center font-bold text-[10px]">2</span>
            <span className="text-slate-900 font-medium">Inscription</span>
          </div>
          <div className="flex-1 h-px bg-slate-50" />
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-5 h-5 rounded-full border border-slate-200 flex items-center justify-center font-bold text-[10px]">3</span>
            <span>Onboarding</span>
          </div>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-emerald/10 border border-emerald/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <UserPlus className="w-6 h-6 text-emerald" />
            </div>
            <h1 className="font-display text-slate-900 text-2xl mb-2">Créer votre compte</h1>
            <p className="text-slate-400 text-sm">
              Profil :{' '}
              <span className="text-emerald font-medium">
                {PROFILE_LABELS[profile] ?? profile}
              </span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs mb-1.5">Adresse email</label>
              <input
                type="email" required autoComplete="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="w-full bg-card border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-emerald/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs mb-1.5">
                Mot de passe <span className="text-slate-600">(8 caractères min.)</span>
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} required minLength={8}
                  autoComplete="new-password"
                  value={password} onChange={e => setPassword(e.target.value)}
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
                {error.includes('existe déjà') && (
                  <Link href="/sign-in" className="block mt-1 underline font-semibold">
                    → Se connecter
                  </Link>
                )}
              </div>
            )}

            <button type="submit" disabled={isPending}
              className="w-full flex items-center justify-center gap-2 bg-emerald text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors">
              {isPending ? 'Création du compte…' : 'Créer mon compte'}
              {!isPending && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="text-slate-600 text-xs text-center mt-5">
            En créant un compte, vous acceptez nos conditions d&apos;utilisation.
          </p>

          <div className="text-center mt-4">
            <Link href="/choisir-profil"
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-600 text-xs transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Changer de profil
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Page — Suspense obligatoire pour useSearchParams en Next.js 15 ───────────

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-slate-400 text-sm">Chargement…</div>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  );
}

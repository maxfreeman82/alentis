'use client';

import { Suspense, useState, useRef, useTransition, useMemo, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, ArrowLeft, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';

const STEP_LABELS: Record<string, string> = {
  signup:   'Vérifiez votre email',
  recovery: 'Vérifiez votre email',
  invite:   'Vérifiez votre email professionnel',
};

function OtpInput() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const email        = searchParams.get('email') ?? '';
  const step         = searchParams.get('step')  ?? 'signup';

  const [digits,     setDigits]     = useState(['', '', '', '', '', '']);
  const [error,      setError]      = useState('');
  const [resendMsg,  setResendMsg]  = useState('');
  const [resendCD,   setResendCD]   = useState(0);
  const [isPending,  startTransition] = useTransition();
  const boxRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // Compte à rebours renvoi
  useEffect(() => {
    if (resendCD <= 0) return;
    const t = setTimeout(() => setResendCD(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCD]);

  function handleDigit(idx: number, value: string) {
    const d = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = d;
    setDigits(next);
    if (d && idx < 5) boxRefs.current[idx + 1]?.focus();
    if (next.every(v => v !== '')) void verifyCode(next.join(''));
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      boxRefs.current[idx - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    pasted.split('').forEach((c, i) => { if (i < 6) next[i] = c; });
    setDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    boxRefs.current[focusIdx]?.focus();
    if (pasted.length === 6) void verifyCode(pasted);
  }

  async function verifyCode(code: string) {
    setError('');
    startTransition(async () => {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });

      if (verifyErr) {
        setError('Code incorrect ou expiré. Vérifiez et réessayez.');
        setDigits(['', '', '', '', '', '']);
        boxRefs.current[0]?.focus();
        return;
      }

      // OTP vérifié — session créée. Appel post-verify pour créer le profil.
      const ctx = sessionStorage.getItem('ta_otp_ctx');
      const data = ctx ? JSON.parse(ctx) as {
        pw?:  string;
        pt?:  string;
        fn?:  string;
        ln?:  string;
        it?:  string;
      } : {};

      if (step === 'recovery') {
        // Mot de passe oublié — rediriger vers la page de nouveau mot de passe
        sessionStorage.removeItem('ta_otp_ctx');
        router.push('/nouveau-mot-de-passe');
        return;
      }

      // Signup ou invite — appel post-verify
      const res = await fetch('/api/auth/post-verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          password:    data.pw,
          profileType: data.pt,
          firstName:   data.fn,
          lastName:    data.ln,
          inviteToken: data.it,
        }),
      });

      sessionStorage.removeItem('ta_otp_ctx');

      const result = await res.json() as { ok?: boolean; redirect?: string; error?: string };
      if (!res.ok) { setError(result.error ?? 'Erreur lors de la création du compte.'); return; }
      router.push(result.redirect ?? '/onboarding');
      router.refresh();
    });
  }

  async function handleResend() {
    setResendMsg('');
    setError('');
    const { error: resendErr } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: step !== 'recovery' },
    });
    if (resendErr) { setError("Impossible de renvoyer le code. Réessayez."); return; }
    setResendMsg('Nouveau code envoyé !');
    setResendCD(60);
  }

  const code = digits.join('');
  const title = STEP_LABELS[step] ?? 'Vérifiez votre email';

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

      {step !== 'recovery' && (
        <div className="border-b border-slate-200">
          <div className="max-w-md mx-auto px-6 py-3 flex items-center gap-3">
            {[
              { n: '✓', label: 'Inscription', done: true },
              { n: '2', label: 'Vérification', done: false, active: true },
              { n: '3', label: 'Onboarding',   done: false },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {i > 0 && <div className="w-8 h-px bg-slate-50" />}
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                  s.done   ? 'bg-emerald/20 text-emerald' :
                  s.active ? 'bg-emerald text-white'       :
                             'border border-slate-200 text-slate-600'
                }`}>{s.n}</span>
                <span className={s.active ? 'text-slate-900 font-medium' : s.done ? 'text-slate-500' : 'text-slate-600'}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-emerald/10 border border-emerald/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-emerald" />
          </div>
          <h1 className="font-display text-slate-900 text-2xl mb-2">{title}</h1>
          <p className="text-slate-400 text-sm mb-1">
            Code envoyé à <span className="text-slate-900 font-medium">{email}</span>
          </p>
          <p className="text-slate-600 text-xs mb-8">Entrez le code à 6 chiffres reçu par email.</p>

          {/* Saisie OTP */}
          <div className="flex items-center justify-center gap-2 mb-6" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { boxRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                autoFocus={i === 0}
                className={`w-12 h-14 text-center text-xl font-mono font-bold rounded-xl border transition-all outline-none
                  ${d ? 'border-emerald/60 bg-emerald/5 text-slate-900' : 'border-slate-200 bg-bg-surface text-slate-900'}
                  focus:border-emerald/80 focus:bg-emerald/5`}
              />
            ))}
          </div>

          {isPending && (
            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mb-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Vérification…
            </div>
          )}

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-sm mb-4">
              {error}
            </div>
          )}

          {resendMsg && (
            <div className="flex items-center justify-center gap-2 text-emerald text-sm mb-4">
              <CheckCircle2 className="w-4 h-4" /> {resendMsg}
            </div>
          )}

          {/* Renvoyer */}
          <div className="space-y-2">
            <p className="text-slate-600 text-xs">Vous n&apos;avez pas reçu le code ?</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCD > 0}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-800 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {resendCD > 0 ? `Renvoyer dans ${resendCD}s` : 'Renvoyer le code'}
            </button>
          </div>

          <div className="mt-8">
            <Link href={step === 'invite' ? '/' : '/sign-up'}
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-600 text-xs transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              {step === 'invite' ? "Retour" : "Modifier l'email"}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VerifierEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    }>
      <OtpInput />
    </Suspense>
  );
}

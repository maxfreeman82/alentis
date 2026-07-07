'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { CheckCircle2, Loader2, Eye, EyeOff, Building2, LogIn, UserPlus } from 'lucide-react';

interface InviteInfo {
  email:       string;
  first_name:  string | null;
  last_name:   string | null;
  org_name:    string;
  role:        string;
  expires_at:  string;
  user_exists: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  org_admin:     'Administrateur',
  org_hr:        'RH',
  org_manager:   'Manager',
  org_recruiter: 'Recruteur',
  org_employee:  'Employé',
};

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const router    = useRouter();

  const [info,    setInfo]    = useState<InviteInfo | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Formulaire nouvel utilisateur
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [password,  setPassword]  = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [formErr,   setFormErr]   = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Formulaire utilisateur existant (connexion)
  const [existPwd,     setExistPwd]     = useState('');
  const [showExistPwd, setShowExistPwd] = useState(false);
  const [existErr,     setExistErr]     = useState<string | null>(null);
  const [joinDone,     setJoinDone]     = useState(false);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    void (async () => {
      try {
        const res  = await fetch(`/api/invitations/validate?token=${encodeURIComponent(token)}`);
        const data = await res.json() as { error?: string } & Partial<InviteInfo>;
        if (!res.ok) { setLoadErr(data.error ?? 'Invitation invalide'); return; }
        const inv = data as InviteInfo;
        setInfo(inv);
        setFirstName(inv.first_name ?? '');
        setLastName(inv.last_name   ?? '');
      } catch {
        setLoadErr('Erreur réseau — réessayez.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // ── Cas 1 : Nouvel utilisateur → OTP ─────────────────────────────────────
  function handleNewUser(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);
    if (!firstName.trim()) { setFormErr('Prénom requis'); return; }
    if (!lastName.trim())  { setFormErr('Nom requis');    return; }
    if (password.length < 8) { setFormErr('Mot de passe : 8 caractères minimum'); return; }

    startTransition(async () => {
      // Stocker le contexte pour post-verify (après saisie OTP)
      sessionStorage.setItem('ta_otp_ctx', JSON.stringify({
        pw: password,
        pt: 'org_employee',
        fn: firstName.trim(),
        ln: lastName.trim(),
        it: token,
      }));

      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email:   info!.email,
        options: { shouldCreateUser: true },
      });

      if (otpErr) {
        sessionStorage.removeItem('ta_otp_ctx');
        setFormErr(otpErr.message);
        return;
      }

      router.push(`/verifier-email?email=${encodeURIComponent(info!.email)}&step=invite`);
    });
  }

  // ── Cas 2 : Utilisateur existant → connexion + acceptation immédiate ─────
  function handleExistingUser(e: React.FormEvent) {
    e.preventDefault();
    setExistErr(null);

    startTransition(async () => {
      // Connexion
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email:    info!.email,
        password: existPwd,
      });
      if (signInErr) { setExistErr('Mot de passe incorrect.'); return; }

      // Lier à l'organisation
      const res  = await fetch('/api/invitations/accept-existing', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setExistErr(data.error ?? 'Erreur lors de la liaison.'); return; }

      setJoinDone(true);
      setTimeout(() => { router.push('/'); router.refresh(); }, 2000);
    });
  }

  // ── États de chargement / erreur ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (loadErr) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
          <span className="text-2xl">✕</span>
        </div>
        <h1 className="font-display text-slate-900 text-xl">Invitation invalide</h1>
        <p className="text-slate-400 text-sm">{loadErr}</p>
        <Link href="/sign-in" className="inline-block mt-4 text-emerald-400 hover:underline text-sm">
          Se connecter →
        </Link>
      </div>
    );
  }

  if (joinDone) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="font-display text-slate-900 text-2xl">Vous avez rejoint {info?.org_name} !</h1>
        <p className="text-slate-400 text-sm">Redirection vers votre espace…</p>
      </div>
    );
  }

  // ── En-tête commun ────────────────────────────────────────────────────────
  const header = (
    <div className="text-center space-y-3 mb-8">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
        <Building2 className="w-7 h-7 text-emerald-400" />
      </div>
      <div>
        <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-1">Invitation</p>
        <h1 className="font-display text-slate-900 text-2xl">Rejoindre {info?.org_name}</h1>
        <p className="text-slate-400 text-sm mt-1">
          Rôle :{' '}
          <span className="text-slate-900 font-medium">{ROLE_LABELS[info?.role ?? ''] ?? info?.role}</span>
        </p>
      </div>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-400 text-xs">
        {info?.email}
      </div>
    </div>
  );

  // ── Cas : utilisateur existant ────────────────────────────────────────────
  if (info?.user_exists) {
    return (
      <div className="max-w-md mx-auto py-12">
        {header}

        <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-2">
          <LogIn className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
          <p className="text-sky-300 text-xs">
            Vous avez déjà un compte Teranga Align. Connectez-vous pour rejoindre <strong>{info.org_name}</strong>.
          </p>
        </div>

        <form onSubmit={handleExistingUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email</label>
            <input
              type="email"
              value={info.email}
              readOnly
              className="w-full bg-bg-surface/50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-500 text-sm cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Mot de passe</label>
            <div className="relative">
              <input
                type={showExistPwd ? 'text' : 'password'}
                value={existPwd}
                onChange={e => setExistPwd(e.target.value)}
                required
                autoFocus
                placeholder="••••••••"
                className="w-full bg-bg-surface border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
              <button type="button" onClick={() => setShowExistPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                {showExistPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {existErr && (
            <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              {existErr}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-900 font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {isPending ? 'Connexion…' : 'Me connecter et rejoindre'}
          </button>

          <p className="text-center text-slate-600 text-xs">
            <Link href="/mot-de-passe-oublie" className="text-slate-500 hover:text-emerald-400 transition-colors">
              Mot de passe oublié ?
            </Link>
          </p>
        </form>
      </div>
    );
  }

  // ── Cas : nouvel utilisateur → formulaire + OTP ───────────────────────────
  return (
    <div className="max-w-md mx-auto py-12">
      {header}

      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-2">
        <UserPlus className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <p className="text-emerald-300 text-xs">
          Créez votre compte. Un code de vérification sera envoyé à <strong>{info?.email}</strong>.
        </p>
      </div>

      <form onSubmit={handleNewUser} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Prénom</label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Prénom"
              autoFocus
              autoComplete="given-name"
              className="w-full bg-bg-surface border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom</label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Nom"
              autoComplete="family-name"
              className="w-full bg-bg-surface border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email professionnel</label>
          <input
            type="email"
            value={info?.email ?? ''}
            readOnly
            className="w-full bg-bg-surface/50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-500 text-sm cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Mot de passe <span className="text-slate-600 font-normal">(8 caractères min.)</span>
          </label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={8}
              className="w-full bg-bg-surface border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
            <button type="button" onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {formErr && (
          <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
            {formErr}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-900 font-semibold rounded-xl py-3 text-sm transition-colors"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {isPending ? 'Envoi du code…' : 'Créer mon compte'}
        </button>

        <p className="text-center text-slate-700 text-[10px]">
          Invitation valide jusqu'au{' '}
          {info ? new Date(info.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
        </p>
      </form>
    </div>
  );
}

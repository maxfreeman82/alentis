import { withAuth } from '@workos-inc/authkit-nextjs';
import { getUserOrg } from '@/lib/supabase/auth';
import { SectionHeader } from '@/components/shared';
import Link from 'next/link';
import { CheckCircle2, Circle, ArrowRight, LogOut } from 'lucide-react';
import { signOutAction } from '@/app/actions/auth';

export default async function OnboardingPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);

  const hasProfile   = ctx !== null;
  const hasPassport  = hasProfile && false; // sera vérifié en DB si besoin
  const hasPulse     = false;
  const hasPayroll   = false;

  // Vérifier si le passport et pulse existent
  let passportDone = false;
  let pulseDone    = false;

  if (ctx) {
    const [passportRes, pulseRes] = await Promise.all([
      ctx.supabase.from('talent_passports').select('id').eq('profile_id', ctx.profileId).maybeSingle(),
      ctx.supabase.from('vision_pulse_responses').select('id').eq('profile_id', ctx.profileId).limit(1).maybeSingle(),
    ]);
    passportDone = !!passportRes.data;
    pulseDone    = !!pulseRes.data;
  }

  const steps = [
    {
      id:       'auth',
      title:    'Connexion WorkOS',
      desc:     'Votre compte est authentifié de façon sécurisée.',
      done:     true,
      link:     null,
    },
    {
      id:       'profile',
      title:    'Profil Teranga Align',
      desc:     hasProfile
        ? `Bienvenue, ${ctx?.firstName ?? user.firstName ?? 'vous'} — votre profil est actif dans ${ctx?.orgName ?? 'votre organisation'}.`
        : 'Votre profil n\'a pas encore été relié à une organisation. Contactez votre administrateur RH.',
      done:     hasProfile,
      link:     null,
    },
    {
      id:       'passport',
      title:    'Passport Talent 6D',
      desc:     passportDone
        ? 'Votre assessment 6 dimensions est complété.'
        : 'Passez l\'assessment 40 questions pour générer votre Passport Talent.',
      done:     passportDone,
      link:     '/assessment',
    },
    {
      id:       'pulse',
      title:    'Vision Pulse Q2 2026',
      desc:     pulseDone
        ? 'Votre sondage d\'adhésion trimestriel est soumis.'
        : 'Répondez au sondage Vision Pulse pour indiquer votre adhésion à la stratégie.',
      done:     pulseDone,
      link:     '/vision-pulse/survey',
    },
    {
      id:       'dashboard',
      title:    'Explorer le dashboard',
      desc:     'Découvrez vos métriques IAS, bien-être, recrutement et performance.',
      done:     hasProfile,
      link:     '/dashboard',
    },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const progressPct    = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <SectionHeader
        tag="BIENVENUE"
        title={`Bonjour, ${ctx?.firstName ?? user.firstName ?? 'Nouveau membre'} 👋`}
        subtitle="Votre parcours d'intégration sur Teranga Align"
      />

      {/* Barre de progression */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">{completedCount}/{steps.length} étapes complétées</span>
          <span className="font-mono text-emerald font-bold">{progressPct}%</span>
        </div>
        <div className="h-2 bg-bg rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Étapes */}
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div
            key={step.id}
            className={`rounded-xl border p-4 flex items-start gap-4 transition-all ${
              step.done
                ? 'border-emerald/20 bg-emerald/[0.04]'
                : 'border-white/[0.06] bg-white/[0.02]'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {step.done
                ? <CheckCircle2 size={20} className="text-emerald" />
                : <Circle size={20} className="text-slate-600" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 text-xs font-mono">0{i + 1}</span>
                <p className={`text-sm font-semibold ${step.done ? 'text-white' : 'text-slate-300'}`}>
                  {step.title}
                </p>
              </div>
              <p className="text-slate-500 text-xs mt-1">{step.desc}</p>
            </div>
            {step.link && !step.done && (
              <Link
                href={step.link}
                className="flex-shrink-0 flex items-center gap-1 text-xs text-emerald hover:text-emerald/80 transition-colors mt-0.5"
              >
                Commencer <ArrowRight size={12} />
              </Link>
            )}
            {step.link && step.done && (
              <Link
                href={step.link}
                className="flex-shrink-0 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-400 transition-colors mt-0.5"
              >
                Voir <ArrowRight size={12} />
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Si aucun profil Supabase → aide pour se connecter avec le bon compte */}
      {!hasProfile && (
        <div className="rounded-xl border border-amber/20 bg-amber/[0.05] p-5 space-y-3">
          <p className="text-amber text-sm font-semibold">Profil non trouvé</p>
          <p className="text-slate-400 text-xs">
            Vous êtes connecté avec le compte <strong className="text-white">{user.email}</strong> mais aucun profil Teranga Align n&apos;est associé à cet identifiant. Si vous avez des comptes de test, déconnectez-vous et reconnectez-vous avec le bon email.
          </p>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex items-center gap-2 text-xs text-rose hover:text-rose/80 transition-colors"
            >
              <LogOut size={13} /> Se déconnecter et changer de compte
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

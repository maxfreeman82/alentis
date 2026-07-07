import Link from 'next/link';
import { Star, Briefcase, Rocket, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

const PROFILES = [
  {
    id: 'talent',
    icon: Star,
    label: 'Talent / Candidat',
    subtitle: 'Je cherche un emploi ou je veux découvrir mon profil professionnel',
    color: 'emerald',
    border:  'border-emerald/30 hover:border-emerald/60 focus-within:border-emerald/60',
    iconBg:  'bg-emerald/10 text-emerald',
    check:   'bg-emerald text-white',
    details: [
      'Talent Passport 6D gratuit',
      'Matching intelligent avec les offres',
      'Passport portable d\'une entreprise à l\'autre',
    ],
  },
  {
    id: 'entreprise',
    icon: Briefcase,
    label: 'Entreprise / RH',
    subtitle: 'Je gère les ressources humaines ou le recrutement dans mon organisation',
    color: 'sky',
    border:  'border-sky-500/30 hover:border-sky-500/60 focus-within:border-sky-500/60',
    iconBg:  'bg-sky-500/10 text-sky-400',
    check:   'bg-sky-500 text-white',
    details: [
      'Recrutement avec matching 6D',
      'Gestion équipe et performances',
      'Analytics alignement stratégique',
    ],
  },
  {
    id: 'fondateur',
    icon: Rocket,
    label: 'Fondateur / Entrepreneur',
    subtitle: 'Je lance ou développe une startup et je veux composer mon équipe',
    color: 'violet',
    border:  'border-violet-500/30 hover:border-violet-500/60 focus-within:border-violet-500/60',
    iconBg:  'bg-violet-500/10 text-violet-400',
    check:   'bg-violet-500 text-white',
    details: [
      'Boussole stratégique IA',
      'Matching fondateur ↔ talents',
      'Business Plan et coût employeur',
    ],
  },
];

export default function ChoisirProfilPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header minimal */}
      <header className="border-b border-slate-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald rounded-md flex items-center justify-center">
              <span className="font-display text-slate-900 font-bold text-sm">TA</span>
            </div>
            <span className="font-display text-slate-900 text-sm font-semibold">Teranga Align</span>
          </Link>
          <Link href="/sign-in" className="text-slate-500 hover:text-slate-800 text-xs transition-colors">
            Déjà un compte ? Se connecter →
          </Link>
        </div>
      </header>

      {/* Barre de progression */}
      <div className="border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-5 h-5 rounded-full bg-emerald text-white flex items-center justify-center font-bold text-[10px]">1</span>
            <span className="text-slate-900 font-medium">Choix du profil</span>
          </div>
          <div className="flex-1 h-px bg-slate-50" />
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-5 h-5 rounded-full border border-slate-200 flex items-center justify-center font-bold text-[10px]">2</span>
            <span>Inscription</span>
          </div>
          <div className="flex-1 h-px bg-slate-50" />
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-5 h-5 rounded-full border border-slate-200 flex items-center justify-center font-bold text-[10px]">3</span>
            <span>Onboarding</span>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Titre */}
          <div className="text-center mb-8">
            <p className="text-emerald text-xs font-semibold uppercase tracking-widest mb-3">Étape 1 sur 3</p>
            <h1 className="font-display text-slate-900 text-2xl sm:text-3xl mb-2">
              Qui êtes-vous ?
            </h1>
            <p className="text-slate-400 text-sm">
              Choisissez votre profil pour accéder à l&apos;espace qui vous correspond.
            </p>
          </div>

          {/* Cards profils */}
          <div className="space-y-3 mb-8">
            {PROFILES.map(p => {
              const Icon = p.icon;
              return (
                <a key={p.id} href={`/api/auth/start?profile=${p.id}`}
                  className={`group flex items-start gap-4 p-5 rounded-2xl border bg-card transition-all cursor-pointer ${p.border}`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${p.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 font-semibold text-sm mb-1">{p.label}</p>
                    <p className="text-slate-400 text-xs mb-3 leading-relaxed">{p.subtitle}</p>
                    <ul className="space-y-1">
                      {p.details.map(d => (
                        <li key={d} className="flex items-center gap-1.5 text-slate-500 text-xs">
                          <CheckCircle className="w-3 h-3 flex-shrink-0" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex-shrink-0 mt-1">
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-800 group-hover:translate-x-1 transition-all" />
                  </div>
                </a>
              );
            })}
          </div>

          {/* Retour */}
          <div className="text-center">
            <Link href="/"
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-600 text-xs transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

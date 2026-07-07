import Link from 'next/link';
import {
  Star, Briefcase, Rocket, ArrowRight, Shield,
  Globe, Zap, TrendingUp, Users, CheckCircle,
} from 'lucide-react';

const PROFILES = [
  {
    icon: Star,
    color: 'emerald',
    label: 'Je suis un Talent',
    subtitle: 'Candidat · Professionnel · Étudiant',
    description: 'Créez votre Talent Passport 6D. Découvrez vos forces profondes. Trouvez des opportunités alignées à qui vous êtes vraiment.',
    features: [
      'Talent Passport gratuit',
      'Score 6D : Hard, Soft, XP, Life, Énergie, Risque',
      'Matching intelligent avec les offres',
      'Portable d\'une entreprise à l\'autre',
    ],
    cta: 'Créer mon Talent Passport',
    href: '/choisir-profil',
    border: 'border-emerald/30 hover:border-emerald/50',
    iconBg: 'bg-emerald/10 text-emerald',
    btn: 'bg-emerald text-white hover:bg-emerald-500',
  },
  {
    icon: Briefcase,
    color: 'sky',
    label: 'Je représente une Entreprise',
    subtitle: 'RH · Manager · Recruteur',
    description: 'Recrutez avec précision grâce aux scores 6D. Alignez vos équipes avec votre vision. Réduisez le turnover durablement.',
    features: [
      'Matching automatique candidats ↔ postes',
      'Diagnostic pré-candidature IA',
      'Gestion RH complète',
      'Analytics alignement équipe',
    ],
    cta: 'Accéder à l\'espace entreprise',
    href: '/choisir-profil',
    border: 'border-sky-500/30 hover:border-sky-500/50',
    iconBg: 'bg-sky-500/10 text-sky-400',
    btn: 'bg-sky-500 text-white hover:bg-sky-600',
  },
  {
    icon: Rocket,
    color: 'violet',
    label: 'Je suis Fondateur',
    subtitle: 'Entrepreneur · Startup · PME',
    description: 'Composez l\'équipe de vos rêves avec l\'IA. Identifiez les profils énergétiques complémentaires. Calculez le coût réel de votre premier employé.',
    features: [
      'Boussole stratégique personnalisée',
      'Matching fondateur ↔ talents disponibles',
      'Business Plan assisté IA',
      'Coût employeur calculé',
    ],
    cta: 'Démarrer en mode Fondateur',
    href: '/choisir-profil',
    border: 'border-violet-500/30 hover:border-violet-500/50',
    iconBg: 'bg-violet-500/10 text-violet-400',
    btn: 'bg-violet-500 text-white hover:bg-violet-600',
  },
];

const STATS = [
  { value: '12', unit: ' pays', label: 'couverts en Afrique' },
  { value: '6D', unit: '',     label: 'dimensions d\'évaluation' },
  { value: '40', unit: ' q.',  label: 'questionnaire calibré' },
  { value: '100%', unit: '',   label: 'données chiffrées' },
];

const DIFFERENCIATEURS = [
  {
    icon: Zap,
    title: 'Évaluation 6D complète',
    text: 'Hard Skills · Soft Skills · Expérience · Life Score · Énergie · Risque — un score qui vous représente vraiment.',
  },
  {
    icon: TrendingUp,
    title: 'Diagnostic avant candidature',
    text: 'Avant d\'envoyer votre CV, l\'IA calcule vos chances, identifie vos gaps et vous recommande les formations clés.',
  },
  {
    icon: Shield,
    title: 'Passport portable à vie',
    text: 'Ancré sur votre email personnel. Votre Passport survit aux changements d\'employeur — vos données vous appartiennent.',
  },
  {
    icon: Globe,
    title: 'Calibré pour l\'Afrique',
    text: 'Conçu pour les réalités économiques, culturelles et professionnelles africaines. Pas un outil occidental adapté.',
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-bg/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald rounded-lg flex items-center justify-center">
              <span className="font-display text-slate-900 font-bold text-sm">TA</span>
            </div>
            <span className="font-display text-slate-900 font-semibold">Teranga Align</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in"
              className="text-slate-400 hover:text-slate-800 text-sm transition-colors hidden sm:block">
              Se connecter
            </Link>
            <Link href="/sign-in"
              className="flex items-center gap-1.5 bg-emerald text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-emerald-500 transition-colors">
              Commencer
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 space-y-24 pb-24">

        {/* Hero */}
        <section className="text-center pt-16 sm:pt-24">
          <div className="inline-flex items-center gap-2 bg-emerald/10 border border-emerald/20 rounded-full px-4 py-1.5 text-emerald text-xs font-semibold mb-6">
            <span className="w-1.5 h-1.5 bg-emerald rounded-full animate-pulse" />
            Le moteur d&apos;alignement stratégique du travail en Afrique
          </div>
          <h1 className="font-display text-slate-900 text-4xl sm:text-6xl leading-tight mb-5">
            Votre carrière.<br />
            <span className="text-emerald">Votre impact.</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Teranga Align connecte les talents africains aux opportunités qui correspondent
            à leurs forces profondes — pas seulement à leur CV.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/sign-in"
              className="flex items-center gap-2 bg-emerald text-white px-7 py-3.5 rounded-xl font-semibold text-sm hover:bg-emerald-500 transition-colors w-full sm:w-auto justify-center">
              Commencer gratuitement
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/sign-in"
              className="flex items-center gap-2 border border-slate-200 text-slate-600 px-7 py-3.5 rounded-xl text-sm hover:border-slate-200 hover:text-slate-800 transition-colors w-full sm:w-auto justify-center">
              J&apos;ai déjà un compte
            </Link>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map(s => (
            <div key={s.label} className="bg-card border border-slate-200 rounded-2xl p-5 text-center">
              <p className="font-display text-slate-900 text-3xl font-bold">
                {s.value}
                <span className="text-emerald text-lg">{s.unit}</span>
              </p>
              <p className="text-slate-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </section>

        {/* Les 3 profils */}
        <section>
          <div className="text-center mb-10">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-2">Choisissez votre espace</p>
            <h2 className="font-display text-slate-900 text-2xl sm:text-3xl">Pour qui est Teranga Align ?</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {PROFILES.map(p => {
              const Icon = p.icon;
              return (
                <div key={p.label}
                  className={`bg-card border rounded-2xl p-6 flex flex-col transition-colors ${p.border}`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${p.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="font-display text-slate-900 font-semibold text-lg mb-0.5">{p.label}</p>
                  <p className="text-slate-500 text-xs mb-3">{p.subtitle}</p>
                  <p className="text-slate-400 text-sm mb-5 flex-1 leading-relaxed">{p.description}</p>
                  <ul className="space-y-2 mb-6">
                    {p.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-slate-400 text-xs">
                        <CheckCircle className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={p.href}
                    className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${p.btn}`}>
                    {p.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* Différenciateurs */}
        <section>
          <div className="text-center mb-10">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-2">Pourquoi Teranga Align</p>
            <h2 className="font-display text-slate-900 text-2xl sm:text-3xl">
              Le recrutement africain,{' '}
              <span className="text-emerald">réinventé</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {DIFFERENCIATEURS.map(d => {
              const Icon = d.icon;
              return (
                <div key={d.title} className="bg-card border border-slate-200 rounded-2xl p-6 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-emerald" />
                  </div>
                  <div>
                    <p className="text-slate-900 font-semibold text-sm mb-1">{d.title}</p>
                    <p className="text-slate-400 text-xs leading-relaxed">{d.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA final */}
        <section className="bg-card border border-emerald/20 rounded-2xl p-10 text-center">
          <div className="w-12 h-12 bg-emerald/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-emerald" />
          </div>
          <h2 className="font-display text-slate-900 text-2xl sm:text-3xl mb-3">
            Prêt à découvrir votre profil ?
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-7 leading-relaxed">
            Créez votre Talent Passport en 15 minutes.
            Gratuit pour tous les talents. Aucune carte bancaire requise.
          </p>
          <Link href="/sign-in"
            className="inline-flex items-center gap-2 bg-emerald text-white px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-emerald-500 transition-colors">
            Choisir mon profil — c&apos;est gratuit
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald rounded-md flex items-center justify-center">
              <span className="font-display text-slate-900 font-bold text-xs">TA</span>
            </div>
            <span className="text-slate-600 text-xs">Teranga Align © 2026</span>
          </div>
          <div className="flex items-center gap-6 text-slate-700 text-xs">
            <span>Données chiffrées</span>
            <span>12 pays africains</span>
            <span>Gratuit pour les talents</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

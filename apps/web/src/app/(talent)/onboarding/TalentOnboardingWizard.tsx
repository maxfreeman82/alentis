'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitOnboarding, type OnboardingData } from '@/app/actions/onboarding';
import {
  ArrowRight, ArrowLeft, CheckCircle2, Star, Briefcase, Target,
  Mail, Phone, MapPin, AlertCircle, Loader2,
} from 'lucide-react';

// ─── Constantes ──────────────────────────────────────────────────────────────

const SECTORS = [
  'Technologie', 'Finance & Banque', 'Agriculture & Agritech',
  'Santé & Healthcare', 'Éducation & EdTech', 'Logistique & Transport',
  'Médias & Communication', 'BTP & Construction', 'Tourisme & Hôtellerie',
  'Microfinance & Inclusion', 'Énergie & Environnement', 'Commerce & Distribution',
  'Industrie & Manufacturing', 'Conseil & Services', 'Immobilier',
];

const STATUS_OPTIONS = [
  { value: 'looking',   label: 'Je cherche activement',       icon: '🎯', desc: 'Disponible immédiatement' },
  { value: 'open',      label: 'Ouvert(e) aux opportunités',  icon: '👀', desc: 'En poste, à l\'écoute' },
  { value: 'employed',  label: 'En poste, pas en recherche',  icon: '💼', desc: 'Je perfectionne mon Passport' },
  { value: 'founder',   label: 'Entrepreneur(e)',             icon: '🚀', desc: 'Je lance ma boîte' },
] as const;

const LOCATION_OPTIONS = [
  { value: 'onsite', label: 'Présentiel', desc: 'Au bureau' },
  { value: 'remote', label: 'Télétravail', desc: 'Full remote' },
  { value: 'hybrid', label: 'Hybride', desc: 'Mix bureau / remote' },
] as const;

const COMMON_ROLES = [
  'Développeur Full Stack', 'Développeur Frontend', 'Développeur Backend',
  'Data Analyst', 'Data Scientist', 'Chef de Projet', 'Product Manager',
  'Manager Commercial', 'Responsable Marketing', 'DRH / RH',
  'Comptable / Finance', 'Ingénieur', 'Designer UX/UI',
  'Responsable Logistique', 'Médecin / Clinicien', 'Enseignant / Formateur',
];

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = OnboardingData;

// ─── Composant utilitaire ────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string | undefined; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs text-slate-400">{label}</label>
      {children}
      {error && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
    </div>
  );
}

const inputCls = 'w-full bg-bg border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald/50 transition-colors';

// ─── Étape 1 — Identité ───────────────────────────────────────────────────────

function Step1({ data, upd, onNext, workosEmail }: {
  data: FormData; upd: (p: Partial<FormData>) => void;
  onNext: () => void; workosEmail: string;
}) {
  const [errs, setErrs] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!data.firstName.trim()) e.firstName = 'Obligatoire';
    if (!data.lastName.trim())  e.lastName  = 'Obligatoire';
    if (!data.personalEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.personalEmail)) {
      e.personalEmail = 'Email valide requis';
    }
    setErrs(e);
    return !Object.keys(e).length;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-emerald text-xs font-semibold uppercase tracking-widest mb-1">Étape 1 / 4</p>
        <h1 className="font-display text-white text-2xl font-bold">Bienvenue sur Teranga Align</h1>
        <p className="text-slate-400 text-sm mt-1">Votre Talent Passport commence ici. Quelques infos pour vous identifier.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Prénom *" error={errs.firstName}>
          <input value={data.firstName} onChange={e => upd({ firstName: e.target.value })}
            placeholder="Moussa" className={inputCls} />
        </Field>
        <Field label="Nom *" error={errs.lastName}>
          <input value={data.lastName} onChange={e => upd({ lastName: e.target.value })}
            placeholder="Diallo" className={inputCls} />
        </Field>
      </div>

      <div className="space-y-2">
        <Field label="Email personnel *" error={errs.personalEmail}>
          <div className="relative">
            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
            <input type="email" value={data.personalEmail}
              onChange={e => upd({ personalEmail: e.target.value })}
              placeholder="votre.email@personnel.com"
              className={`${inputCls} pl-9`} />
          </div>
        </Field>
        <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald/[0.06] border border-emerald/20">
          <Star size={12} className="text-emerald mt-0.5 flex-shrink-0" />
          <p className="text-emerald text-xs leading-relaxed">
            Cet email est l'ancre permanente de votre Talent Passport. Même si vous changez d'entreprise, votre Passport reste actif sur cet email.
            {workosEmail !== data.personalEmail && workosEmail && (
              <button onClick={() => upd({ personalEmail: workosEmail })}
                className="ml-1 underline hover:no-underline">
                Utiliser {workosEmail}
              </button>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Téléphone">
          <div className="relative">
            <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
            <input value={data.phone} onChange={e => upd({ phone: e.target.value })}
              placeholder="+221 77 000 00 00" className={`${inputCls} pl-9`} />
          </div>
        </Field>
        <Field label="Ville">
          <div className="relative">
            <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
            <input value={data.city} onChange={e => upd({ city: e.target.value })}
              placeholder="Dakar" className={`${inputCls} pl-9`} />
          </div>
        </Field>
      </div>

      <Field label="Pays">
        <select value={data.country} onChange={e => upd({ country: e.target.value })}
          className={inputCls}>
          {[['SN','Sénégal'],['CI','Côte d\'Ivoire'],['ML','Mali'],['BF','Burkina Faso'],
            ['GN','Guinée'],['MR','Mauritanie'],['GH','Ghana'],['NG','Nigeria'],
            ['CM','Cameroun'],['MA','Maroc'],['FR','France'],['BE','Belgique'],['CA','Canada']].map(([v,l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </Field>

      <button onClick={() => validate() && onNext()}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald text-bg font-semibold text-sm hover:bg-emerald/90 transition-all">
        Continuer <ArrowRight size={16} />
      </button>
    </div>
  );
}

// ─── Étape 2 — Situation ──────────────────────────────────────────────────────

function Step2({ data, upd, onNext, onBack }: {
  data: FormData; upd: (p: Partial<FormData>) => void;
  onNext: () => void; onBack: () => void;
}) {
  const [errs, setErrs] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!data.sector) e.sector = 'Choisissez votre secteur';
    setErrs(e);
    return !Object.keys(e).length;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-emerald text-xs font-semibold uppercase tracking-widest mb-1">Étape 2 / 4</p>
        <h2 className="font-display text-white text-2xl font-bold">Ma situation</h2>
        <p className="text-slate-400 text-sm mt-1">Où en êtes-vous dans votre parcours professionnel ?</p>
      </div>

      {/* Statut */}
      <div className="grid grid-cols-2 gap-2">
        {STATUS_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => upd({ currentStatus: opt.value })}
            className={`p-3 rounded-xl border text-left transition-all ${
              data.currentStatus === opt.value
                ? 'border-emerald bg-emerald/[0.08]'
                : 'border-white/[0.06] hover:border-white/10'
            }`}>
            <span className="text-lg">{opt.icon}</span>
            <p className={`text-xs font-semibold mt-1 ${data.currentStatus === opt.value ? 'text-emerald' : 'text-white'}`}>{opt.label}</p>
            <p className="text-slate-600 text-[10px] mt-0.5">{opt.desc}</p>
          </button>
        ))}
      </div>

      {/* Secteur */}
      <Field label="Votre secteur *" error={errs.sector}>
        <select value={data.sector} onChange={e => upd({ sector: e.target.value })} className={inputCls}>
          <option value="">Choisir un secteur…</option>
          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>

      {/* Années d'expérience */}
      <Field label="Années d'expérience">
        <select value={data.yearsExp} onChange={e => upd({ yearsExp: Number(e.target.value) })} className={inputCls}>
          {[0,1,2,3,4,5,7,10,15,20].map(n => (
            <option key={n} value={n}>{n === 0 ? 'Moins d\'1 an' : n === 20 ? '20+ ans' : `${n} ans`}</option>
          ))}
        </select>
      </Field>

      {/* Poste & Entreprise actuels */}
      {(data.currentStatus === 'employed' || data.currentStatus === 'open') && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Poste actuel">
            <input value={data.jobTitle} onChange={e => upd({ jobTitle: e.target.value })}
              placeholder="Ex : Lead Developer" className={inputCls} />
          </Field>
          <Field label="Entreprise">
            <input value={data.employerName} onChange={e => upd({ employerName: e.target.value })}
              placeholder="Ex : TechSenegal" className={inputCls} />
          </Field>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.06] text-slate-400 hover:text-white hover:border-white/10 text-sm transition-all">
          <ArrowLeft size={14} />
        </button>
        <button onClick={() => validate() && onNext()}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald text-bg font-semibold text-sm hover:bg-emerald/90 transition-all">
          Continuer <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Étape 3 — Objectifs ──────────────────────────────────────────────────────

function Step3({ data, upd, onNext, onBack }: {
  data: FormData; upd: (p: Partial<FormData>) => void;
  onNext: () => void; onBack: () => void;
}) {
  const [roleInput, setRoleInput] = useState('');

  function addRole(role: string) {
    if (role.trim() && data.targetRoles.length < 3 && !data.targetRoles.includes(role.trim())) {
      upd({ targetRoles: [...data.targetRoles, role.trim()] });
      setRoleInput('');
    }
  }

  function toggleSector(s: string) {
    const next = data.targetSectors.includes(s)
      ? data.targetSectors.filter(x => x !== s)
      : [...data.targetSectors, s];
    upd({ targetSectors: next });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-emerald text-xs font-semibold uppercase tracking-widest mb-1">Étape 3 / 4</p>
        <h2 className="font-display text-white text-2xl font-bold">Mes objectifs</h2>
        <p className="text-slate-400 text-sm mt-1">Vers quoi vous dirigez-vous ?</p>
      </div>

      {/* Rôles visés */}
      <div className="space-y-2">
        <label className="block text-xs text-slate-400">Rôles visés (3 max)</label>
        {data.targetRoles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {data.targetRoles.map(r => (
              <span key={r} className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-emerald/10 border border-emerald/20 text-emerald">
                {r}
                <button onClick={() => upd({ targetRoles: data.targetRoles.filter(x => x !== r) })}
                  className="hover:text-white text-emerald/60">×</button>
              </span>
            ))}
          </div>
        )}
        {data.targetRoles.length < 3 && (
          <div className="flex gap-2">
            <input value={roleInput} onChange={e => setRoleInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addRole(roleInput)}
              placeholder="Ex : Product Manager" className={`${inputCls} flex-1`} />
            <button onClick={() => addRole(roleInput)}
              className="px-3 rounded-xl bg-white/[0.06] text-slate-400 hover:text-white text-sm transition-colors">+</button>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {COMMON_ROLES.filter(r => !data.targetRoles.includes(r)).slice(0, 8).map(r => (
            <button key={r} onClick={() => addRole(r)}
              className="text-[10px] px-2 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/10 transition-all">
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Secteurs cibles */}
      <div className="space-y-2">
        <label className="block text-xs text-slate-400">Secteurs d'intérêt</label>
        <div className="flex flex-wrap gap-2">
          {SECTORS.map(s => (
            <button key={s} onClick={() => toggleSector(s)}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${
                data.targetSectors.includes(s)
                  ? 'border-sky/40 bg-sky/10 text-sky'
                  : 'border-white/[0.06] text-slate-500 hover:border-white/10 hover:text-slate-300'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Salaire min */}
      <Field label="Prétentions salariales minimales (FCFA / mois)">
        <input type="number" value={data.salaryMin ?? ''} min={0} step={50000}
          onChange={e => upd({ salaryMin: e.target.value ? Number(e.target.value) : null })}
          placeholder="Ex : 400000" className={inputCls} />
      </Field>

      {/* Localisation */}
      <div className="space-y-2">
        <label className="block text-xs text-slate-400">Mode de travail préféré</label>
        <div className="grid grid-cols-3 gap-2">
          {LOCATION_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => upd({ locationPref: opt.value })}
              className={`p-3 rounded-xl border text-center transition-all ${
                data.locationPref === opt.value
                  ? 'border-sky/40 bg-sky/10'
                  : 'border-white/[0.06] hover:border-white/10'
              }`}>
              <p className={`text-xs font-semibold ${data.locationPref === opt.value ? 'text-sky' : 'text-white'}`}>{opt.label}</p>
              <p className="text-slate-600 text-[10px] mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <div onClick={() => upd({ mobilityOk: !data.mobilityOk })}
          className={`w-10 h-5 rounded-full transition-all flex-shrink-0 ${data.mobilityOk ? 'bg-emerald' : 'bg-white/[0.08]'}`}>
          <div className={`w-4 h-4 rounded-full bg-white shadow mt-0.5 transition-all ${data.mobilityOk ? 'ml-5' : 'ml-0.5'}`} />
        </div>
        <span className="text-sm text-slate-300">Ouvert(e) à la relocalisation</span>
      </label>

      <div className="flex gap-3">
        <button onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.06] text-slate-400 hover:text-white text-sm transition-all">
          <ArrowLeft size={14} />
        </button>
        <button onClick={onNext}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald text-bg font-semibold text-sm hover:bg-emerald/90 transition-all">
          Continuer <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Étape 4 — Résumé + Lancement ────────────────────────────────────────────

function Step4({ data, onSubmit, onBack, isPending, error }: {
  data: FormData; onSubmit: () => void; onBack: () => void;
  isPending: boolean; error: string;
}) {
  const statusLabel: Record<string, string> = {
    looking: 'En recherche active',
    open: 'Ouvert aux opportunités',
    employed: 'En poste',
    founder: 'Entrepreneur',
  };
  const locationLabel: Record<string, string> = {
    onsite: 'Présentiel', remote: 'Télétravail', hybrid: 'Hybride',
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-emerald text-xs font-semibold uppercase tracking-widest mb-1">Étape 4 / 4</p>
        <h2 className="font-display text-white text-2xl font-bold">Prêt(e) pour l'évaluation</h2>
        <p className="text-slate-400 text-sm mt-1">Vérifiez vos informations, puis lancez votre Talent Passport.</p>
      </div>

      {/* Résumé */}
      <div className="space-y-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-widest">
            <CheckCircle2 size={12} className="text-emerald" /> Identité
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-slate-500">Nom</span><p className="text-white">{data.firstName} {data.lastName}</p></div>
            <div><span className="text-slate-500">Email Passport</span><p className="text-white truncate">{data.personalEmail}</p></div>
            {data.city && <div><span className="text-slate-500">Ville</span><p className="text-white">{data.city}, {data.country}</p></div>}
            {data.phone && <div><span className="text-slate-500">Tél</span><p className="text-white">{data.phone}</p></div>}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-widest">
            <CheckCircle2 size={12} className="text-emerald" /> Situation
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-slate-500">Statut</span><p className="text-white">{statusLabel[data.currentStatus]}</p></div>
            {data.sector && <div><span className="text-slate-500">Secteur</span><p className="text-white">{data.sector}</p></div>}
            {data.yearsExp > 0 && <div><span className="text-slate-500">Expérience</span><p className="text-white">{data.yearsExp} ans</p></div>}
            {data.jobTitle && <div><span className="text-slate-500">Poste</span><p className="text-white">{data.jobTitle}</p></div>}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-widest">
            <CheckCircle2 size={12} className="text-emerald" /> Objectifs
          </div>
          <div className="text-sm space-y-1.5">
            {data.targetRoles.length > 0 && (
              <div><span className="text-slate-500">Rôles visés</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.targetRoles.map(r => <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-emerald/10 text-emerald">{r}</span>)}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div><span className="text-slate-500">Mode</span><p className="text-white">{locationLabel[data.locationPref]}</p></div>
              {data.salaryMin && <div><span className="text-slate-500">Salaire min</span><p className="text-white">{data.salaryMin.toLocaleString('fr-FR')} FCFA</p></div>}
              {data.mobilityOk && <div className="col-span-2"><span className="text-xs px-2 py-0.5 rounded-full bg-sky/10 text-sky">Mobilité OK</span></div>}
            </div>
          </div>
        </div>
      </div>

      {/* Explication des tests */}
      <div className="rounded-xl border border-amber/20 bg-amber/[0.05] p-4 space-y-2">
        <p className="text-amber text-sm font-semibold">Ce qui vous attend ensuite</p>
        <p className="text-slate-400 text-xs leading-relaxed">
          L'évaluation Talent Passport comporte 40 questions réparties en 6 dimensions : Hard Skills, Soft Skills, Expérience, Life Score, Profil Énergétique et Risque. Comptez environ 12-15 minutes. À la fin, votre profil 6D est révélé.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-rose-400 text-sm p-3 rounded-xl bg-rose-400/5 border border-rose-400/20">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} disabled={isPending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.06] text-slate-400 hover:text-white text-sm transition-all disabled:opacity-50">
          <ArrowLeft size={14} />
        </button>
        <button onClick={onSubmit} disabled={isPending}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald text-bg font-bold text-sm hover:bg-emerald/90 disabled:opacity-60 transition-all">
          {isPending
            ? <><Loader2 size={16} className="animate-spin" /> Création du profil…</>
            : <>✦ Lancer mon évaluation <ArrowRight size={16} /></>
          }
        </button>
      </div>
    </div>
  );
}

// ─── Wizard principal ─────────────────────────────────────────────────────────

export function TalentOnboardingWizard({ workosEmail, workosFirstName, workosLastName }: {
  workosEmail: string;
  workosFirstName: string;
  workosLastName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<FormData>({
    firstName:     workosFirstName,
    lastName:      workosLastName,
    personalEmail: '',
    phone:         '',
    city:          '',
    country:       'SN',
    currentStatus: 'open',
    sector:        '',
    yearsExp:      0,
    jobTitle:      '',
    employerName:  '',
    targetRoles:   [],
    targetSectors: [],
    salaryMin:     null,
    locationPref:  'onsite',
    mobilityOk:    false,
  });

  function upd(partial: Partial<FormData>) {
    setFormData(prev => ({ ...prev, ...partial }));
  }

  function handleSubmit() {
    setError('');
    startTransition(async () => {
      const result = await submitOnboarding(formData);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      router.push('/talent/assessment');
    });
  }

  // Barre de progression
  const STEPS = [
    { num: 1, label: 'Identité',  icon: <Mail size={12} /> },
    { num: 2, label: 'Situation', icon: <Briefcase size={12} /> },
    { num: 3, label: 'Objectifs', icon: <Target size={12} /> },
    { num: 4, label: 'Évaluation', icon: <Star size={12} /> },
  ];

  return (
    <div>
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
              step > s.num  ? 'bg-emerald text-bg' :
              step === s.num ? 'bg-emerald/15 text-emerald border border-emerald' :
              'bg-white/[0.04] text-slate-600 border border-white/[0.06]'
            }`}>
              {step > s.num ? <CheckCircle2 size={14} /> : s.icon}
            </div>
            <span className={`text-xs hidden sm:block whitespace-nowrap ${step === s.num ? 'text-white' : 'text-slate-600'}`}>{s.label}</span>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px transition-all ${step > s.num ? 'bg-emerald/40' : 'bg-white/[0.06]'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Étapes */}
      {step === 1 && <Step1 data={formData} upd={upd} onNext={() => setStep(2)} workosEmail={workosEmail} />}
      {step === 2 && <Step2 data={formData} upd={upd} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
      {step === 3 && <Step3 data={formData} upd={upd} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
      {step === 4 && <Step4 data={formData} onSubmit={handleSubmit} onBack={() => setStep(3)} isPending={isPending} error={error} />}
    </div>
  );
}

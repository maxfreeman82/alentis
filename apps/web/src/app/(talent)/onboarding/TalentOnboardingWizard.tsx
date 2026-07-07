'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { submitOnboarding, type OnboardingData } from '@/app/actions/onboarding';
import type { CvExtract } from '@/app/api/cv/parse/route';
import {
  ArrowRight, ArrowLeft, CheckCircle2, Star, Briefcase, Target,
  Mail, Phone, MapPin, AlertCircle, Loader2, Upload, FileText,
  X, Sparkles, ChevronRight,
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
  { value: 'looking',  label: 'Je cherche activement',      icon: '🎯', desc: 'Disponible immédiatement' },
  { value: 'open',     label: 'Ouvert(e) aux opportunités', icon: '👀', desc: 'En poste, à l\'écoute' },
  { value: 'employed', label: 'En poste, pas en recherche', icon: '💼', desc: 'Je perfectionne mon Passport' },
  { value: 'founder',  label: 'Entrepreneur(e)',            icon: '🚀', desc: 'Je lance ma boîte' },
] as const;

const LOCATION_OPTIONS = [
  { value: 'onsite', label: 'Présentiel', desc: 'Au bureau' },
  { value: 'remote', label: 'Télétravail', desc: 'Full remote' },
  { value: 'hybrid', label: 'Hybride',    desc: 'Mix bureau / remote' },
] as const;

const COMMON_ROLES = [
  'Développeur Full Stack', 'Développeur Frontend', 'Développeur Backend',
  'Data Analyst', 'Data Scientist', 'Chef de Projet', 'Product Manager',
  'Manager Commercial', 'Responsable Marketing', 'DRH / RH',
  'Comptable / Finance', 'Ingénieur', 'Designer UX/UI',
  'Responsable Logistique', 'Médecin / Clinicien', 'Enseignant / Formateur',
];

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = OnboardingData & { cvSkills: string[] };

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function Field({ label, error, children }: {
  label: string; error?: string | undefined; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs text-slate-400">{label}</label>
      {children}
      {error && (
        <p className="text-xs text-rose-400 flex items-center gap-1">
          <AlertCircle size={11} />{error}
        </p>
      )}
    </div>
  );
}

const inputCls = 'w-full bg-bg border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald/50 transition-colors';

function NavButtons({ onBack, onNext, label = 'Continuer', disabled = false }: {
  onBack: () => void; onNext: () => void; label?: string; disabled?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <button onClick={onBack} disabled={disabled}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-800 text-sm transition-all disabled:opacity-50">
        <ArrowLeft size={14} />
      </button>
      <button onClick={onNext} disabled={disabled}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald text-bg font-semibold text-sm hover:bg-emerald/90 disabled:opacity-50 transition-all">
        {label} <ArrowRight size={16} />
      </button>
    </div>
  );
}

// ─── Étape 1 — Identité ───────────────────────────────────────────────────────

function Step1({ data, upd, email, onNext }: {
  data: FormData; upd: (p: Partial<FormData>) => void;
  email: string; onNext: () => void;
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
        <p className="text-emerald text-xs font-semibold uppercase tracking-widest mb-1">Étape 1 / 5</p>
        <h1 className="font-display text-slate-900 text-2xl font-bold">Bienvenue sur Teranga Align</h1>
        <p className="text-slate-400 text-sm mt-1">Votre Talent Passport commence ici.</p>
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

      <Field label="Email Passport *" error={errs.personalEmail}>
        <div className="relative">
          <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input type="email" value={data.personalEmail}
            onChange={e => upd({ personalEmail: e.target.value })}
            placeholder="votre@email.com" className={`${inputCls} pl-9`} />
        </div>
        {email && email !== data.personalEmail && (
          <button onClick={() => upd({ personalEmail: email })}
            className="text-emerald text-xs underline mt-1">
            Utiliser {email}
          </button>
        )}
        <p className="text-emerald/70 text-[11px] leading-relaxed mt-1">
          ✦ Cet email restera lié à votre Passport même si vous changez d&apos;entreprise.
        </p>
      </Field>

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
        <select value={data.country} onChange={e => upd({ country: e.target.value })} className={inputCls}>
          {[['SN','Sénégal'],['CI','Côte d\'Ivoire'],['ML','Mali'],['BF','Burkina Faso'],
            ['GN','Guinée'],['MR','Mauritanie'],['GH','Ghana'],['NG','Nigeria'],
            ['CM','Cameroun'],['MA','Maroc'],['FR','France'],['BE','Belgique'],['CA','Canada']
          ].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
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
        <p className="text-emerald text-xs font-semibold uppercase tracking-widest mb-1">Étape 2 / 5</p>
        <h2 className="font-display text-slate-900 text-2xl font-bold">Ma situation</h2>
        <p className="text-slate-400 text-sm mt-1">Où en êtes-vous dans votre parcours ?</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {STATUS_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => upd({ currentStatus: opt.value })}
            className={`p-3 rounded-xl border text-left transition-all ${
              data.currentStatus === opt.value
                ? 'border-emerald bg-emerald/[0.08]'
                : 'border-slate-200 hover:border-slate-200'
            }`}>
            <span className="text-lg">{opt.icon}</span>
            <p className={`text-xs font-semibold mt-1 ${data.currentStatus === opt.value ? 'text-emerald' : 'text-slate-900'}`}>{opt.label}</p>
            <p className="text-slate-600 text-[10px] mt-0.5">{opt.desc}</p>
          </button>
        ))}
      </div>

      <Field label="Votre secteur *" error={errs.sector}>
        <select value={data.sector} onChange={e => upd({ sector: e.target.value })} className={inputCls}>
          <option value="">Choisir un secteur…</option>
          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>

      <Field label="Années d'expérience">
        <select value={data.yearsExp} onChange={e => upd({ yearsExp: Number(e.target.value) })} className={inputCls}>
          {[0,1,2,3,4,5,7,10,15,20].map(n => (
            <option key={n} value={n}>{n === 0 ? 'Moins d\'1 an' : n === 20 ? '20+ ans' : `${n} ans`}</option>
          ))}
        </select>
      </Field>

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

      <NavButtons onBack={onBack} onNext={() => validate() && onNext()} />
    </div>
  );
}

// ─── Étape 3 — CV Upload + Parsing IA ────────────────────────────────────────

function Step3({ data, upd, onNext, onBack }: {
  data: FormData; upd: (p: Partial<FormData>) => void;
  onNext: () => void; onBack: () => void;
}) {
  const inputRef               = useRef<HTMLInputElement>(null);
  const [file,    setFile]     = useState<File | null>(null);
  const [parsing, setParsing]  = useState(false);
  const [extract, setExtract]  = useState<CvExtract | null>(null);
  const [parseErr, setParseErr]= useState('');
  const [drag,    setDrag]     = useState(false);

  async function parseFile(f: File) {
    setFile(f);
    setParseErr('');
    setExtract(null);
    setParsing(true);

    try {
      const form = new FormData();
      form.append('cv', f);
      const res  = await fetch('/api/cv/parse', { method: 'POST', body: form });
      const json = await res.json() as CvExtract & { error?: string };

      if (!res.ok || json.error) {
        setParseErr(json.error ?? 'Analyse échouée');
        return;
      }

      setExtract(json);

      // Pré-remplir les champs du formulaire avec ce que Claude a extrait
      upd({
        jobTitle:     json.jobTitle  || data.jobTitle,
        employerName: json.employer  || data.employerName,
        sector:       json.sector    || data.sector,
        yearsExp:     json.yearsExp  || data.yearsExp,
        cvSkills:     json.hardSkills,
      });
    } catch {
      setParseErr('Erreur réseau — réessayez');
    } finally {
      setParsing(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) parseFile(f);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) parseFile(f);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-emerald text-xs font-semibold uppercase tracking-widest mb-1">Étape 3 / 5</p>
        <h2 className="font-display text-slate-900 text-2xl font-bold">Importez votre CV</h2>
        <p className="text-slate-400 text-sm mt-1">
          Claude analyse votre CV et pré-remplit votre profil automatiquement.{' '}
          <span className="text-slate-500">Étape facultative.</span>
        </p>
      </div>

      {/* Zone de dépôt */}
      {!extract && (
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            drag
              ? 'border-emerald bg-emerald/[0.06]'
              : 'border-slate-200 hover:border-slate-200 hover:bg-slate-50'
          }`}>
          <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleInputChange} />

          {parsing ? (
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 text-emerald animate-pulse" />
              </div>
              <p className="text-slate-900 font-medium text-sm">Claude analyse votre CV…</p>
              <p className="text-slate-500 text-xs">Extraction des compétences et de l&apos;expérience</p>
              <div className="flex justify-center">
                <Loader2 className="w-4 h-4 text-emerald animate-spin" />
              </div>
            </div>
          ) : file ? (
            <div className="space-y-2">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-slate-400 text-sm">{file.name}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-900 text-sm font-medium">Glissez votre CV ici</p>
                <p className="text-slate-500 text-xs mt-1">ou cliquez pour parcourir · PDF · max 5 Mo</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Erreur parsing */}
      {parseErr && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-rose-400 text-xs">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            <p>{parseErr}</p>
            <button onClick={() => { setParseErr(''); setFile(null); }} className="underline mt-1">
              Réessayer
            </button>
          </div>
        </div>
      )}

      {/* Résultat de l'analyse */}
      {extract && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald" />
              </div>
              <p className="text-slate-900 text-sm font-semibold">Analyse complète</p>
            </div>
            <button onClick={() => { setExtract(null); setFile(null); }}
              className="text-slate-600 hover:text-slate-600 transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* Résumé Claude */}
          {extract.summary && (
            <div className="p-3 rounded-xl bg-emerald/[0.05] border border-emerald/15">
              <p className="text-slate-600 text-xs leading-relaxed">{extract.summary}</p>
            </div>
          )}

          {/* Infos extraites */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {extract.jobTitle && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-slate-500 mb-0.5">Poste</p>
                <p className="text-slate-900 font-medium truncate">{extract.jobTitle}</p>
              </div>
            )}
            {extract.employer && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-slate-500 mb-0.5">Employeur</p>
                <p className="text-slate-900 font-medium truncate">{extract.employer}</p>
              </div>
            )}
            {extract.sector && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-slate-500 mb-0.5">Secteur</p>
                <p className="text-slate-900 font-medium">{extract.sector}</p>
              </div>
            )}
            {extract.yearsExp > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-slate-500 mb-0.5">Expérience</p>
                <p className="text-slate-900 font-medium">{extract.yearsExp} an{extract.yearsExp > 1 ? 's' : ''}</p>
              </div>
            )}
          </div>

          {/* Hard skills */}
          {extract.hardSkills.length > 0 && (
            <div>
              <p className="text-slate-500 text-xs mb-2">Compétences détectées</p>
              <div className="flex flex-wrap gap-1.5">
                {extract.hardSkills.map(skill => (
                  <span key={skill}
                    className="text-xs px-2.5 py-1 rounded-full bg-sky/10 border border-sky/20 text-sky">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-slate-600 text-[11px] flex items-center gap-1">
            <CheckCircle2 size={11} className="text-emerald" />
            Ces informations ont pré-rempli votre profil — vous pourrez les ajuster à l&apos;étape suivante.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-800 text-sm transition-all">
          <ArrowLeft size={14} />
        </button>
        <button onClick={onNext}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald text-bg font-semibold text-sm hover:bg-emerald/90 transition-all">
          {extract ? 'Continuer avec ces données' : 'Passer cette étape'}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Étape 4 — Objectifs ──────────────────────────────────────────────────────

function Step4({ data, upd, onNext, onBack }: {
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
        <p className="text-emerald text-xs font-semibold uppercase tracking-widest mb-1">Étape 4 / 5</p>
        <h2 className="font-display text-slate-900 text-2xl font-bold">Mes objectifs</h2>
        <p className="text-slate-400 text-sm mt-1">Vers quoi vous dirigez-vous ?</p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-slate-400">Rôles visés (3 max)</label>
        {data.targetRoles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {data.targetRoles.map(r => (
              <span key={r} className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-emerald/10 border border-emerald/20 text-emerald">
                {r}
                <button onClick={() => upd({ targetRoles: data.targetRoles.filter(x => x !== r) })}
                  className="hover:text-slate-800 text-emerald/60">×</button>
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
              className="px-3 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-800 text-sm">+</button>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {COMMON_ROLES.filter(r => !data.targetRoles.includes(r)).slice(0, 8).map(r => (
            <button key={r} onClick={() => addRole(r)}
              className="text-[10px] px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-600 hover:border-slate-200 transition-all">
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-slate-400">Secteurs d'intérêt</label>
        <div className="flex flex-wrap gap-2">
          {SECTORS.map(s => (
            <button key={s} onClick={() => toggleSector(s)}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${
                data.targetSectors.includes(s)
                  ? 'border-sky/40 bg-sky/10 text-sky'
                  : 'border-slate-200 text-slate-500 hover:border-slate-200 hover:text-slate-600'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <Field label="Prétentions salariales minimales (FCFA / mois)">
        <input type="number" value={data.salaryMin ?? ''} min={0} step={50000}
          onChange={e => upd({ salaryMin: e.target.value ? Number(e.target.value) : null })}
          placeholder="Ex : 400000" className={inputCls} />
      </Field>

      <div className="space-y-2">
        <label className="block text-xs text-slate-400">Mode de travail préféré</label>
        <div className="grid grid-cols-3 gap-2">
          {LOCATION_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => upd({ locationPref: opt.value })}
              className={`p-3 rounded-xl border text-center transition-all ${
                data.locationPref === opt.value
                  ? 'border-sky/40 bg-sky/10'
                  : 'border-slate-200 hover:border-slate-200'
              }`}>
              <p className={`text-xs font-semibold ${data.locationPref === opt.value ? 'text-sky' : 'text-slate-900'}`}>{opt.label}</p>
              <p className="text-slate-600 text-[10px] mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <div onClick={() => upd({ mobilityOk: !data.mobilityOk })}
          className={`w-10 h-5 rounded-full transition-all flex-shrink-0 ${data.mobilityOk ? 'bg-emerald' : 'bg-slate-50'}`}>
          <div className={`w-4 h-4 rounded-full bg-white shadow mt-0.5 transition-all ${data.mobilityOk ? 'ml-5' : 'ml-0.5'}`} />
        </div>
        <span className="text-sm text-slate-600">Ouvert(e) à la relocalisation</span>
      </label>

      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  );
}

// ─── Étape 5 — Résumé + Lancement ────────────────────────────────────────────

function Step5({ data, onSubmit, onBack, isPending, error }: {
  data: FormData; onSubmit: () => void; onBack: () => void;
  isPending: boolean; error: string;
}) {
  const statusLabel: Record<string, string> = {
    looking: 'En recherche active', open: 'Ouvert aux opportunités',
    employed: 'En poste', founder: 'Entrepreneur',
  };
  const locationLabel: Record<string, string> = {
    onsite: 'Présentiel', remote: 'Télétravail', hybrid: 'Hybride',
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-emerald text-xs font-semibold uppercase tracking-widest mb-1">Étape 5 / 5</p>
        <h2 className="font-display text-slate-900 text-2xl font-bold">Prêt(e) pour l'évaluation</h2>
        <p className="text-slate-400 text-sm mt-1">Vérifiez vos informations, puis lancez votre Talent Passport.</p>
      </div>

      <div className="space-y-3">
        {/* Identité */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-emerald" /> Identité
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-slate-500 text-xs">Nom</span><p className="text-slate-900">{data.firstName} {data.lastName}</p></div>
            <div><span className="text-slate-500 text-xs">Email Passport</span><p className="text-slate-900 truncate">{data.personalEmail}</p></div>
            {data.city && <div><span className="text-slate-500 text-xs">Ville</span><p className="text-slate-900">{data.city}, {data.country}</p></div>}
          </div>
        </div>

        {/* Situation */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-emerald" /> Situation
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-slate-500 text-xs">Statut</span><p className="text-slate-900">{statusLabel[data.currentStatus]}</p></div>
            {data.sector && <div><span className="text-slate-500 text-xs">Secteur</span><p className="text-slate-900">{data.sector}</p></div>}
            {data.yearsExp > 0 && <div><span className="text-slate-500 text-xs">Expérience</span><p className="text-slate-900">{data.yearsExp} ans</p></div>}
            {data.jobTitle && <div><span className="text-slate-500 text-xs">Poste</span><p className="text-slate-900">{data.jobTitle}</p></div>}
          </div>
        </div>

        {/* CV Skills si présents */}
        {data.cvSkills.length > 0 && (
          <div className="rounded-xl border border-sky/15 bg-sky/[0.03] p-4 space-y-2">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={12} className="text-sky" /> Compétences extraites du CV
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.cvSkills.map(s => (
                <span key={s} className="text-xs px-2.5 py-0.5 rounded-full bg-sky/10 border border-sky/20 text-sky">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Objectifs */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-emerald" /> Objectifs
          </p>
          <div className="text-sm space-y-2">
            {data.targetRoles.length > 0 && (
              <div>
                <span className="text-slate-500 text-xs">Rôles visés</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.targetRoles.map(r => <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-emerald/10 text-emerald">{r}</span>)}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-slate-500 text-xs">Mode</span><p className="text-slate-900">{locationLabel[data.locationPref]}</p></div>
              {data.salaryMin && <div><span className="text-slate-500 text-xs">Salaire min</span><p className="text-slate-900">{data.salaryMin.toLocaleString('fr-FR')} FCFA</p></div>}
            </div>
          </div>
        </div>
      </div>

      {/* Info évaluation */}
      <div className="rounded-xl border border-amber/20 bg-amber/[0.05] p-4">
        <p className="text-amber text-sm font-semibold mb-1">Ce qui vous attend</p>
        <p className="text-slate-400 text-xs leading-relaxed">
          40 questions · 6 dimensions (Hard Skills, Soft Skills, Expérience, Life Score, Énergie, Risque) · ~12 minutes. À la fin, votre profil 6D est révélé et votre Passport généré.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-rose-400 text-sm p-3 rounded-xl bg-rose-400/5 border border-rose-400/20">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} disabled={isPending}
          className="flex items-center px-4 py-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-800 text-sm transition-all disabled:opacity-50">
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

export function TalentOnboardingWizard({ email, firstName, lastName }: {
  email: string; firstName: string; lastName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step,  setStep]  = useState(1);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<FormData>({
    firstName,
    lastName,
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
    cvSkills:      [],
  });

  function upd(partial: Partial<FormData>) {
    setFormData(prev => ({ ...prev, ...partial }));
  }

  function handleSubmit() {
    setError('');
    startTransition(async () => {
      const result = await submitOnboarding(formData);
      if ('error' in result) { setError(result.error); return; }
      router.push('/assessment');
    });
  }

  const STEPS = [
    { num: 1, label: 'Identité',    icon: <Mail size={12} /> },
    { num: 2, label: 'Situation',   icon: <Briefcase size={12} /> },
    { num: 3, label: 'CV',          icon: <Upload size={12} /> },
    { num: 4, label: 'Objectifs',   icon: <Target size={12} /> },
    { num: 5, label: 'Évaluation',  icon: <Star size={12} /> },
  ];

  return (
    <div>
      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center gap-1 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
              step > s.num  ? 'bg-emerald text-bg' :
              step === s.num ? 'bg-emerald/15 text-emerald border border-emerald' :
              'bg-slate-50 text-slate-600 border border-slate-200'
            }`}>
              {step > s.num ? <CheckCircle2 size={12} /> : s.icon}
            </div>
            <span className={`text-[10px] hidden sm:block whitespace-nowrap ${step === s.num ? 'text-slate-900' : 'text-slate-600'}`}>{s.label}</span>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px transition-all ${step > s.num ? 'bg-emerald/40' : 'bg-slate-50'}`} />
            )}
          </div>
        ))}
      </div>

      {step === 1 && <Step1 data={formData} upd={upd} email={email} onNext={() => setStep(2)} />}
      {step === 2 && <Step2 data={formData} upd={upd} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
      {step === 3 && <Step3 data={formData} upd={upd} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
      {step === 4 && <Step4 data={formData} upd={upd} onNext={() => setStep(5)} onBack={() => setStep(3)} />}
      {step === 5 && <Step5 data={formData} onSubmit={handleSubmit} onBack={() => setStep(4)} isPending={isPending} error={error} />}
    </div>
  );
}

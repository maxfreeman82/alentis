import { requireAuth } from '@/lib/supabase/user';
import Link from 'next/link';
import { ArrowRight, Scale, Clock, Shield, Calculator } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';

const CDI_VS_FREELANCE = [
  {
    aspect: 'Coût employeur',
    cdi:    'Brut × 1.20 à 1.35 selon secteur (IPRES + CSS + FDFP)',
    freelance: 'Honoraires nets, pas de charges sociales',
    winner: 'freelance',
  },
  {
    aspect: 'Sécurité pour l\'employé',
    cdi:    'Protection sociale complète (maladie, retraite, accident)',
    freelance: 'Aucune couverture sociale obligatoire',
    winner: 'cdi',
  },
  {
    aspect: 'Préavis / rupture',
    cdi:    '1 à 3 mois de préavis + indemnités légales',
    freelance: 'Résiliation selon contrat de prestation',
    winner: 'freelance',
  },
  {
    aspect: 'Engagement mission',
    cdi:    'Disponibilité exclusive + subordination juridique',
    freelance: 'Autonomie totale, multi-clients possible',
    winner: 'cdi',
  },
  {
    aspect: 'Fidélisation',
    cdi:    'Forte : sentiment d\'appartenance, évolution interne',
    freelance: 'Faible : disponibilité variable, départ facile',
    winner: 'cdi',
  },
  {
    aspect: 'Risque de requalification',
    cdi:    'Aucun si contrat bien structuré',
    freelance: 'Risque IPRES si liens de subordination détectés',
    winner: 'cdi',
  },
];

export default async function PremierEmployePage() {
  const user = await requireAuth();
  const supabase  = createServerClient();

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('user_id', user.id).maybeSingle();

  const { data: contracts } = profile
    ? await supabase.from('founder_contracts')
        .select('*').eq('profile_id', profile.id).order('created_at', { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">ÉTAPE 4</p>
        <h1 className="font-display text-slate-900 text-2xl">Recruter votre premier employé</h1>
        <p className="text-slate-400 text-sm mt-1">
          CDI ou freelance ? Simulez le coût réel, générez le contrat.
        </p>
      </div>

      {/* Comparatif CDI vs Freelance */}
      <div className="space-y-3">
        <h2 className="font-display text-slate-900 text-sm flex items-center gap-2">
          <Scale className="w-4 h-4 text-amber-400" /> CDI vs Freelance
        </h2>
        <div className="card overflow-hidden p-0">
          <div className="grid grid-cols-3 bg-bg-card px-4 py-2.5 border-b border-slate-200">
            <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Critère</span>
            <span className="text-sky-400 text-[10px] font-semibold uppercase tracking-wider">CDI</span>
            <span className="text-emerald-400 text-[10px] font-semibold uppercase tracking-wider">Freelance</span>
          </div>
          {CDI_VS_FREELANCE.map(row => (
            <div key={row.aspect} className="grid grid-cols-3 px-4 py-3 border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors">
              <span className="text-slate-400 text-xs font-medium">{row.aspect}</span>
              <div className="flex items-start gap-1.5 pr-3">
                {row.winner === 'cdi' && <span className="text-sky-400 mt-0.5 flex-shrink-0 text-[10px]">✦</span>}
                <span className="text-slate-500 text-[11px] leading-relaxed">{row.cdi}</span>
              </div>
              <div className="flex items-start gap-1.5">
                {row.winner === 'freelance' && <span className="text-emerald-400 mt-0.5 flex-shrink-0 text-[10px]">✦</span>}
                <span className="text-slate-500 text-[11px] leading-relaxed">{row.freelance}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-slate-600 text-xs">
          ✦ = avantage. Pour une première recrue stratégique, le CDI avec période d'essai est recommandé au Sénégal.
        </p>
      </div>

      {/* Étapes recrutement */}
      <div className="space-y-3">
        <h2 className="font-display text-slate-900 text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" /> Processus légal de recrutement
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { step: '1', label: 'Fiche de poste',           desc: 'Titre, missions, compétences, lieu, rémunération' },
            { step: '2', label: 'Contrat CDI ou CDD',       desc: 'Signé par les deux parties avant le 1er jour' },
            { step: '3', label: 'Immatriculation IPRES',    desc: 'Obligatoire pour tout employé — délai 8 jours' },
            { step: '4', label: 'Déclaration CSS',          desc: 'Accidents travail — dans les 8 jours' },
            { step: '5', label: 'Registre du personnel',    desc: 'Carnet obligatoire — inspection du travail' },
            { step: '6', label: 'Période d\'essai',         desc: 'Max 6 mois renouvelable une fois (non cadre)' },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-3 card p-3">
              <span className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {item.step}
              </span>
              <div>
                <p className="text-slate-900 text-xs font-semibold">{item.label}</p>
                <p className="text-slate-500 text-[11px] mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/premier-employe/cout-employeur"
          className="card hover:border-amber-500/30 transition-all group flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/25 transition-all">
            <Calculator className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-slate-900 text-sm font-semibold">Simulateur de coût</p>
            <p className="text-slate-500 text-xs">Calcul IPRES + CSS + IR en temps réel</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 ml-auto group-hover:text-amber-400 transition-all" />
        </Link>

        <Link href="/mon-equipe"
          className="card hover:border-emerald-500/30 transition-all group flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/25 transition-all">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-slate-900 text-sm font-semibold">Mon équipe</p>
            <p className="text-slate-500 text-xs">Dashboard 2-10 collaborateurs</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 ml-auto group-hover:text-emerald-400 transition-all" />
        </Link>
      </div>

      {/* Contrats existants */}
      {contracts && contracts.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-slate-900 text-sm">Contrats générés</h2>
          <div className="space-y-2">
            {contracts.map(c => (
              <div key={c.id} className="card flex items-center justify-between">
                <div>
                  <p className="text-slate-900 text-sm font-medium">{c.employee_name ?? '—'}</p>
                  <p className="text-slate-500 text-xs">{c.employee_role} · {c.contract_type}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  c.signed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'
                }`}>
                  {c.signed ? 'Signé' : 'En attente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

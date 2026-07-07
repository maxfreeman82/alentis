import { requireAuth } from '@/lib/supabase/user';
import Link from 'next/link';
import { CheckCircle, ArrowRight, Building2, FileText } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import CreationChecklist from '@/components/founder/CreationChecklist';

const LEGAL_STRUCTURES = [
  {
    id:     'AUTO_ENTREPRENEUR',
    label:  'Auto-entrepreneur',
    color:  '#10B981',
    ideal:  'Activité solo, moins de 10M FCFA/an',
    pros:   ['Création en 48h', 'Pas de capital minimum', 'Comptabilité simplifiée', 'Fiscalité allégée'],
    cons:   ['Responsabilité illimitée', 'Difficulté à lever des fonds', 'Pas adapté aux associés'],
    capital: 'Aucun',
    delay:   '48h – 1 semaine',
  },
  {
    id:     'SUARL',
    label:  'SUARL',
    color:  '#0EA5E9',
    ideal:  'Entrepreneur solo voulant se protéger',
    pros:   ['Responsabilité limitée', '1 seul associé', 'Crédible pour les banques', 'Capital flexible'],
    cons:   ['Comptabilité formelle', 'Coût de création', 'Obligation de gérant'],
    capital: '100 000 FCFA min.',
    delay:   '2 – 4 semaines',
  },
  {
    id:     'SARL',
    label:  'SARL',
    color:  '#8B5CF6',
    ideal:  'PME avec 2+ associés',
    pros:   ['Responsabilité limitée', 'Multi-associés', 'Structure reconnue', 'Cession parts possible'],
    cons:   ['Formalisme plus lourd', 'Décisions collectives', 'Coûts de fonctionnement'],
    capital: '1 000 000 FCFA min.',
    delay:   '3 – 6 semaines',
  },
  {
    id:     'GIE',
    label:  'GIE',
    color:  '#F97316',
    ideal:  'Groupement d\'intérêt collectif / coopératif',
    pros:   ['Pas de capital minimum', 'Fiscalité avantageuse', 'Idéal pour secteur informel', 'Mutualisation ressources'],
    cons:   ['Responsabilité solidaire', 'Objet limité', 'Peu adapté à la croissance'],
    capital: 'Aucun',
    delay:   '2 – 3 semaines',
  },
  {
    id:     'SA',
    label:  'SA',
    color:  '#F59E0B',
    ideal:  'Levée de fonds, introduction en bourse',
    pros:   ['Capital ouvert', 'Crédibilité maximale', 'Accès marchés financiers', 'Transmission facilitée'],
    cons:   ['Capital élevé', 'Gouvernance complexe', 'Obligations légales lourdes', 'Coût élevé'],
    capital: '10 000 000 FCFA min.',
    delay:   '4 – 8 semaines',
  },
];

const CHECKLIST_STEPS = [
  { id: 'statuts',   label: 'Rédiger les statuts',                   desc: 'Avec un notaire ou un avocat (template fourni)' },
  { id: 'rccm',     label: 'Immatriculation RCCM',                   desc: 'Tribunal de Commerce — apporter statuts + CNI' },
  { id: 'ninea',    label: 'Obtenir le NINEA',                        desc: 'DGID — numéro d\'identification national' },
  { id: 'compte',   label: 'Ouvrir un compte bancaire professionnel', desc: 'BNDE, Ecobank, BHS ou microfinance' },
  { id: 'tampon',   label: 'Faire le tampon de l\'entreprise',        desc: 'Obligatoire pour les contrats et factures' },
  { id: 'agrement', label: 'Agréments sectoriels (si besoin)',        desc: 'Santé, finance, éducation, BTP…' },
];

export default async function CreationPage() {
  const user = await requireAuth();
  const supabase  = createServerClient();

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('user_id', user.id).maybeSingle();

  const { data: founder } = profile
    ? await supabase.from('founders')
        .select('legal_structure, rccm_number, ninea_number, creation_done')
        .eq('profile_id', profile.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">ÉTAPE 2</p>
        <h1 className="font-display text-slate-900 text-2xl">Créer votre entreprise au Sénégal</h1>
        <p className="text-slate-400 text-sm mt-1">
          Choisissez la structure adaptée à votre projet, puis suivez la checklist de création.
        </p>
      </div>

      {/* Structures juridiques */}
      <div className="space-y-3">
        <h2 className="font-display text-slate-900 text-sm">Quelle structure juridique ?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LEGAL_STRUCTURES.map(s => {
            const isSelected = founder?.legal_structure === s.id;
            return (
              <div key={s.id} className={`card space-y-3 hover:border-slate-200 transition-all ${isSelected ? 'border-current' : ''}`}
                style={isSelected ? { borderColor: s.color, backgroundColor: `${s.color}05` } : {}}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-display text-slate-900 font-semibold">{s.label}</span>
                    {isSelected && <span className="ml-2 text-[10px] font-semibold" style={{ color: s.color }}>✓ Choisie</span>}
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: s.color }}>{s.capital}</span>
                </div>
                <p className="text-slate-500 text-xs">{s.ideal}</p>
                <div className="space-y-1">
                  {s.pros.slice(0, 2).map(p => (
                    <p key={p} className="text-xs text-slate-400 flex items-start gap-1.5">
                      <span className="text-emerald-400 flex-shrink-0">+</span> {p}
                    </p>
                  ))}
                  {s.cons.slice(0, 1).map(c => (
                    <p key={c} className="text-xs text-slate-500 flex items-start gap-1.5">
                      <span className="text-rose-400 flex-shrink-0">−</span> {c}
                    </p>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-600 text-[10px]">Délai : {s.delay}</span>
                  <button className="text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-colors"
                    style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                    Choisir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-3">
        <h2 className="font-display text-slate-900 text-sm">Checklist de création</h2>
        <CreationChecklist steps={CHECKLIST_STEPS} />
      </div>

      {/* Info RCCM/NINEA si déjà renseignés */}
      {(founder?.rccm_number || founder?.ninea_number) && (
        <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-4 grid grid-cols-2 gap-4">
          {founder.rccm_number && (
            <div>
              <p className="text-slate-500 text-[10px] uppercase tracking-wider">RCCM</p>
              <p className="text-slate-900 text-sm font-mono">{founder.rccm_number}</p>
            </div>
          )}
          {founder.ninea_number && (
            <div>
              <p className="text-slate-500 text-[10px] uppercase tracking-wider">NINEA</p>
              <p className="text-slate-900 text-sm font-mono">{founder.ninea_number}</p>
            </div>
          )}
        </div>
      )}

      <div className="text-center">
        <Link href="/business-plan"
          className="inline-flex items-center gap-2 px-8 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors">
          Étape suivante : Business Plan <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

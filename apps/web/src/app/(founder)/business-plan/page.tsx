import { withAuth } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';
import { ArrowRight, TrendingUp, Target, Users, Banknote, MapPin, BarChart3 } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import BusinessPlanForm from '@/components/founder/BusinessPlanForm';

const BP_SECTIONS = [
  { id: 'problem',     icon: Target,    label: 'Le Problème',           desc: 'Quel problème résolvez-vous et pour qui ?' },
  { id: 'solution',    icon: TrendingUp, label: 'Votre Solution',       desc: 'Comment vous le résolvez différemment' },
  { id: 'market',      icon: MapPin,    label: 'Le Marché',             desc: 'Taille, segmentation, beachhead market' },
  { id: 'model',       icon: Banknote,  label: 'Modèle Économique',     desc: 'Revenus, marges, récurrence' },
  { id: 'team',        icon: Users,     label: 'L\'Équipe',             desc: 'Fondateurs, compétences, gaps' },
  { id: 'projections', icon: BarChart3, label: 'Projections 3 ans',     desc: 'CA, charges, point mort' },
];

export default async function BusinessPlanPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const supabase  = createServerClient();

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('workos_user_id', user.id).maybeSingle();

  const { data: founder } = profile
    ? await supabase.from('founders')
        .select('business_plan, financial_model, bizplan_done, archetype, company_name')
        .eq('profile_id', profile.id)
        .maybeSingle()
    : { data: null };

  const bp = (founder?.business_plan ?? {}) as Record<string, string>;
  const filled = Object.values(bp).filter(v => v && v.trim().length > 0).length;
  const pct    = Math.round((filled / BP_SECTIONS.length) * 100);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">ÉTAPE 3</p>
        <h1 className="font-display text-white text-2xl">
          {founder?.company_name ? `Business Plan · ${founder.company_name}` : 'Business Plan Fondateur'}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Un plan vivant, pas un document figé. Éditez-le à tout moment.
        </p>
      </div>

      {/* Progression */}
      {filled > 0 && (
        <div className="card space-y-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{filled}/{BP_SECTIONS.length} sections complétées</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-bg rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Formulaire interactif */}
      <BusinessPlanForm
        sections={BP_SECTIONS.map(s => ({ id: s.id, label: s.label, desc: s.desc, value: bp[s.id] ?? '' }))}
        archetype={founder?.archetype ?? null}
      />

      <div className="text-center">
        <Link href="/premier-employe"
          className="inline-flex items-center gap-2 px-8 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors">
          Étape suivante : Premier Employé <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

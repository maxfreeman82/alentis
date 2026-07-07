import { requireAuth } from '@/lib/supabase/user';
import { CheckCircle, Zap, Building2, Gift } from 'lucide-react';
import { SectionHeader } from '@/components/shared';
import { getUserOrg } from '@/lib/supabase/auth';
import { PlanButton } from '@/components/abonnement/PlanButton';

const PLANS = [
  {
    id:       'starter' as const,
    label:    'Starter',
    price:    'Gratuit',
    sub:      'Pour démarrer',
    color:    '#64748B',
    icon:     Gift,
    features: [
      'Jusqu\'à 5 profils',
      'Module Fondateur complet',
      'Talent Passport (lecture)',
      'Certification Niveau 1',
    ],
    cta: null,
  },
  {
    id:       'pro' as const,
    label:    'Pro',
    price:    '50 000 FCFA',
    sub:      '/mois · facturation mensuelle',
    color:    '#10B981',
    icon:     Zap,
    features: [
      'Jusqu\'à 50 profils',
      'Tous les modules RH',
      'Dashboard IAS temps réel',
      'Vision Pulse illimité',
      'Recrutement Kanban + Matching IA',
      'Paie & Rémunération',
      'Analytics avancés',
      'Support email prioritaire',
    ],
    cta: 'Passer au Pro',
  },
  {
    id:       'enterprise' as const,
    label:    'Enterprise',
    price:    '150 000 FCFA',
    sub:      '/mois · facturation mensuelle',
    color:    '#F59E0B',
    icon:     Building2,
    features: [
      'Profils illimités',
      'Tout ce qui est inclus dans Pro',
      'Onboarding dédié',
      'Gestionnaire de compte attitré',
      'Intégration API personnalisée',
      'SLA 99,9 % garanti',
      'Rapports personnalisés',
    ],
    cta: 'Passer à Enterprise',
  },
];

export default async function AbonnementPage({
  searchParams,
}: { searchParams: Promise<{ status?: string }> }) {
  const [user, params] = await Promise.all([
    requireAuth(),
    searchParams,
  ]);

  const ctx = await getUserOrg(user.id);
  if (!ctx) return <div className="flex items-center justify-center h-64"><p className="text-slate-400">Profil en cours de configuration…</p></div>;

  const { supabase, organizationId, orgPlan } = ctx;

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status, next_billing, amount_fcfa')
    .eq('organization_id', organizationId)
    .maybeSingle();

  const currentPlan = subscription?.plan ?? orgPlan ?? 'starter';
  const isActive    = subscription?.status === 'active';

  return (
    <div className="animate-fade-in space-y-8">
      <SectionHeader
        tag="ABONNEMENT"
        title="Plans & Facturation"
        subtitle="Choisissez le plan adapté à votre organisation"
      />

      {/* Statut retour paiement */}
      {params.status === 'success' && (
        <div className="card border border-emerald/30 bg-emerald/5 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald flex-shrink-0" />
          <div>
            <p className="text-slate-900 font-semibold text-sm">Paiement confirmé !</p>
            <p className="text-slate-400 text-xs">Votre abonnement est maintenant actif.</p>
          </div>
        </div>
      )}
      {params.status === 'cancel' && (
        <div className="card border border-rose/30 bg-rose/5">
          <p className="text-slate-600 text-sm">Paiement annulé — vous pouvez réessayer à tout moment.</p>
        </div>
      )}

      {/* Plan actuel */}
      {isActive && subscription && (
        <div className="card border border-emerald/20" style={{ borderLeft: '4px solid #10B981' }}>
          <p className="section-tag text-emerald mb-1">ABONNEMENT ACTUEL</p>
          <p className="text-slate-900 font-semibold capitalize">{subscription.plan}</p>
          <p className="text-slate-400 text-xs mt-1">
            {subscription.amount_fcfa.toLocaleString('fr-FR')} FCFA/mois
            {subscription.next_billing && ` · Prochain renouvellement : ${new Date(subscription.next_billing).toLocaleDateString('fr-FR')}`}
          </p>
        </div>
      )}

      {/* Grille des plans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {PLANS.map(plan => {
          const Icon      = plan.icon;
          const isCurrent = currentPlan === plan.id;

          return (
            <div key={plan.id} className={`card flex flex-col gap-5 ${isCurrent ? 'border border-slate-200' : ''}`}
              style={isCurrent ? { borderColor: plan.color + '40' } : {}}>
              {/* En-tête */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: plan.color + '20', border: `1px solid ${plan.color}40` }}>
                  <Icon className="w-5 h-5" style={{ color: plan.color }} />
                </div>
                <div>
                  <p className="text-slate-900 font-semibold">{plan.label}</p>
                  {isCurrent && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: plan.color + '20', color: plan.color }}>
                      ACTUEL
                    </span>
                  )}
                </div>
              </div>

              {/* Prix */}
              <div>
                <p className="font-display text-2xl text-slate-900 font-bold">{plan.price}</p>
                <p className="text-slate-500 text-xs">{plan.sub}</p>
              </div>

              {/* Fonctionnalités */}
              <ul className="space-y-2 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: plan.color }} />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {plan.cta ? (
                <PlanButton
                  plan={plan.id as 'pro' | 'enterprise'}
                  label={plan.cta}
                  disabled={isCurrent && isActive}
                />
              ) : (
                <div className="py-2.5 px-4 rounded-lg text-center text-sm text-slate-500 bg-slate-50 border border-slate-200">
                  {isCurrent ? 'Plan actuel' : 'Gratuit'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Note sécurité */}
      <p className="text-slate-600 text-xs text-center">
        Paiement sécurisé via PayDunya · FCFA · Résiliation à tout moment
      </p>
    </div>
  );
}

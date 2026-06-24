import { withAuth } from '@workos-inc/authkit-nextjs';
import { SectionHeader, EmptyState } from '@/components/shared';
import { OKRBoard } from '@/components/boussole/OKRBoard';
import { Target } from 'lucide-react';

export default async function ObjectifsPage() {
  await withAuth({ ensureSignedIn: true });

  // Données mock — remplacées par Supabase une fois les credentials configurés
  const mockOKRs = [
    {
      id: '1',
      title: 'Expansion Côte d\'Ivoire — 3 clients Enterprise',
      progress: 62,
      on_track: true,
      year: 2026,
      key_results: [
        { title: 'Signer 3 contrats Enterprise CI', progress: 33, target: 3 },
        { title: 'Recruter directeur commercial CI', progress: 100, target: 1 },
        { title: 'Ouvrir bureau Abidjan', progress: 60, target: 1 },
      ],
    },
    {
      id: '2',
      title: 'Excellence produit — NPS > 70',
      progress: 45,
      on_track: false,
      year: 2026,
      key_results: [
        { title: 'NPS produit web > 70', progress: 58, target: 70 },
        { title: 'Temps chargement < 2s', progress: 100, target: 2 },
        { title: 'Taux adoption feature IA > 40%', progress: 22, target: 40 },
      ],
    },
    {
      id: '3',
      title: 'Rétention talentsMoyenne < 15% turnover',
      progress: 78,
      on_track: true,
      year: 2026,
      key_results: [
        { title: 'Turnover < 15%', progress: 78, target: 15 },
        { title: 'eNPS > 60', progress: 85, target: 60 },
        { title: 'Plans carrière 100% équipe senior', progress: 80, target: 100 },
      ],
    },
  ];

  return (
    <div className="animate-fade-in">
      <SectionHeader
        tag="BOUSSOLE STRATÉGIQUE"
        tagColor="text-violet"
        title="Objectifs & OKR 2026"
        subtitle="Cascade des objectifs alignés sur votre archétype stratégique"
        action={
          <button className="btn-primary flex items-center gap-2 text-sm">
            <Target size={14} />
            Ajouter un OKR
          </button>
        }
      />

      {mockOKRs.length === 0 ? (
        <EmptyState
          icon={<Target size={20} />}
          title="Aucun OKR défini"
          description="Commencez par définir vos objectifs stratégiques pour 2026 en cohérence avec votre archétype."
          action={
            <button className="btn-primary text-sm">
              Créer mon premier OKR
            </button>
          }
        />
      ) : (
        <OKRBoard okrs={mockOKRs} />
      )}
    </div>
  );
}

import { withAuth } from '@workos-inc/authkit-nextjs';
import { SectionHeader } from '@/components/shared';
import { PipelineBoard, type PipelineStage } from '@/components/recrutement/PipelineBoard';

// Données mock
const MOCK_CANDIDATES: Array<{ id: string; name: string; role: string; score: number; stage: PipelineStage; avatar_letter: string; energy: string; departure_risk: number }> = [
  { id: 'c1', name: 'Aminata Diallo',   role: 'Lead Product Manager', score: 87, stage: 'interview',  avatar_letter: 'A', energy: 'Initialiseurs', departure_risk: 18 },
  { id: 'c2', name: 'Oumar Ba',         role: 'Lead Product Manager', score: 72, stage: 'screening',  avatar_letter: 'O', energy: 'Pilotes',       departure_risk: 32 },
  { id: 'c3', name: 'Fatou Ndiaye',     role: 'Lead Product Manager', score: 91, stage: 'assessment', avatar_letter: 'F', energy: 'Accomplisseurs', departure_risk: 9  },
  { id: 'c4', name: 'Cheikh Mbaye',     role: 'Data Engineer Senior', score: 78, stage: 'new',        avatar_letter: 'C', energy: 'Regulateurs',   departure_risk: 25 },
  { id: 'c5', name: 'Rokhaya Sow',      role: 'Data Engineer Senior', score: 83, stage: 'interview',  avatar_letter: 'R', energy: 'Initialiseurs', departure_risk: 15 },
  { id: 'c6', name: 'Ibrahima Fall',    role: 'Directeur Comm. CI',   score: 94, stage: 'offer',      avatar_letter: 'I', energy: 'Pilotes',       departure_risk: 6  },
  { id: 'c7', name: 'Ndeye Sarr',       role: 'Lead Product Manager', score: 65, stage: 'screening',  avatar_letter: 'N', energy: 'Dynamiseurs',   departure_risk: 41 },
  { id: 'c8', name: 'Modou Diop',       role: 'UX Designer',          score: 79, stage: 'new',        avatar_letter: 'M', energy: 'Initialiseurs', departure_risk: 28 },
  { id: 'c9', name: 'Aissatou Camara',  role: 'UX Designer',          score: 88, stage: 'interview',  avatar_letter: 'A', energy: 'Accomplisseurs', departure_risk: 12 },
  { id: 'c10',name: 'Babacar Ly',       role: 'Data Engineer Senior', score: 55, stage: 'new',        avatar_letter: 'B', energy: 'Regulateurs',   departure_risk: 62 },
];

export default async function PipelinePage() {
  await withAuth({ ensureSignedIn: true });

  return (
    <div className="animate-fade-in">
      <SectionHeader
        tag="RECRUTEMENT"
        title="Pipeline candidats"
        subtitle="Glissez les candidats d'une étape à l'autre"
      />
      <PipelineBoard candidates={MOCK_CANDIDATES} />
    </div>
  );
}

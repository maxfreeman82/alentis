import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import { SectionHeader } from '@/components/shared';
import { ValidationDashboard } from '@/components/admin/ValidationDashboard';
import { AlertTriangle, BookOpen, FileCode2, Users } from 'lucide-react';

export default async function ValidationPage() {
  const user  = await requireAuth();
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'super_admin') redirect('/dashboard');

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        tag="SUPER ADMIN · INTÉGRITÉ · VALIDATION"
        tagColor="text-violet"
        title="Validation statistique des paires miroir"
        subtitle="Corrélations de Pearson, calibration des seuils et suivi du groupe pilote (cible : 30 sessions)"
      />

      {/* ── Note de recalibration pour le Super Admin ──────────────────────── */}
      <div className="card border border-violet/20 bg-violet/3 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-violet" />
          <p className="text-violet font-semibold text-sm">Guide de recalibration — à lire avant toute modification</p>
        </div>

        <p className="text-slate-500 text-xs leading-relaxed">
          Les seuils et les paires miroir actuels sont une <strong className="text-slate-700">estimation raisonnée</strong>,
          pas un résultat validé statistiquement. Ce dashboard vous permet de les calibrer sur votre vraie population
          une fois le groupe pilote atteint. Voici la procédure.
        </p>

        {/* Étape 1 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-violet text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">1</div>
            <p className="text-slate-700 text-xs font-semibold flex items-center gap-1.5">
              <Users size={11} /> Attendre 30 sessions complètes (minimum)
            </p>
          </div>
          <p className="text-slate-400 text-xs ml-7 leading-relaxed">
            Sous 30 sessions, les corrélations ne sont pas fiables statistiquement.
            Idéalement, visez 50 personnes dont vous connaissez déjà le profil comportemental réel
            (via entretien ou test validé externe). La barre de progression ci-dessous indique où vous en êtes.
          </p>
        </div>

        {/* Étape 2 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-violet text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">2</div>
            <p className="text-slate-700 text-xs font-semibold">Identifier les paires faibles (r &lt; 0.3)</p>
          </div>
          <p className="text-slate-400 text-xs ml-7 leading-relaxed">
            Une paire avec une corrélation de Pearson inférieure à 0.3 ne mesure pas la même chose.
            Téléchargez le CSV et transmettez-le à votre équipe RH ou psychométricienne pour révision.
            La plupart du temps, c'est la formulation d'une des deux questions qui est ambiguë —
            elle peut être interprétée différemment selon les profils culturels.
          </p>
        </div>

        {/* Étape 3 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-violet text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">3</div>
            <p className="text-slate-700 text-xs font-semibold flex items-center gap-1.5">
              <FileCode2 size={11} /> Mettre à jour les seuils dans le code
            </p>
          </div>
          <div className="text-slate-400 text-xs ml-7 space-y-1.5 leading-relaxed">
            <p>Trois paramètres sont calibrables dans <code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">apps/web/src/lib/assessment/integrity.ts</code> :</p>
            <ul className="space-y-1 ml-2">
              <li><code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">POSITIVE_MAX_GAP</code> — écart max autorisé entre les deux questions d'une paire pour être considérée cohérente (actuellement 1 point sur 5).</li>
              <li><code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">MIN_PLAUSIBLE_MS</code> — temps minimum par question en ms (actuellement 3 000 ms). Remplacez par la valeur P5 affichée ci-dessous si elle est plus pertinente.</li>
              <li><code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">NEGATIVE_PENALTY_PT</code> — pénalité par contrôle négatif déclenché (actuellement 10 pts). Si un contrôle déclenche régulièrement (&gt; 30%) sans fraude avérée, réduisez ce paramètre ou retirez la paire.</li>
            </ul>
          </div>
        </div>

        {/* Étape 4 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-violet text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">4</div>
            <p className="text-slate-700 text-xs font-semibold">Vérifier les contrôles négatifs (&gt; 30% déclenchés = alerte)</p>
          </div>
          <p className="text-slate-400 text-xs ml-7 leading-relaxed">
            Si un contrôle négatif est déclenché dans plus de 30% des sessions de votre population,
            il est probable que ce profil combiné soit réel et légitime chez vos utilisateurs —
            pas un signal de fraude. Dans ce cas, retirez cette paire de la liste dans
            <code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded ml-1">ENERGY_SKILLS_PAIRS</code> ou ajustez son poids.
          </p>
        </div>

        {/* Principe fondamental */}
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber/5 border border-amber/20">
          <AlertTriangle size={12} className="text-amber flex-shrink-0 mt-0.5" />
          <p className="text-slate-600 text-xs leading-relaxed">
            <strong className="text-amber">Principe non négociable :</strong> un score de cohérence bas ou un flag comportemental
            n'invalide jamais automatiquement un résultat. Ce sont des <em>signaux pour un humain</em>.
            La décision finale appartient toujours à votre équipe RH après entretien.
            Modifier les seuils dans un sens trop restrictif reviendrait à pénaliser des candidats sincères
            qui hésitent légitimement entre deux tendances proches.
          </p>
        </div>
      </div>

      {/* Dashboard dynamique */}
      <ValidationDashboard />
    </div>
  );
}

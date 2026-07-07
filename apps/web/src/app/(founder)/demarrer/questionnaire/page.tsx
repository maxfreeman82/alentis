import { requireAuth } from '@/lib/supabase/user';
import { FOUNDER_QUESTIONS } from '@/lib/founder/questions';
import FounderQuestionnaire from '@/components/founder/FounderQuestionnaire';

export default async function QuestionnairePage() {
  await requireAuth();

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest">BOUSSOLE FONDATEUR</p>
        <h1 className="font-display text-slate-900 text-xl">10 situations, votre instinct</h1>
        <p className="text-slate-500 text-xs">Répondez ce qui vous ressemble le mieux, sans trop réfléchir.</p>
      </div>
      <FounderQuestionnaire questions={FOUNDER_QUESTIONS} />
    </div>
  );
}

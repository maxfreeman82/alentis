import { withAuth } from '@workos-inc/authkit-nextjs';
import EmployerCostSimulator from '@/components/founder/EmployerCostSimulator';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function CoutEmployeurPage() {
  await withAuth({ ensureSignedIn: true });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/premier-employe"
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs mb-4 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Retour
        </Link>
        <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">SIMULATEUR</p>
        <h1 className="font-display text-white text-2xl">Coût employeur réel</h1>
        <p className="text-slate-400 text-sm mt-1">
          Charges sociales sénégalaises 2024 — IPRES, CSS, FDFP, IR progressif.
        </p>
      </div>

      <EmployerCostSimulator />
    </div>
  );
}

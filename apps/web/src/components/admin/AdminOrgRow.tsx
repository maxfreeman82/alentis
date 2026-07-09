'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type Plan = 'starter' | 'growth' | 'enterprise';
type CertLevel = 1 | 2 | 3 | 4;

const PLANS: Plan[] = ['starter', 'growth', 'enterprise'];
const CERT_LEVELS: CertLevel[] = [1, 2, 3, 4];

const PLAN_COLORS: Record<Plan, string> = {
  starter:    'text-sky border-sky/30 bg-sky/10',
  growth:     'text-violet border-violet/30 bg-violet/10',
  enterprise: 'text-amber border-amber/30 bg-amber/10',
} as const;

interface Props {
  orgId: string;
  currentPlan: Plan;
  currentCertLevel: CertLevel | null;
  nbUsers: number;
  iasScore: number | null;
}

type SaveStatus = 'idle' | 'loading' | 'success' | 'error';

export function AdminOrgRow({ orgId, currentPlan, currentCertLevel, nbUsers, iasScore }: Props) {
  const [plan, setPlan]           = useState<Plan>(currentPlan);
  const [certLevel, setCertLevel] = useState<CertLevel | null>(currentCertLevel);
  const [planStatus, setPlanStatus]       = useState<SaveStatus>('idle');
  const [certStatus, setCertStatus]       = useState<SaveStatus>('idle');
  const [planError, setPlanError]         = useState<string>('');
  const [certError, setCertError]         = useState<string>('');

  async function savePlan() {
    setPlanStatus('loading');
    setPlanError('');
    try {
      const res = await fetch('/api/admin/update-org', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, plan }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Erreur serveur');
      }
      setPlanStatus('success');
      setTimeout(() => setPlanStatus('idle'), 2000);
    } catch (err) {
      setPlanStatus('error');
      setPlanError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  async function saveCertLevel() {
    if (certLevel === null) return;
    setCertStatus('loading');
    setCertError('');
    try {
      const res = await fetch('/api/admin/update-org', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, certLevel }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Erreur serveur');
      }
      setCertStatus('success');
      setTimeout(() => setCertStatus('idle'), 2000);
    } catch (err) {
      setCertStatus('error');
      setCertError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  return (
    <>
      {/* Plan */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <select
            value={plan}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'starter' || v === 'growth' || v === 'enterprise') {
                setPlan(v);
                setPlanStatus('idle');
              }
            }}
            className={cn(
              'text-xs font-semibold px-2 py-1 rounded-lg border outline-none cursor-pointer',
              PLAN_COLORS[plan]
            )}
          >
            {PLANS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            onClick={savePlan}
            disabled={planStatus === 'loading'}
            className={cn(
              'text-xs px-2 py-1 rounded-lg border font-medium transition-all',
              planStatus === 'loading' && 'opacity-50 cursor-not-allowed',
              planStatus === 'success' && 'border-emerald/30 bg-emerald/10 text-emerald',
              planStatus === 'error'   && 'border-rose/30 bg-rose/10 text-rose',
              (planStatus === 'idle')  && 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100',
            )}
          >
            {planStatus === 'loading' ? '…' : planStatus === 'success' ? '✓' : planStatus === 'error' ? '✗' : 'Sauver'}
          </button>
        </div>
        {planStatus === 'error' && planError && (
          <p className="text-rose text-[10px] mt-1">{planError}</p>
        )}
      </td>

      {/* Cert level */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <select
            value={certLevel ?? ''}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v === 1 || v === 2 || v === 3 || v === 4) {
                setCertLevel(v);
                setCertStatus('idle');
              }
            }}
            className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 outline-none cursor-pointer"
          >
            {certLevel === null && <option value="">—</option>}
            {CERT_LEVELS.map((l) => (
              <option key={l} value={l}>Niveau {l}</option>
            ))}
          </select>
          <button
            onClick={saveCertLevel}
            disabled={certStatus === 'loading' || certLevel === null}
            className={cn(
              'text-xs px-2 py-1 rounded-lg border font-medium transition-all',
              (certStatus === 'loading' || certLevel === null) && 'opacity-50 cursor-not-allowed',
              certStatus === 'success' && 'border-emerald/30 bg-emerald/10 text-emerald',
              certStatus === 'error'   && 'border-rose/30 bg-rose/10 text-rose',
              certStatus === 'idle'    && 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100',
            )}
          >
            {certStatus === 'loading' ? '…' : certStatus === 'success' ? '✓' : certStatus === 'error' ? '✗' : 'Sauver'}
          </button>
        </div>
        {certStatus === 'error' && certError && (
          <p className="text-rose text-[10px] mt-1">{certError}</p>
        )}
      </td>

      {/* Métriques fixes */}
      <td className="px-4 py-3 text-center">
        <span className="font-mono text-slate-700 text-sm">{nbUsers}</span>
      </td>
      <td className="px-5 py-3 text-right">
        <span className="font-mono text-slate-900 font-semibold text-sm">
          {iasScore !== null ? iasScore : '—'}
        </span>
      </td>
    </>
  );
}

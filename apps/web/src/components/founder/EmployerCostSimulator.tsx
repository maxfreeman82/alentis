'use client';

import { useState, useEffect } from 'react';
import { CSS_RATES, computeEmployerCost, formatFCFA } from '@/lib/payroll/employer-cost';
import type { EmployerCostResult } from '@/lib/payroll/employer-cost';
import { Calculator, ChevronDown, Info, Save } from 'lucide-react';

export default function EmployerCostSimulator() {
  const [gross,         setGross]         = useState(300000);
  const [isCadre,       setIsCadre]       = useState(false);
  const [accidentIdx,   setAccidentIdx]   = useState(2); // industrie légère 2%
  const [has13th,       setHas13th]       = useState(false);
  const [result,        setResult]        = useState<EmployerCostResult | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);

  useEffect(() => {
    const r = computeEmployerCost(gross, {
      isCadre,
      accidentRate: CSS_RATES[accidentIdx]?.rate ?? 0.02,
      has13thMonth: has13th,
    });
    setResult(r);
  }, [gross, isCadre, accidentIdx, has13th]);

  async function saveSimulation() {
    if (!result) return;
    setSaving(true);
    await fetch('/api/founder/employer-cost', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ gross_salary: gross, is_cadre: isCadre, accident_rate: CSS_RATES[accidentIdx]?.rate ?? 0.02, has_13th_month: has13th, ...result }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (!result) return null;

  const ratio = result.ratioNetToTotal;
  const ratioColor = ratio >= 70 ? '#10B981' : ratio >= 55 ? '#F59E0B' : '#F87171';

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="card space-y-5">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-amber-400" />
          <h2 className="font-display text-slate-900 text-sm">Paramètres</h2>
        </div>

        {/* Salaire brut */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <label className="text-slate-400">Salaire brut mensuel</label>
            <span className="font-mono text-amber-400 font-bold">{formatFCFA(gross)}</span>
          </div>
          <input type="range" min={75000} max={2000000} step={25000} value={gross}
            onChange={e => setGross(Number(e.target.value))}
            className="w-full h-1.5 appearance-none bg-bg rounded-full cursor-pointer accent-amber-500" />
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>75 000</span><span>SMIG: 75 000 FCFA</span><span>2 000 000</span>
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isCadre} onChange={e => setIsCadre(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded" />
            <span className="text-slate-400 text-xs">Poste cadre (IPRES RC +3.6%)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={has13th} onChange={e => setHas13th(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded" />
            <span className="text-slate-400 text-xs">13e mois inclus</span>
          </label>
        </div>

        {/* Secteur CSS */}
        <div className="space-y-1.5">
          <label className="text-slate-400 text-xs">Secteur d&apos;activité (taux accident)</label>
          <div className="relative">
            <select value={accidentIdx} onChange={e => setAccidentIdx(Number(e.target.value))}
              className="w-full appearance-none bg-bg border border-slate-200 rounded-xl px-3 py-2 text-slate-600 text-xs focus:outline-none focus:border-amber-500/50">
              {CSS_RATES.map((r, i) => (
                <option key={i} value={i}>{r.label} — {(r.rate * 100).toFixed(1)}%</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Résultats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Coût total */}
        <div className="card space-y-4">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Coût total employeur/mois</p>
          <p className="font-display text-3xl text-amber-400 font-bold">{formatFCFA(result.totalCost)}</p>
          <p className="text-slate-500 text-xs">Annuel : <span className="text-slate-600">{formatFCFA(result.totalCostAnnual)}</span></p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Salaire brut</span>
              <span className="text-slate-600 font-mono">{formatFCFA(gross)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">IPRES RG patron</span>
              <span className="text-slate-600 font-mono">{formatFCFA(result.ipresRgEmployer)}</span>
            </div>
            {result.ipresRcEmployer > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">IPRES RC patron</span>
                <span className="text-slate-600 font-mono">{formatFCFA(result.ipresRcEmployer)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">CSS accidents</span>
              <span className="text-slate-600 font-mono">{formatFCFA(result.cssEmployer)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">FDFP formation</span>
              <span className="text-slate-600 font-mono">{formatFCFA(result.fdfpEmployer)}</span>
            </div>
          </div>
        </div>

        {/* Net employé */}
        <div className="card space-y-4">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Net reçu par l&apos;employé</p>
          <p className="font-display text-3xl text-emerald-400 font-bold">{formatFCFA(result.netSalary)}</p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Efficacité salariale</span>
              <span className="font-semibold" style={{ color: ratioColor }}>{ratio}%</span>
            </div>
            <div className="h-2 bg-bg rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${ratio}%`, backgroundColor: ratioColor }} />
            </div>
            <p className="text-slate-600 text-[10px]">% du salaire net vs coût total</p>
          </div>
          <div className="space-y-1 pt-1 border-t border-slate-200">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">IPRES RG salarié</span>
              <span className="text-rose-400 font-mono">−{formatFCFA(result.ipresRgEmployee)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">IR</span>
              <span className="text-rose-400 font-mono">−{formatFCFA(result.ir)}</span>
            </div>
            {result.trimf > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">TRIMF</span>
                <span className="text-rose-400 font-mono">−{formatFCFA(result.trimf)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info SMIG */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-sky-500/5 border border-sky-500/20 rounded-xl">
        <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
        <p className="text-slate-400 text-xs leading-relaxed">
          SMIG Sénégal : 75 000 FCFA/mois. Pour un employé au SMIG, le coût total employeur est de ~{formatFCFA(computeEmployerCost(75000).totalCost)}/mois.
          Les taux de cotisations sont basés sur la réglementation IPRES/CSS 2024.
        </p>
      </div>

      {/* Sauvegarder */}
      <div className="text-center">
        <button onClick={saveSimulation} disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-sm font-semibold hover:bg-amber-500/20 disabled:opacity-40 transition-all">
          <Save className="w-4 h-4" />
          {saving ? 'Sauvegarde…' : saved ? 'Simulation sauvegardée ✓' : 'Sauvegarder cette simulation'}
        </button>
      </div>
    </div>
  );
}

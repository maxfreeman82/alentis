'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, X, Loader2, CheckCircle2, Upload, Plus, Trash2 } from 'lucide-react';

type Tab = 'single' | 'csv';

const ROLE_OPTIONS = [
  { value: 'org_employee',  label: 'Employé' },
  { value: 'org_manager',   label: 'Manager' },
  { value: 'org_hr',        label: 'RH' },
  { value: 'org_recruiter', label: 'Recruteur' },
  { value: 'org_admin',     label: 'Administrateur' },
];

export function InviteButton() {
  const router   = useRouter();
  const [open,   setOpen]   = useState(false);
  const [tab,    setTab]    = useState<Tab>('single');
  const [role,   setRole]   = useState('org_employee');
  const [result, setResult] = useState<{ sent: number; skipped: number } | null>(null);
  const [error,  setError]  = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Single email form
  const [email,     setEmail]     = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');

  // CSV: list of raw email strings parsed from textarea
  const [csvText, setCsvText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function parseEmails(raw: string): string[] {
    return raw
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  async function submit(emails: string[], fn?: string, ln?: string) {
    setError(null);
    setResult(null);
    const body: Record<string, unknown> = { emails, role };
    if (fn) body.first_name = fn;
    if (ln) body.last_name  = ln;

    const res  = await fetch('/api/invitations/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    const data = await res.json() as { ok?: boolean; error?: string; sent?: number; skipped?: number };
    if (!res.ok) { setError(data.error ?? 'Erreur serveur'); return; }
    setResult({ sent: data.sent ?? 0, skipped: data.skipped ?? 0 });
    router.refresh();
  }

  function handleSingle(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => submit([email], firstName || undefined, lastName || undefined));
  }

  function handleCsv(e: React.FormEvent) {
    e.preventDefault();
    const emails = parseEmails(csvText);
    if (emails.length === 0) { setError('Aucun email détecté'); return; }
    startTransition(() => submit(emails));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCsvText(ev.target?.result as string ?? '');
    reader.readAsText(file);
  }

  function handleClose() {
    setOpen(false);
    setEmail(''); setFirstName(''); setLastName('');
    setCsvText(''); setError(null); setResult(null);
    setTab('single'); setRole('org_employee');
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors"
      >
        <UserPlus className="w-3.5 h-3.5" /> Inviter des employés
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

          <div className="relative z-10 w-full max-w-md bg-bg-surface border border-slate-200 rounded-2xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <h2 className="font-display text-slate-900 text-sm">Inviter des employés</h2>
              </div>
              <button type="button" onClick={handleClose} className="text-slate-500 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-bg rounded-xl">
                {([['single', 'Email unique'], ['csv', 'CSV / liste']] as [Tab, string][]).map(([t, label]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTab(t); setError(null); setResult(null); }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      tab === t
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                        : 'text-slate-500 hover:text-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Rôle (commun) */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Rôle</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full bg-bg border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                >
                  {ROLE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Succès */}
              {result && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-emerald-400 text-xs font-semibold">
                      {result.sent} invitation{result.sent > 1 ? 's' : ''} envoyée{result.sent > 1 ? 's' : ''}
                      {result.skipped > 0 ? ` · ${result.skipped} déjà invité${result.skipped > 1 ? 's' : ''}` : ''}
                    </p>
                    <p className="text-slate-400 text-[10px] mt-0.5">Le lien est valable 7 jours.</p>
                  </div>
                </div>
              )}

              {/* Erreur */}
              {error && (
                <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {/* Formulaire email unique */}
              {tab === 'single' && (
                <form onSubmit={handleSingle} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Prénom</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="Optionnel"
                        className="w-full bg-bg border border-slate-200 rounded-lg px-2.5 py-2 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-emerald-500/40 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nom</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        placeholder="Optionnel"
                        className="w-full bg-bg border border-slate-200 rounded-lg px-2.5 py-2 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-emerald-500/40 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Email *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="employe@entreprise.com"
                      required
                      className="w-full bg-bg border border-slate-200 rounded-lg px-2.5 py-2 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-emerald-500/40 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-900 font-semibold rounded-xl py-2.5 text-sm transition-colors"
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    {isPending ? 'Envoi en cours…' : 'Envoyer l\'invitation'}
                  </button>
                </form>
              )}

              {/* Formulaire CSV */}
              {tab === 'csv' && (
                <form onSubmit={handleCsv} className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-semibold text-slate-500">Emails (un par ligne, virgule ou point-virgule)</label>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5"
                      >
                        <Upload className="w-3 h-3" /> Importer CSV
                      </button>
                    </div>
                    <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
                    <textarea
                      value={csvText}
                      onChange={e => setCsvText(e.target.value)}
                      rows={6}
                      placeholder={"alice@acme.com\nbob@acme.com\ncharlie@acme.com"}
                      className="w-full bg-bg border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-emerald-500/40 transition-colors resize-none font-mono"
                    />
                    {csvText.trim() && (
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-slate-600 text-[10px]">
                          {parseEmails(csvText).length} email{parseEmails(csvText).length > 1 ? 's' : ''} détecté{parseEmails(csvText).length > 1 ? 's' : ''}
                        </p>
                        <button type="button" onClick={() => setCsvText('')} className="text-slate-600 hover:text-rose-400 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isPending || parseEmails(csvText).length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-900 font-semibold rounded-xl py-2.5 text-sm transition-colors"
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    {isPending ? 'Envoi en cours…' : `Inviter ${parseEmails(csvText).length || ''} collaborateur${parseEmails(csvText).length > 1 ? 's' : ''}`}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

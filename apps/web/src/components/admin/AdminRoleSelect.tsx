'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type Role =
  | 'org_admin'
  | 'org_manager'
  | 'org_hr'
  | 'org_recruiter'
  | 'org_employee'
  | 'talent_free'
  | 'super_admin';

const ROLES: Role[] = [
  'org_admin',
  'org_manager',
  'org_hr',
  'org_recruiter',
  'org_employee',
  'talent_free',
  'super_admin',
] as const;

const ROLE_LABELS: Record<Role, string> = {
  org_admin:     'Admin Org',
  org_manager:   'Manager',
  org_hr:        'RH',
  org_recruiter: 'Recruteur',
  org_employee:  'Employé',
  talent_free:   'Talent Free',
  super_admin:   'Super Admin',
} as const;

const ROLE_COLORS: Record<Role, string> = {
  org_admin:     'text-violet bg-violet/10 border-violet/20',
  org_manager:   'text-sky bg-sky/10 border-sky/20',
  org_hr:        'text-emerald bg-emerald/10 border-emerald/20',
  org_recruiter: 'text-orange bg-orange/10 border-orange/20',
  org_employee:  'text-slate-600 bg-slate-100 border-slate-200',
  talent_free:   'text-amber bg-amber/10 border-amber/20',
  super_admin:   'text-rose bg-rose/10 border-rose/20',
} as const;

function isRole(v: string): v is Role {
  return ROLES.includes(v as Role);
}

interface Props {
  profileId: string;
  currentRole: Role;
}

type SaveStatus = 'idle' | 'loading' | 'success' | 'error';

export function AdminRoleSelect({ profileId, currentRole }: Props) {
  const [role, setRole]         = useState<Role>(currentRole);
  const [status, setStatus]     = useState<SaveStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  async function saveRole() {
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/update-role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, role }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Erreur serveur');
      }
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        onChange={(e) => {
          const v = e.target.value;
          if (isRole(v)) {
            setRole(v);
            setStatus('idle');
          }
        }}
        className={cn(
          'text-xs font-semibold px-2 py-1 rounded-lg border outline-none cursor-pointer',
          ROLE_COLORS[role]
        )}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
        ))}
      </select>

      <button
        onClick={saveRole}
        disabled={status === 'loading'}
        className={cn(
          'text-xs px-2 py-1 rounded-lg border font-medium transition-all',
          status === 'loading' && 'opacity-50 cursor-not-allowed',
          status === 'success' && 'border-emerald/30 bg-emerald/10 text-emerald',
          status === 'error'   && 'border-rose/30 bg-rose/10 text-rose',
          status === 'idle'    && 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100',
        )}
      >
        {status === 'loading' ? '…' : status === 'success' ? '✓' : status === 'error' ? '✗' : 'Sauver'}
      </button>

      {status === 'error' && errorMsg && (
        <p className="text-rose text-[10px]">{errorMsg}</p>
      )}
    </div>
  );
}

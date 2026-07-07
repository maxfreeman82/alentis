/**
 * Système RBAC de Teranga Align.
 * Usage : const allowed = can(user.role, 'view:dashboard');
 */

export type Role =
  | 'super_admin'
  | 'org_admin'
  | 'org_manager'
  | 'org_hr'
  | 'org_recruiter'
  | 'org_employee'
  | 'talent_free'
  | 'talent_premium'
  | 'founder'
  | 'coach';

export type Permission =
  // Tableau de bord entreprise
  | 'view:dashboard'
  | 'view:jobs'
  | 'view:candidates'
  | 'manage:jobs'
  | 'manage:org_settings'
  | 'manage:org_users'
  | 'view:org_analytics'
  // Talent Passport
  | 'view:passport'
  | 'edit:passport'
  | 'export:passport'
  // Matching & scoring
  | 'view:matches'
  | 'contact:talent'
  // Espace fondateur
  | 'view:founder_space'
  | 'manage:founder_settings'
  // Admin
  | 'view:admin'
  | 'manage:platform';

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  super_admin: [
    'view:dashboard', 'view:jobs', 'view:candidates', 'manage:jobs',
    'manage:org_settings', 'manage:org_users', 'view:org_analytics',
    'view:passport', 'edit:passport', 'export:passport',
    'view:matches', 'contact:talent',
    'view:founder_space', 'manage:founder_settings',
    'view:admin', 'manage:platform',
  ],
  org_admin: [
    'view:dashboard', 'view:jobs', 'view:candidates', 'manage:jobs',
    'manage:org_settings', 'manage:org_users', 'view:org_analytics',
    'view:matches', 'contact:talent',
  ],
  org_manager: [
    'view:dashboard', 'view:jobs', 'view:candidates',
    'manage:jobs', 'view:org_analytics',
    'view:matches', 'contact:talent',
  ],
  org_hr: [
    'view:dashboard', 'view:jobs', 'view:candidates',
    'manage:jobs', 'view:matches', 'contact:talent',
  ],
  org_recruiter: [
    'view:dashboard', 'view:jobs', 'view:candidates',
    'manage:jobs', 'view:matches', 'contact:talent',
  ],
  org_employee: [
    'view:dashboard',
  ],
  talent_free: [
    'view:passport', 'edit:passport',
    'view:matches',
  ],
  talent_premium: [
    'view:passport', 'edit:passport', 'export:passport',
    'view:matches',
  ],
  founder: [
    'view:founder_space', 'manage:founder_settings',
    'view:passport', 'edit:passport',
  ],
  coach: [
    'view:dashboard', 'view:candidates', 'view:matches',
  ],
};

/**
 * Vérifie si un rôle possède une permission.
 * Retourne toujours false si le rôle est inconnu.
 */
export function can(role: Role | string | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role as Role];
  if (!perms) return false;
  return (perms as readonly string[]).includes(permission);
}

/**
 * Vérifie si un rôle possède AU MOINS UNE des permissions listées.
 */
export function canAny(role: Role | string | null | undefined, permissions: Permission[]): boolean {
  return permissions.some(p => can(role, p));
}

/**
 * Vérifie si un rôle possède TOUTES les permissions listées.
 */
export function canAll(role: Role | string | null | undefined, permissions: Permission[]): boolean {
  return permissions.every(p => can(role, p));
}

/**
 * Retourne true si le rôle appartient à l'espace Entreprise.
 */
export function isOrgRole(role: Role | string | null | undefined): boolean {
  if (!role) return false;
  return (role as string).startsWith('org_');
}

/**
 * Retourne true si le rôle appartient à l'espace Talent.
 */
export function isTalentRole(role: Role | string | null | undefined): boolean {
  return role === 'talent_free' || role === 'talent_premium';
}

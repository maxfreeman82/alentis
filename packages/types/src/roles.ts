export const ROLES = {
  SUPER_ADMIN:    'super_admin',
  ORG_ADMIN:      'org_admin',
  ORG_MANAGER:    'org_manager',
  ORG_HR:         'org_hr',
  ORG_RECRUITER:  'org_recruiter',
  ORG_EMPLOYEE:   'org_employee',
  TALENT_FREE:    'talent_free',
  TALENT_PREMIUM: 'talent_premium',
  COACH:          'coach',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

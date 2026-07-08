import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const maxDuration = 60;

const ORG_NAMES = [
  'Dakar Tech Hub','BanqueAfrique Digital','CliniqueSenegal Plus',
  'AfriLearn Academy','MarchePro Distribution','AgroSenegal SA',
  'SolarAfrique Energie','ConnectAfrik Telecom','AfricaMedia Group',
  'ProprieteAfrique Immo','TransLog Afrique','FoodAfrika Agroalim',
  'MineralAfrica Resources','Tourisme Teranga','AssuAfrique SA',
  'AfriConsult Partners','Developpement Afrique ONG','AfriStyle Couture',
  'BuildAfrique BTP','FinTech Microfinance',
];

const FIRST_NAMES = [
  'Amadou','Fatou','Ibrahima','Mariama','Cheikh','Aissatou','Moussa','Rokhaya',
  'Oumar','Ndeye','Seydou','Astou','Mamadou','Khady','Alioune','Coumba',
  'Babacar','Dieynaba','Modou','Sokhna','Lamine','Yaye','Samba','Adja',
  'Pape','Mame','Abdou','Binta','Omar','Fatoumata','Bamba','Ndeye',
  'Idrissa','Awa','Abdoulaye','Dienaba','Youssou','Nafi','Gora','Ramatoulaye',
];

const LAST_NAMES = [
  'Diallo','Ndiaye','Fall','Sow','Sy','Mbaye','Diop','Ba',
  'Gueye','Kane','Diouf','Cisse','Sarr','Camara','Faye','Coulibaly',
  'Thiam','Ndour','Sene','Kouyate','Toure','Badji','Mendy','Gomis',
  'Samb','Balde','Deme','Tine','Wade','Dia','Mbow','Thiaw',
];

const DOMAINS       = ['gmail.com','yahoo.fr','outlook.com','hotmail.fr','icloud.com'];
const FAMILIES      = ['pilotes','initialiseurs','accomplisseurs','dynamiseurs','regulateurs'];
const ENERGY_LEVELS = ['C1','C2','C3','C4','C5'];

function ascii(s: string): string {
  return s.replace(/[^a-zA-Z]/g, '').toLowerCase();
}

interface Spec {
  email: string; password: string;
  fn: string; ln: string;
  orgId: string; orgIndex: number; empIndex: number; isAdmin: boolean;
}

export async function GET() {
  const admin = createAdminClient();

  // 1. Récupérer les 20 orgs seed
  const { data: orgs } = await admin
    .from('organizations').select('id, name').in('name', ORG_NAMES);

  if (!orgs || orgs.length === 0)
    return NextResponse.json({ error: 'Orgs seed non trouvées' }, { status: 404 });

  const orgMap = new Map(orgs.map(o => [o.name, o.id]));
  const sortedOrgIds = ORG_NAMES
    .map(n => orgMap.get(n))
    .filter((id): id is string => !!id);

  if (sortedOrgIds.length < 20)
    return NextResponse.json({ error: `${sortedOrgIds.length}/20 orgs trouvées` }, { status: 400 });

  // 2. Construire 120 specs : 1 admin + 5 employés × 20 orgs
  const specs: Spec[] = [];
  for (let i = 1; i <= 20; i++) {
    const orgId = sortedOrgIds[i - 1];

    const afn = FIRST_NAMES[(i * 3 - 1) % 40];
    const aln = LAST_NAMES [(i * 2 - 1) % 32];
    specs.push({
      email: `${ascii(afn)}.${ascii(aln)}.adm${i}@${DOMAINS[i % 5]}`,
      password: 'Admin2026!',
      fn: afn, ln: aln, orgId, orgIndex: i, empIndex: 0, isAdmin: true,
    });

    for (let j = 1; j <= 5; j++) {
      const efn = FIRST_NAMES[(i + j * 7 - 1) % 40];
      const eln = LAST_NAMES [(i * j + 2)     % 32];
      specs.push({
        email: `${ascii(efn)}.${ascii(eln)}${i}${j}@${DOMAINS[j % 5]}`,
        password: 'Employe2026!',
        fn: efn, ln: eln, orgId, orgIndex: i, empIndex: j, isAdmin: false,
      });
    }
  }

  // 3. Créer 120 comptes GoTrue en batches parallèles de 10
  const BATCH = 10;
  const created: Array<Spec & { userId?: string; authError?: string }> = [];

  for (let b = 0; b < specs.length; b += BATCH) {
    const batch = specs.slice(b, b + BATCH);
    const results = await Promise.all(batch.map(async (spec) => {
      const { data, error } = await admin.auth.admin.createUser({
        email: spec.email,
        password: spec.password,
        email_confirm: true,
        user_metadata: { first_name: spec.fn, last_name: spec.ln },
      });
      return { ...spec, userId: data?.user?.id, authError: error?.message };
    }));
    created.push(...results);
  }

  // 4. Insérer tous les profiles en un seul batch
  const profileInserts = created
    .filter(u => u.userId)
    .map(u => ({
      user_id:              u.userId!,
      email:                u.email,
      role:                 u.isAdmin ? 'org_admin' : 'org_employee',
      first_name:           u.fn,
      last_name:            u.ln,
      organization_id:      u.orgId,
      onboarding_completed: true,
    }));

  const { data: profileRows, error: profileErr } = await admin
    .from('profiles').insert(profileInserts).select('id, email');

  if (profileErr)
    return NextResponse.json({
      users_created: created.filter(u => u.userId).length,
      profiles_error: profileErr.message,
      auth_errors: created.filter(u => u.authError).map(u => ({ email: u.email, error: u.authError })),
    }, { status: 500 });

  // 5. Insérer les 100 talent_passports en un seul batch
  const emailToProfileId = new Map((profileRows ?? []).map(p => [p.email, p.id]));

  const passportInserts = created
    .filter(u => !u.isAdmin && u.userId)
    .flatMap(u => {
      const profileId = emailToProfileId.get(u.email);
      if (!profileId) return [];
      const i = u.orgIndex, j = u.empIndex;
      const hs   = 45 + ((i * j * 3 + 17) % 45);
      const ss   = 50 + ((i + j * 5 + 11) % 40);
      const ex   = 40 + ((i * 2 + j * 7 + 5) % 50);
      const ls   = 55 + ((i + j * 3 + 9) % 35);
      const en   = 48 + ((i * 3 + j + 13) % 42);
      const rk   = 20 + ((i + j * 4 + 7) % 50);
      const glob = Math.floor((hs*25 + ss*20 + ex*20 + ls*15 + en*15 + (100-rk)*5) / 100);
      const ep   = 15 + ((i + j * 3) % 20);
      const ei   = 15 + ((i * 2 + j) % 20);
      const ea   = 20 + ((i + j * 2) % 20);
      const ed   = 15 + ((i * 3 + j * 4) % 15);
      const er   = 100 - ep - ei - ea - ed;
      return [{
        profile_id:       profileId,
        organization_id:  u.orgId,
        score_global: glob, score_hard: hs, score_soft: ss, score_exp: ex,
        score_life: ls, score_energy: en, score_risk: rk,
        growth_potential: 50 + ((i * j + 11) % 40),
        transfer_score:   60 + ((i + j * 6) % 35),
        energy_pilotes: ep, energy_initialiseurs: ei, energy_accomplisseurs: ea,
        energy_dynamiseurs: ed, energy_regulateurs: er,
        dominant_family: FAMILIES[(i + j - 1) % 5],
        energy_level:    ENERGY_LEVELS[(i + j) % 5],
        soft_communication:     ss + ((i+j)    %10) - 5,
        soft_leadership:        ss + ((i*2+j)   %8) - 4,
        soft_adaptability:      ss + ((i+j*3)  %12) - 6,
        soft_problem_solving:   ss + ((i*3+j)  %10) - 5,
        soft_critical_thinking: ss + ((i+j*2)   %8) - 4,
        soft_collaboration:     ss + ((i*4+j)  %10) - 5,
        soft_stress_mgmt:       ss + ((i+j)    %12) - 6,
        soft_organization:      ss + ((i*2+j*3)%10) - 5,
        soft_learning_speed:    ss + ((i+j*4)   %8) - 4,
        soft_emotional_intel:   ss + ((i*3+j*2)%10) - 5,
        passport_id:     `TA-SN-${String(i * 100 + j).padStart(6, '0')}`,
        verified:        j % 3 === 0,
        last_assessment: new Date(Date.now() - (i + j * 2) * 86400000).toISOString(),
      }];
    });

  const { error: passportErr } = await admin.from('talent_passports').insert(passportInserts);

  return NextResponse.json({
    orgs_found:         sortedOrgIds.length,
    users_created:      created.filter(u => u.userId).length,
    users_errors:       created.filter(u => u.authError).length,
    profiles_inserted:  profileInserts.length,
    passports_inserted: passportInserts.length,
    passport_error:     passportErr?.message ?? null,
    auth_errors:        created.filter(u => u.authError).map(u => ({ email: u.email, error: u.authError })),
  });
}

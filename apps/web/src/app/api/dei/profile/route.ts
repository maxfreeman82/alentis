import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { z } from 'zod';
import { getUserOrg } from '@/lib/supabase/auth';

const schema = z.object({
  gender:      z.enum(['homme','femme','autre','non_precise']).optional(),
  age_range:   z.enum(['18-25','26-35','36-45','46-55','55+']).optional(),
  nationality: z.string().max(100).optional(),
  department:  z.string().max(100).optional(),
  salary_band: z.enum(['junior','intermediaire','senior','expert','direction']).optional(),
  is_manager:  z.boolean().optional(),
  disability:  z.boolean().optional(),
});

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { supabase, organizationId, profileId } = ctx;

  const d = parsed.data;

  const { error } = await supabase.from('dei_profiles').upsert(
    {
      organization_id: organizationId,
      profile_id:      profileId,
      gender:          d.gender ?? null,
      age_range:       d.age_range ?? null,
      nationality:     d.nationality ?? null,
      department:      d.department ?? null,
      salary_band:     d.salary_band ?? null,
      ...(d.is_manager !== undefined ? { is_manager: d.is_manager } : {}),
      ...(d.disability !== undefined ? { disability: d.disability } : {}),
    },
    { onConflict: 'profile_id' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

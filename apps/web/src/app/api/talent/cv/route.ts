import { requireAuth } from '@/lib/supabase/user';
import { NextRequest, NextResponse } from 'next/server';
import { getTalentProfile } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseCV } from '@/lib/ai';
// pdf-parse n'a pas de types ESM propres — import CJS classique.
import pdfParse from 'pdf-parse';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const ctx = await getTalentProfile(user.id);
    if (!ctx) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 401 });

    const form = await req.formData();
    const file = form.get('cv');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 5 Mo).' }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Format non supporté (PDF uniquement).' }, { status: 400 });
    }

    const bytes  = Buffer.from(await file.arrayBuffer());
    const admin  = createAdminClient();
    const path   = `${ctx.profileId}/cv.pdf`;

    // 1. Stocker le fichier D'ABORD : même si l'extraction/le parsing échoue
    // ensuite, l'upload du CV a de la valeur en soi et ne doit pas être perdu.
    const { error: uploadErr } = await admin.storage
      .from('cv-uploads')
      .upload(path, bytes, { contentType: 'application/pdf', upsert: true });
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

    // 2. Extraction texte + parsing IA — best effort, ne bloque pas la réussite
    // de l'upload si ça échoue (PDF scanné sans texte, erreur IA, etc.).
    let extract: Awaited<ReturnType<typeof parseCV>> | null = null;
    try {
      const { text } = await pdfParse(bytes);
      if (text.trim().length > 0) {
        extract = await parseCV(text);
      }
    } catch (err) {
      console.error('[talent/cv] extraction/parsing failed:', err);
    }

    const updatePayload: Record<string, unknown> = { cv_url: path };
    if (extract) {
      if (extract.jobTitle)         updatePayload.job_title        = extract.jobTitle;
      if (extract.employer)         updatePayload.employer_name    = extract.employer;
      if (extract.sector)           updatePayload.sector           = extract.sector;
      if (extract.yearsExp != null) updatePayload.years_experience = extract.yearsExp;
      updatePayload.cv_extracted_skills = extract.hardSkills;
    }

    const { error: updateErr } = await admin
      .from('profiles')
      .update(updatePayload)
      .eq('id', ctx.profileId);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      parsed: extract !== null,
      extract,
    });
  } catch (err) {
    console.error('[talent/cv]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

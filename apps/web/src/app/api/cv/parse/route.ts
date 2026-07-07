import { type NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkPermission } from '@/lib/api-auth';

const SECTORS = [
  'Technologie', 'Finance & Banque', 'Agriculture & Agritech',
  'Santé & Healthcare', 'Éducation & EdTech', 'Logistique & Transport',
  'Médias & Communication', 'BTP & Construction', 'Tourisme & Hôtellerie',
  'Microfinance & Inclusion', 'Énergie & Environnement', 'Commerce & Distribution',
  'Industrie & Manufacturing', 'Conseil & Services', 'Immobilier',
];

export interface CvExtract {
  jobTitle:   string;
  employer:   string;
  sector:     string;
  yearsExp:   number;
  hardSkills: string[];
  summary:    string;
}

const PROMPT = `Analyse ce CV et extrais les informations en JSON strict.
Secteurs autorisés : ${SECTORS.join(', ')}.

{
  "jobTitle":   "titre du poste actuel ou dernier poste",
  "employer":   "nom de l'employeur actuel ou dernier",
  "sector":     "un secteur parmi la liste autorisée",
  "yearsExp":   nombre entier d'années d'expérience totale,
  "hardSkills": ["compétence1", ...] (max 12, noms courts),
  "summary":    "2 phrases résumant le profil professionnel"
}

Réponds UNIQUEMENT avec le JSON valide, sans markdown ni explication.`;

export async function POST(req: NextRequest) {
  const { error: authErr } = await checkPermission('edit:passport');
  if (authErr) return authErr;

  try {
    const form = await req.formData();
    const file = form.get('cv') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 5 Mo)' }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Format non supporté (PDF uniquement)' }, { status: 400 });
    }

    const bytes  = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Cast nécessaire : le SDK 0.32.1 reste dans le cache TypeScript, mais l'API v0.107+ supporte bien "document"
    type AnyMessageParam = Parameters<typeof client.messages.create>[0]['messages'][number];
    const userMsg = {
      role:    'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
        { type: 'text', text: PROMPT },
      ],
    } as unknown as AnyMessageParam;

    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages:   [userMsg],
    });

    const raw   = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
    const match = raw.match(/\{[\s\S]*\}/);

    if (!match) {
      console.error('[cv/parse] no JSON in response:', raw.slice(0, 200));
      return NextResponse.json({ error: 'Analyse impossible — réessayez ou ignorez cette étape' }, { status: 422 });
    }

    const extract: CvExtract = JSON.parse(match[0]);

    // Valider + normaliser
    if (typeof extract.jobTitle   !== 'string') extract.jobTitle   = '';
    if (typeof extract.employer   !== 'string') extract.employer   = '';
    if (!SECTORS.includes(extract.sector))      extract.sector     = '';
    if (typeof extract.yearsExp   !== 'number') extract.yearsExp   = 0;
    if (!Array.isArray(extract.hardSkills))     extract.hardSkills = [];
    extract.hardSkills = extract.hardSkills.slice(0, 12).map(String);
    if (typeof extract.summary    !== 'string') extract.summary    = '';

    return NextResponse.json(extract);
  } catch (err) {
    console.error('[cv/parse]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

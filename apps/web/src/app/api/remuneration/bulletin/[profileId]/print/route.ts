import { requireAuth } from '@/lib/supabase/user';
import { getUserOrg } from '@/lib/supabase/auth';
import { computePayroll, type FamilySituation } from '@/lib/remuneration/payroll';
import { formatFCFA } from '@/lib/utils';

const MONTH_LABELS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const SITUATION_LABELS: Record<FamilySituation, string> = {
  celibataire: 'Célibataire sans enfant',
  marie:       'Marié(e) sans enfant',
  marie_1:     'Marié(e) + 1 enfant',
  marie_2:     'Marié(e) + 2 enfants',
  marie_3:     'Marié(e) + 3 enfants et +',
};

// Renvoie une page HTML print-ready — l'utilisateur imprime en PDF via Ctrl+P ou le bouton
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params;
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return new Response('Non autorisé', { status: 401 });

  const { supabase, organizationId, orgName } = ctx;

  const [profileRes, settingRes] = await Promise.all([
    supabase.from('profiles')
      .select('first_name, last_name, email, role')
      .eq('id', profileId)
      .eq('organization_id', organizationId)
      .maybeSingle(),
    supabase.from('payroll_settings')
      .select('*')
      .eq('profile_id', profileId)
      .eq('organization_id', organizationId)
      .maybeSingle(),
  ]);

  if (!profileRes.data) return new Response('Collaborateur introuvable', { status: 404 });
  if (!settingRes.data) return new Response('Paramètres de paie non configurés', { status: 404 });

  const profile = profileRes.data;
  const setting = settingRes.data;
  const name    = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email;

  const result = computePayroll({
    salaireBrut:     setting.salaire_brut,
    situation:       setting.situation as FamilySituation,
    enfants:         setting.enfants,
    sectorRisk:      setting.sector_risk as 'low' | 'medium' | 'high',
    primes:          setting.primes_mensuelles,
    avantagesNature: setting.avantages_nature,
    retenuePrevoy:   setting.retenue_prevoyance,
  });

  const now        = new Date();
  const month      = now.getMonth() + 1;
  const year       = now.getFullYear();
  const monthLabel = MONTH_LABELS[month - 1] ?? String(month);

  const ipresTotal    = result.ipresA_salarie.montant + result.ipresB_salarie.montant;
  const situationLabel = SITUATION_LABELS[setting.situation as FamilySituation] ?? setting.situation;

  // Lignes cotisations patronales
  const patronalRows = [
    result.ipresA_patronal,
    ...(result.ipresB_patronal.montant > 0 ? [result.ipresB_patronal] : []),
    result.css_pf,
    result.css_at,
    result.ipm_patronal,
  ];

  const patronalRowsHtml = patronalRows.map(c =>
    `<tr>
      <td>${c.label}</td>
      <td class="amount">${formatFCFA(c.base)}</td>
      <td class="amount">${c.taux}%</td>
      <td class="amount violet">${formatFCFA(c.montant)}</td>
    </tr>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bulletin de paie — ${name} — ${monthLabel} ${year}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Outfit', sans-serif;
      background: white;
      color: #1e293b;
      padding: 40px;
      max-width: 820px;
      margin: 0 auto;
      font-size: 13px;
      line-height: 1.5;
    }

    .mono { font-family: 'JetBrains Mono', monospace; }

    /* Bouton impression */
    .print-btn {
      display: block;
      text-align: center;
      margin-bottom: 28px;
    }
    .print-btn button {
      background: #10b981; color: white; border: none;
      padding: 10px 28px; border-radius: 8px;
      font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer;
    }

    /* Entête */
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 20px; }
    .logo-box { width: 36px; height: 36px; background: #10b981; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 14px; }
    .company { display: flex; align-items: center; gap: 10px; }
    .company-name { font-weight: 700; font-size: 16px; }
    .company-sub { color: #64748b; font-size: 11px; }
    .period { font-size: 20px; font-weight: 700; color: #10b981; text-align: right; }
    .period-sub { color: #64748b; font-size: 11px; text-align: right; }

    /* Fiche employé */
    .emp-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .emp-name { font-size: 18px; font-weight: 700; }
    .emp-meta { color: #64748b; font-size: 12px; margin-top: 3px; }
    .net-box { text-align: right; }
    .net-label { font-size: 11px; color: #64748b; }
    .net-value { font-size: 28px; font-weight: 700; color: #10b981; font-family: 'JetBrains Mono', monospace; }

    /* Résumé 3 colonnes */
    .summary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
    .summary-value { font-size: 15px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
    .summary-label { font-size: 10px; color: #94a3b8; margin-top: 3px; }
    .c-emerald { color: #10b981; }
    .c-rose    { color: #f43f5e; }
    .c-violet  { color: #8b5cf6; }
    .c-amber   { color: #f59e0b; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    thead th { background: #0f172a; color: white; padding: 8px 12px; font-size: 11px; font-weight: 600; letter-spacing: 0.03em; }
    thead th.amount { text-align: right; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tr.group-header td { background: #f1f5f9; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; padding: 5px 12px; }
    tr.bold-row td { font-weight: 700; background: #e2e8f0; color: #0f172a; }
    tbody td { padding: 7px 12px; border-bottom: 1px solid #f1f5f9; }
    td.amount { text-align: right; font-family: 'JetBrains Mono', monospace; }
    td.credit { color: #10b981; }
    td.debit  { color: #f43f5e; }
    td.violet { color: #8b5cf6; }
    td.dash   { color: #cbd5e1; }

    /* Indicateurs */
    .indicators { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .indicator { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
    .indicator-label { font-size: 12px; color: #64748b; }
    .indicator-value { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 14px; }

    /* Footer */
    .footer { border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .footer-note { font-size: 10px; color: #94a3b8; line-height: 1.6; }
    .signature { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 24px; text-align: center; }
    .signature-space { height: 36px; }
    .signature-label { font-size: 10px; color: #94a3b8; }

    @media print {
      @page { margin: 12mm 15mm; size: A4 portrait; }
      body { padding: 0; font-size: 12px; }
      .print-btn { display: none !important; }
    }
  </style>
</head>
<body>

  <div class="print-btn no-print">
    <button onclick="window.print()">⬇ Télécharger en PDF (Ctrl+P)</button>
  </div>

  <!-- Entête entreprise -->
  <div class="header">
    <div class="company">
      <div class="logo-box">TA</div>
      <div>
        <div class="company-name">${orgName}</div>
        <div class="company-sub">Bulletin de paie · Document confidentiel</div>
      </div>
    </div>
    <div>
      <div class="period">${monthLabel} ${year}</div>
      <div class="period-sub">Généré le ${now.toLocaleDateString('fr-FR')}</div>
    </div>
  </div>

  <!-- Fiche employé -->
  <div class="emp-card">
    <div>
      <div class="emp-name">${name}</div>
      <div class="emp-meta">${profile.role ?? '—'} · ${situationLabel}${setting.est_cadre ? ' · Cadre' : ''}</div>
      ${setting.date_embauche ? `<div class="emp-meta">Embauché le ${new Date(setting.date_embauche).toLocaleDateString('fr-FR')}</div>` : ''}
    </div>
    <div class="net-box">
      <div class="net-label">Net à payer</div>
      <div class="net-value">${formatFCFA(result.salaireNet)}</div>
    </div>
  </div>

  <!-- Résumé -->
  <div class="summary">
    <div class="summary-card">
      <div class="summary-value c-emerald">${formatFCFA(result.totalBrut)}</div>
      <div class="summary-label">Salaire brut</div>
    </div>
    <div class="summary-card">
      <div class="summary-value c-rose">-${formatFCFA(result.totalRetenues + result.irppMensuel)}</div>
      <div class="summary-label">Total retenues</div>
    </div>
    <div class="summary-card">
      <div class="summary-value c-violet">${formatFCFA(result.coutEmployeur)}</div>
      <div class="summary-label">Coût employeur</div>
    </div>
  </div>

  <!-- Tableau principal -->
  <table>
    <thead>
      <tr>
        <th style="width:45%">Désignation</th>
        <th class="amount" style="width:20%">Base (FCFA)</th>
        <th class="amount" style="width:17.5%">Gain (FCFA)</th>
        <th class="amount" style="width:17.5%">Retenue (FCFA)</th>
      </tr>
    </thead>
    <tbody>
      <tr class="group-header"><td colspan="4">Éléments de rémunération</td></tr>
      <tr>
        <td>Salaire de base</td>
        <td class="amount">${formatFCFA(result.salaireBrut)}</td>
        <td class="amount credit">${formatFCFA(result.salaireBrut)}</td>
        <td class="amount dash">—</td>
      </tr>
      ${result.input.primes > 0 ? `<tr>
        <td>Primes mensuelles</td>
        <td class="amount">—</td>
        <td class="amount credit">${formatFCFA(result.input.primes)}</td>
        <td class="amount dash">—</td>
      </tr>` : ''}
      ${result.input.avantagesNature > 0 ? `<tr>
        <td>Avantages en nature</td>
        <td class="amount">—</td>
        <td class="amount credit">${formatFCFA(result.input.avantagesNature)}</td>
        <td class="amount dash">—</td>
      </tr>` : ''}
      <tr class="bold-row">
        <td>SALAIRE BRUT TOTAL</td>
        <td class="amount"></td>
        <td class="amount credit">${formatFCFA(result.totalBrut)}</td>
        <td class="amount dash">—</td>
      </tr>

      <tr class="group-header"><td colspan="4">Cotisations salariales</td></tr>
      <tr>
        <td>${result.ipresA_salarie.label}</td>
        <td class="amount">${formatFCFA(result.ipresA_salarie.base)}</td>
        <td class="amount dash">—</td>
        <td class="amount debit">-${formatFCFA(result.ipresA_salarie.montant)}</td>
      </tr>
      ${result.ipresB_salarie.montant > 0 ? `<tr>
        <td>${result.ipresB_salarie.label}</td>
        <td class="amount">${formatFCFA(result.ipresB_salarie.base)}</td>
        <td class="amount dash">—</td>
        <td class="amount debit">-${formatFCFA(result.ipresB_salarie.montant)}</td>
      </tr>` : ''}
      <tr>
        <td>${result.ipm_salarie.label}</td>
        <td class="amount">${formatFCFA(result.ipm_salarie.base)}</td>
        <td class="amount dash">—</td>
        <td class="amount debit">-${formatFCFA(result.ipm_salarie.montant)}</td>
      </tr>
      ${result.input.retenuePrevoy > 0 ? `<tr>
        <td>Retenue prévoyance</td>
        <td class="amount">—</td>
        <td class="amount dash">—</td>
        <td class="amount debit">-${formatFCFA(result.input.retenuePrevoy)}</td>
      </tr>` : ''}

      <tr class="group-header"><td colspan="4">Impôts</td></tr>
      <tr>
        <td>IRPP mensuel (retenue à la source)</td>
        <td class="amount">${formatFCFA(result.salaireNetImposable)}</td>
        <td class="amount dash">—</td>
        <td class="amount debit">${result.irppMensuel > 0 ? `-${formatFCFA(result.irppMensuel)}` : formatFCFA(0)}</td>
      </tr>

      <tr class="bold-row">
        <td>NET À PAYER</td>
        <td class="amount"></td>
        <td class="amount credit">${formatFCFA(result.salaireNet)}</td>
        <td class="amount dash">—</td>
      </tr>
    </tbody>
  </table>

  <!-- Charges patronales -->
  <table>
    <thead>
      <tr>
        <th>Charges patronales (informatives)</th>
        <th class="amount">Base (FCFA)</th>
        <th class="amount">Taux</th>
        <th class="amount">Montant (FCFA)</th>
      </tr>
    </thead>
    <tbody>
      ${patronalRowsHtml}
      <tr class="bold-row">
        <td>TOTAL CHARGES PATRONALES</td>
        <td class="amount"></td>
        <td class="amount"></td>
        <td class="amount violet">${formatFCFA(result.totalChargesPatronal)}</td>
      </tr>
      <tr>
        <td style="font-weight:600">COÛT EMPLOYEUR TOTAL</td>
        <td class="amount"></td>
        <td class="amount"></td>
        <td class="amount violet" style="font-weight:700">${formatFCFA(result.coutEmployeur)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Indicateurs -->
  <div class="indicators">
    <div class="indicator">
      <span class="indicator-label">Taux charges salariales</span>
      <span class="indicator-value c-amber">${result.tauxChargesSalarie}%</span>
    </div>
    <div class="indicator">
      <span class="indicator-label">Rapport coût / net</span>
      <span class="indicator-value c-violet">${result.tauxCoutTotal}%</span>
    </div>
    <div class="indicator">
      <span class="indicator-label">IRPP annuel estimé</span>
      <span class="indicator-value c-rose">${formatFCFA(result.irppAnnuel)}</span>
    </div>
    <div class="indicator">
      <span class="indicator-label">Total retenues salariales</span>
      <span class="indicator-value c-amber">${formatFCFA(result.totalRetenues + result.irppMensuel)}</span>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-note">
      Bulletin établi conformément au Code du Travail sénégalais et à la réglementation IPRES/CSS 2024.<br>
      IRPP calculé selon le barème progressif DGI · Taux AT : ${result.css_at.taux}%<br>
      Généré par <strong>Teranga Align</strong> · teranga-align.com
    </div>
    <div class="signature">
      <div class="signature-space"></div>
      <div class="signature-label">Signature &amp; cachet employeur</div>
    </div>
  </div>

</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

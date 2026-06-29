const BASE_URL = process.env.PAYDUNYA_MODE === 'test'
  ? 'https://app.paydunya.com/sandbox-api/v1'
  : 'https://app.paydunya.com/api/v1';

function pdHeaders() {
  return {
    'Content-Type': 'application/json',
    'PAYDUNYA-MASTER-KEY':  process.env.PAYDUNYA_MASTER_KEY  ?? '',
    'PAYDUNYA-PRIVATE-KEY': process.env.PAYDUNYA_PRIVATE_KEY ?? '',
    'PAYDUNYA-TOKEN':       process.env.PAYDUNYA_TOKEN       ?? '',
    'PAYDUNYA-PUBLIC-KEY':  process.env.PAYDUNYA_PUBLIC_KEY  ?? '',
  };
}

export interface PaydunyaCheckoutRequest {
  amount:          number;
  description:     string;
  organizationId:  string;
  plan:            string;
  returnUrl:       string;
  cancelUrl:       string;
  callbackUrl:     string;
}

export interface PaydunyaCheckoutResponse {
  response_code:  string;
  response_text:  string;
  description:    string;
  token:          string;
  invoice_url:    string;
}

export interface PaydunyaConfirmResponse {
  status:       string;
  custom_data:  Record<string, string>;
}

export async function createCheckout(req: PaydunyaCheckoutRequest): Promise<PaydunyaCheckoutResponse> {
  const body = {
    invoice: { total_amount: req.amount, description: req.description },
    store:   { name: 'Teranga Align', tagline: 'RH Aligné, Équipe Performante' },
    actions: {
      cancel_url:   req.cancelUrl,
      return_url:   req.returnUrl,
      callback_url: req.callbackUrl,
    },
    custom_data: { organization_id: req.organizationId, plan: req.plan },
  };

  const res = await fetch(`${BASE_URL}/checkout-invoice/create`, {
    method:  'POST',
    headers: pdHeaders(),
    body:    JSON.stringify(body),
  });
  return res.json() as Promise<PaydunyaCheckoutResponse>;
}

export async function confirmCheckout(token: string): Promise<PaydunyaConfirmResponse> {
  const res = await fetch(`${BASE_URL}/checkout-invoice/confirm/${token}`, {
    headers: pdHeaders(),
  });
  return res.json() as Promise<PaydunyaConfirmResponse>;
}

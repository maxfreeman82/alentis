'use client';

import { useState } from 'react';

interface Props {
  plan: 'pro' | 'enterprise';
  label: string;
  disabled?: boolean;
}

export function PlanButton({ plan, label, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/payments/paydunya/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan }),
      });
      const data = await res.json() as { checkout_url?: string; error?: string };
      if (!res.ok || !data.checkout_url) {
        setError(data.error ?? 'Erreur de paiement');
        return;
      }
      window.location.href = data.checkout_url;
    } catch {
      setError('Erreur réseau — réessayez');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={disabled ?? loading}
        className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-emerald text-white hover:bg-emerald/90 active:scale-[0.98]"
      >
        {loading ? 'Redirection…' : label}
      </button>
      {error && <p className="text-rose text-xs mt-2 text-center">{error}</p>}
    </div>
  );
}

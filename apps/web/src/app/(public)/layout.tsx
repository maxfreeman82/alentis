import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-slate-600">
      <header className="border-b border-slate-200 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-slate-900 font-bold text-lg">Teranga</span>
          <span className="text-emerald font-bold text-lg">Align</span>
        </Link>
        <Link href="/sign-in" className="text-sm text-slate-400 hover:text-slate-800 transition-colors">
          Espace entreprise →
        </Link>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-10">{children}</main>
      <footer className="text-center text-slate-700 text-xs py-8">
        Teranga Align © 2026 · Votre carrière, votre impact
      </footer>
    </div>
  );
}

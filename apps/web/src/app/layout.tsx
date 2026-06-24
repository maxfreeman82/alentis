import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Teranga Align — Le moteur d\'alignement stratégique',
  description: 'Le moteur d\'alignement stratégique du travail en Afrique',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className="font-body antialiased bg-bg text-slate-100">
        {children}
      </body>
    </html>
  );
}

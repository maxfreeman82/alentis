import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ScoreColor } from '@teranga/scoring';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Retourne la classe Tailwind text-* selon la couleur du score
export function scoreTextClass(color: ScoreColor): string {
  const map: Record<ScoreColor, string> = {
    emerald: 'text-emerald',
    sky:     'text-sky',
    amber:   'text-amber',
    rose:    'text-rose',
  };
  return map[color];
}

// Retourne la couleur hex selon la couleur du score
export function scoreHex(color: ScoreColor): string {
  const map: Record<ScoreColor, string> = {
    emerald: '#10B981',
    sky:     '#0EA5E9',
    amber:   '#F59E0B',
    rose:    '#F43F5E',
  };
  return map[color];
}

// Formate un score 0-100 en pourcentage ou valeur brute
export function formatScore(value: number, suffix = ''): string {
  return `${Math.round(value)}${suffix}`;
}

// Formate un montant en FCFA
export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount);
}

// Génère un ID Passport unique
export function generatePassportId(country = 'SN'): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `TP-${year}-${random}-${country}`;
}

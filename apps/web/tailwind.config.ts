import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Backgrounds (light theme) ──────────────────────────────────────
        bg: {
          DEFAULT: '#F0F4FC',
          card:    '#FFFFFF',
          surface: '#F8FAFF',
          raised:  '#EEF2FF',
        },
        // ── Primary brand — Violet (toute l'échelle redéfinie)
        // text-emerald, bg-emerald, text-emerald-400… → violet automatiquement
        emerald: {
          DEFAULT: '#6336F1',
          dark:    '#5B21B6',
          50:  '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        amber: {
          DEFAULT: '#F59E0B',
        },
        // ── Accents sémantiques ───────────────────────────────────────────
        violet:  '#8B5CF6',
        sky:     '#0EA5E9',
        rose:    '#F43F5E',
        orange:  '#F97316',
        cyan:    '#06B6D4',
        lime:    '#84CC16',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body:    ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        xl: '12px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(99,54,241,0.04), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 16px rgba(99,54,241,0.10), 0 1px 4px rgba(0,0,0,0.06)',
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

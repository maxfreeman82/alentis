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
        // Backgrounds
        bg: {
          DEFAULT: '#060B18',
          card:    '#0C1324',
          surface: '#111D35',
          raised:  '#162040',
        },
        // Brand
        emerald: {
          DEFAULT: '#10B981',
          dark:    '#059669',
        },
        amber: {
          DEFAULT: '#F59E0B',
        },
        // Accents sémantiques
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
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'stagger':    'stagger 0.1s ease-out',
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

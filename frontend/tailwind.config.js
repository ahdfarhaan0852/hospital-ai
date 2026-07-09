/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      colors: {
        gdsk: {
          forest: '#006837',
          middle: '#009245',
          leaf: '#4EBF3B',
          soft: '#92D050',
          dark: '#041c0e',
        },
        slate: {
          50: '#0f172a',
          100: '#1e293b',
          200: '#334155',
          300: '#475569',
          400: '#64748b',
          500: '#94a3b8',
          600: '#cbd5e1',
          700: '#cbd5e1',
          800: '#e2e8f0',
          900: '#f1f5f9',
          950: '#ffffff',
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 104, 55, 0.04)',
        'glass-accent': '0 8px 32px 0 rgba(78, 191, 59, 0.08)',
      }
    },
  },
  plugins: [],
}

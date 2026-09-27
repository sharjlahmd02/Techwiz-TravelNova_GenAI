/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        black: '#0A0A0A',
        link: { DEFAULT: '#2563EB', hover: '#1D4ED8' },
        p0: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', dot: '#EF4444' },
        p1: { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', dot: '#F59E0B' },
        p2: { bg: '#F4F4F5', border: '#D4D4D8', text: '#52525B', dot: '#A1A1AA' },
        p3: { bg: '#FAFAFA', border: '#E4E4E7', text: '#A1A1AA', dot: '#D4D4D8' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'Cascadia Code', 'Fira Code', 'monospace'],
      },
      fontSize: {
        xs: ['11px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '20px' }],
        base: ['14px', { lineHeight: '22px' }],
        md: ['15px', { lineHeight: '24px' }],
        lg: ['17px', { lineHeight: '26px', fontWeight: '500' }],
        xl: ['20px', { lineHeight: '28px', fontWeight: '700', letterSpacing: '-0.01em' }],
        '2xl': ['24px', { lineHeight: '32px', fontWeight: '700', letterSpacing: '-0.01em' }],
        '3xl': ['30px', { lineHeight: '38px', fontWeight: '800', letterSpacing: '-0.02em' }],
        '4xl': ['40px', { lineHeight: '46px', fontWeight: '800', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '8px',
        full: '9999px',
      },
    },
    // Full replace, not extend -- v2 intentionally allows only two shadows in the whole
    // app (modals, dropdowns/popovers); cards/buttons/stat-cards get none, ever.
    boxShadow: {
      none: 'none',
      modal: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)',
      dropdown: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)',
    },
  },
  plugins: [require('@tailwindcss/forms')],
}

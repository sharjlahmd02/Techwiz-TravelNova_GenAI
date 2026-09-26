/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        black: '#0A0A0A',
        accent: { DEFAULT: '#2563EB', light: '#EFF6FF', hover: '#1D4ED8' },
        p0: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', dot: '#EF4444' },
        p1: { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', dot: '#F59E0B' },
        p2: { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB', dot: '#3B82F6' },
        p3: { bg: '#F4F4F5', border: '#D4D4D8', text: '#52525B', dot: '#A1A1AA' },
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
        lg: ['17px', { lineHeight: '26px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '38px' }],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)',
        lg: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}

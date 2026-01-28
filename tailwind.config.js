const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  corePlugins: {
    preflight: false
  },
  content: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'pages/**/*.{ts,tsx}'
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        'brand-black': '#000000',
        'brand-white': '#ffffff',
        'brand-charcoal': '#0c0c0c',
        'brand-ink': '#151515',
        'brand-steel': '#a5a5a5',
        'brand-mist': '#b7b7b7',
        'brand-smoke': '#8e8e8e'
      },
      fontFamily: {
        sans: ['montserrat-regular', ...fontFamily.sans],
        display: ['montserrat-bold', ...fontFamily.sans],
        serif: ['librebaskerville-regular', ...fontFamily.serif]
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
};

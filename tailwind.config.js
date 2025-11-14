/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        mobile: '480px',
        notebook: '1024px',
        computer: '1440px',
      },
      colors: {
        'border-main': 'var(--color-border-main)',
        'bg-main': 'var(--color-bg-main)',
        'text-main': 'var(--color-text-main)',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}', // Add this line
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
  // Add this to prevent purging during development
  safelist: [
    'bg-gradient-to-br',
    'from-purple-50',
    'to-indigo-100',
    'bg-indigo-600',
    'text-white',
    'rounded-2xl',
    'shadow-sm'
  ]
}
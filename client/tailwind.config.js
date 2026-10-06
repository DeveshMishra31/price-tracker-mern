/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#2563EB',
          sky: '#38BDF8',
          green: '#10B981',
          mint: '#34D399',
          darkBg: '#0F172A',
          darkCard: '#1E293B',
        }
      }
    },
  },
  plugins: [],
}
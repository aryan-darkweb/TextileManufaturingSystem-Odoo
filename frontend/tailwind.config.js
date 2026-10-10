/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm purple & soft lavender ERP color system
        purple: {
          50: '#FAF7FC',  // soft background
          100: '#EEE5F7', // soft lavender
          200: '#DFD1F2',
          300: '#C7B1E6',
          400: '#A37FD1',
          500: '#7950A8', // primary warm royal purple
          600: '#674191',
          700: '#503568', // deep plum / deep purple
          800: '#3D2850',
          900: '#292235', // main text / dark plum
          950: '#1A1422',
        },
        plum: {
          deep: '#503568',
          mid: '#674191',
          royal: '#7950A8',
          lavender: '#EEE5F7',
          soft: '#FAF7FC',
        },
        surface: {
          bg: '#FAF7FC',
          card: '#FFFFFF',
          border: '#E8DFEF',
          muted: '#F3EEF8',
        },
        text: {
          main: '#292235',
          muted: '#766D82',
          light: '#A59CAD',
        }
      }
    },
  },
  plugins: [],
}

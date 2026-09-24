/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // One modern Arabic-first sans for the whole app (includes Latin glyphs and clear numerals)
        sans: ['"Readex Pro"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Single accent: cobalt blue, as one continuous scale
        primary: {
          50: '#eef3ff',
          100: '#dce6ff',
          200: '#b9cdff',
          300: '#8aa9ff',
          400: '#5a80f7',
          500: '#3a5ce8',
          600: '#2446d6',
          700: '#1c37b0',
          800: '#1b318c',
          900: '#1b2d6e',
          950: '#111b45',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 12px 32px -16px rgb(27 49 140 / 0.18)',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        serif: ['Noto Serif Arabic', 'Georgia', 'serif'],
      },
      colors: {
        primary: {
          50: '#f5f3ef',   // surface-container-low
          100: '#e4e2de',  // surface-container-highest
          200: '#b0f0d6',  // primary-fixed
          300: '#95d3ba',  // primary-fixed-dim
          400: '#80bea6',  // on-primary-container
          500: '#2b6954',  // surface-tint
          600: '#064e3b',  // primary-container
          700: '#003527',  // primary
          800: '#002117',  // on-primary-fixed
          900: '#1b1d0e',  // on-tertiary-fixed
          950: '#1b1c1a',  // on-surface
        },
      }
    },
  },
  plugins: [],
}

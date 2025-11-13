/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3b0270',
        accent: '#ff4e00',
        background: '#F9FAFB'
      },
      fontFamily: {
        sans: ['Satoshi', 'sans-serif'],
        heading: ['Satoshi', 'sans-serif']
      }
    }
  },
  plugins: []
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nus: {
          blue: '#003D7C',
          orange: '#EF7C00',
        }
      }
    },
  },
  plugins: [],
}

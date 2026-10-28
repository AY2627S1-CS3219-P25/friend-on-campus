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
          'blue-dark': '#002855',
          'blue-deep': '#001D3D',
          'blue-50': '#F0F4FA',
          'blue-100': '#DBE6F5',
          orange: '#EF7C00',
          'orange-hover': '#D96E00',
          'orange-50': '#FFF7ED',
          'orange-100': '#FFEDD5',
        }
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'elevated': '0 10px 25px -5px rgba(0, 40, 85, 0.08), 0 8px 10px -6px rgba(0, 40, 85, 0.04)',
      }
    },
  },
  plugins: [],
}

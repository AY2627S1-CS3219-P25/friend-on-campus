/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-11-06
 * Scope: Redesigned student-app design system tokens: added NUS brand shades, luminous shadows, subtle glow filters, and smooth micro-interaction animations.
 * Author review: <to be completed by yanhwee>
 */
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
          'blue-hover': '#003063',
          'blue-dark': '#002855',
          'blue-deep': '#001D3D',
          'blue-50': '#F0F4FA',
          'blue-100': '#DBE6F5',
          'blue-200': '#B8CEEB',
          orange: '#EF7C00',
          'orange-hover': '#D96E00',
          'orange-50': '#FFF7ED',
          'orange-100': '#FFEDD5',
          'orange-200': '#FED7AA',
        }
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        'card': '0 2px 8px -2px rgba(0, 40, 85, 0.06), 0 1px 4px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 12px 28px -6px rgba(0, 40, 85, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.05)',
        'elevated': '0 10px 25px -5px rgba(0, 40, 85, 0.08), 0 8px 10px -6px rgba(0, 40, 85, 0.04)',
        'glow-orange': '0 0 20px -3px rgba(239, 124, 0, 0.35)',
        'glow-blue': '0 0 20px -3px rgba(0, 61, 124, 0.25)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}


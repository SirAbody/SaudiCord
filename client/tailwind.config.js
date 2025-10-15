/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom dark theme colors
        dark: {
          100: '#1e1e1e',
          200: '#2a2a2a',
          300: '#363636',
          400: '#424242',
          500: '#4e4e4e',
          600: '#5a5a5a',
          700: '#666666',
          800: '#727272',
          900: '#7e7e7e',
        },
        // Kick Green accent colors
        accent: {
          DEFAULT: '#53FC18',
          dark: '#2AB600',
          light: '#6FFF3B',
          hover: '#3DD80A',
        },
        // Primary green colors (Kick brand)
        primary: {
          DEFAULT: '#53FC18',
          50: 'rgba(83, 252, 24, 0.05)',
          100: 'rgba(83, 252, 24, 0.1)',
          200: 'rgba(83, 252, 24, 0.2)',
          300: 'rgba(83, 252, 24, 0.3)',
          400: '#8FFF5F',
          500: '#53FC18',
          600: '#3DD80A',
          700: '#2AB600',
          800: '#1F7A00',
          900: '#165700',
        },
        // Background colors for dark theme
        background: {
          primary: '#0a0a0a',
          secondary: '#141414',
          tertiary: '#1e1e1e',
        },
        // Text colors for dark theme
        text: {
          primary: '#ffffff',
          secondary: '#b3b3b3',
          tertiary: '#808080',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

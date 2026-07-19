import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7C3AED',
          hover: '#6D28D9',
          light: '#EDE9FE',
          dark: '#5B21B6',
        },
        surface: {
          DEFAULT: '#1A1A1A',
          hover: '#242424',
          elevated: '#2E2E2E',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#A1A1AA',
          muted: '#52525B',
        },
        success: {
          DEFAULT: '#22C55E',
          bg: '#052E16',
        },
        warning: {
          DEFAULT: '#F59E0B',
          bg: '#1C1004',
        },
        error: {
          DEFAULT: '#EF4444',
          bg: '#1C0505',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(124,58,237,0.3)',
        'glow-success': '0 0 20px rgba(34,197,94,0.3)',
        'glow-error': '0 0 20px rgba(239,68,68,0.3)',
      },
      animation: {
        'scan-pulse': 'scanPulse 0.5s ease-in-out',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.25s ease-out',
      },
      keyframes: {
        scanPulse: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

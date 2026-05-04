import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          green: {
            DEFAULT: '#1A3A2A',
            mid: '#2D6A4F',
            light: '#52B788',
            lighter: '#D8F3DC',
          },
          gold: {
            DEFAULT: '#C9A84C',
            light: '#F5E6C0',
          },
        },
        onyx: '#1C1C1E',
        ivory: '#F8F6F2',
        slate: '#3D4F5C',
        silver: '#8A9BA8',
        divider: '#D1C9B8',
      },
      fontFamily: {
        heading: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'rank-up': 'rankUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'badge-pop': 'badgePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'gold-pulse': 'goldPulse 2s ease-in-out infinite',
        'mpesa-ring': 'mpesaRing 1.5s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s linear infinite',
      },
      keyframes: {
        rankUp: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        badgePop: { '0%': { transform: 'scale(0)', opacity: '0' }, '80%': { transform: 'scale(1.2)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        goldPulse: { '0%, 100%': { boxShadow: '0 0 0 0 rgba(201,168,76,0.4)' }, '50%': { boxShadow: '0 0 0 8px rgba(201,168,76,0)' } },
        mpesaRing: { '0%, 100%': { boxShadow: '0 0 0 0 rgba(0,156,58,0.5)' }, '50%': { boxShadow: '0 0 0 10px rgba(0,156,58,0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      backgroundImage: {
        'shimmer-gradient': 'linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.06) 50%, transparent 75%)',
        'gold-gradient': 'linear-gradient(135deg, #C9A84C 0%, #F5E6C0 50%, #C9A84C 100%)',
        'green-gradient': 'linear-gradient(135deg, #1A3A2A 0%, #2D6A4F 100%)',
      },
      backdropBlur: { xs: '2px' },
      screens: { xs: '375px' },
    },
  },
  plugins: [],
}

export default config

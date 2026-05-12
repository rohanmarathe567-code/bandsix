import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0a0a0a',
          surface: '#121212',
          card: '#181818',
          elevated: '#212121',
        },
        border: {
          DEFAULT: '#262626',
          subtle: '#1c1c1c',
          strong: '#333333',
        },
        primary: {
          DEFAULT: '#3b82f6',
          light: '#60a5fa',
          dark: '#2563eb',
          glow: 'rgba(59,130,246,0.15)',
        },
        accent: {
          DEFAULT: '#f59e0b',
          light: '#fbbf24',
          glow: 'rgba(245,158,11,0.15)',
        },
        text: {
          primary: '#f1f5f9',
          secondary: '#94a3b8',
          muted: '#64748b',
        },
        band6: '#10b981',
        rank: {
          gold: '#f59e0b',
          silver: '#94a3b8',
          bronze: '#b45309',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-card': 'linear-gradient(135deg, rgba(59,130,246,0.04) 0%, rgba(245,158,11,0.04) 100%)',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.25)',
        glow: '0 0 20px rgba(59,130,246,0.25)',
        'glow-accent': '0 0 20px rgba(245,158,11,0.25)',
        'rank-gold': '0 0 12px rgba(245,158,11,0.4)',
        'rank-silver': '0 0 12px rgba(148,163,184,0.3)',
        'rank-bronze': '0 0 12px rgba(180,83,9,0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        shimmer: 'shimmer 2s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
}

export default config

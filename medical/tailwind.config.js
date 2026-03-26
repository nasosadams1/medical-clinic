/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.25rem',
        lg: '1.75rem',
        xl: '2.25rem',
      },
      screens: {
        '2xl': '1560px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Space Grotesk"', '"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        xp: {
          DEFAULT: 'hsl(var(--xp))',
          foreground: 'hsl(var(--xp-foreground))',
        },
        coins: {
          DEFAULT: 'hsl(var(--coins))',
          foreground: 'hsl(var(--coins-foreground))',
        },
        hearts: {
          DEFAULT: 'hsl(var(--hearts))',
          foreground: 'hsl(var(--hearts-foreground))',
        },
        streak: {
          DEFAULT: 'hsl(var(--streak))',
          foreground: 'hsl(var(--streak-foreground))',
        },
        rank: {
          gold: 'hsl(var(--rank-gold))',
          silver: 'hsl(var(--rank-silver))',
          bronze: 'hsl(var(--rank-bronze))',
        },
        duel: {
          win: 'hsl(var(--duel-win))',
          loss: 'hsl(var(--duel-loss))',
          draw: 'hsl(var(--duel-draw))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        glow: 'var(--shadow-glow)',
        card: 'var(--shadow-card)',
        elevated: 'var(--shadow-elevated)',
      },
      backgroundImage: {
        'gradient-hero': 'var(--gradient-hero)',
        'gradient-card-glow': 'var(--gradient-card-glow)',
        'gradient-xp': 'var(--gradient-xp)',
        'gradient-coins': 'var(--gradient-coins)',
        'gradient-rank': 'var(--gradient-rank)',
        'gradient-duel': 'var(--gradient-duel)',
        'gradient-surface': 'var(--gradient-surface)',
      },
    },
  },
  plugins: [],
};

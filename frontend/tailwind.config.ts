import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#fbf6f4',
        card: '#ffffff',
        ink: '#1f1416',
        'ink-soft': '#4a3236',
        mute: '#8a7378',
        accent: '#d96962',
        'accent-dark': '#b94a44',
        'accent-soft': '#fbe4e0',
        success: '#3a8b3a',
        danger: '#b54141',
        divider: 'rgba(31,20,22,0.08)',
      },
      fontFamily: {
        body: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: ['11px', { lineHeight: '1.45' }],
        sm: ['12px', { lineHeight: '1.45' }],
        base: ['14px', { lineHeight: '1.5' }],
        lg: ['17px', { lineHeight: '1.45' }],
        xl: ['22px', { lineHeight: '1.3', letterSpacing: '-0.2px' }],
        '2xl': ['26px', { lineHeight: '1.2', letterSpacing: '-0.4px' }],
        '3xl': ['30px', { lineHeight: '1.15', letterSpacing: '-0.6px' }],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '14px',
        '3xl': '16px',
        full: '999px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,0.08)',
        md: '0 4px 16px rgba(0,0,0,0.06)',
        coral: '0 8px 20px rgba(251,228,224,0.6)',
      },
      backgroundImage: {
        'coral-grad': 'linear-gradient(135deg, #d96962, #b94a44)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
} satisfies Config;

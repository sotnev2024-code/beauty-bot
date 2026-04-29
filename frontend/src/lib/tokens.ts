/**
 * HYB design tokens · "D · Коралл + сетка".
 * Mirror of tailwind.config.ts. Use Tailwind classes by default.
 * Use this object only for dynamic values (recharts colors, inline styles).
 */
export const HYB = {
  colors: {
    bg: '#fbf6f4',
    card: '#ffffff',
    ink: '#1f1416',
    inkSoft: '#4a3236',
    mute: '#8a7378',
    accent: '#d96962',
    accentDark: '#b94a44',
    accentSoft: '#fbe4e0',
    success: '#3a8b3a',
    danger: '#b54141',
    divider: 'rgba(31,20,22,0.08)',
  },
  font: {
    body: 'Manrope, system-ui, -apple-system, sans-serif',
    display: 'Fraunces, Georgia, serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 10,
    xl: 12,
    '2xl': 14,
    '3xl': 16,
    full: 999,
  },
  shadow: {
    sm: '0 1px 3px rgba(0,0,0,0.08)',
    md: '0 4px 16px rgba(0,0,0,0.06)',
    coral: '0 8px 20px rgba(251,228,224,0.6)',
  },
  gradient: {
    coral: 'linear-gradient(135deg, #d96962, #b94a44)',
  },
} as const;

export type HYBTokens = typeof HYB;

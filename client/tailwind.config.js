/** @type {import('tailwindcss').Config} */
// Semantic layer only — every value resolves to a CSS custom property defined in
// src/index.css. Components use these names (bg-surface, text-signal, rounded-card,
// gap-md, duration-fast); no raw hex/px/ms in component files.
const withAlpha = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: withAlpha('--color-background'),
        // panel opacity is centrally adjustable via --surface-alpha
        surface: 'rgb(var(--color-surface) / var(--surface-alpha))',
        'surface-2': withAlpha('--color-surface-2'),
        line: withAlpha('--color-border'),
        content: withAlpha('--color-text-primary'),
        muted: withAlpha('--color-text-muted'),
        signal: withAlpha('--color-signal'),
        'signal-ink': withAlpha('--color-signal-ink'),
        status: {
          drafting: withAlpha('--color-status-drafting'),
          applied: withAlpha('--color-status-applied'),
          'phone-screen': withAlpha('--color-status-phone-screen'),
          technical: withAlpha('--color-status-technical'),
          panel: withAlpha('--color-status-panel'),
          offer: withAlpha('--color-status-offer'),
          accepted: withAlpha('--color-status-accepted'),
          rejected: withAlpha('--color-status-rejected'),
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
        pill: 'var(--radius-pill)',
      },
      spacing: {
        '2xs': 'var(--space-2xs)',
        xs: 'var(--space-xs)',
        sm: 'var(--space-sm)',
        md: 'var(--space-md)',
        lg: 'var(--space-lg)',
        xl: 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
      },
      boxShadow: {
        lift: 'var(--shadow-lift)',
      },
      zIndex: {
        overlay: 'var(--z-overlay)',
        toast: 'var(--z-toast)',
      },
      opacity: {
        dragging: 'var(--opacity-dragging)',
      },
      scale: {
        lift: 'var(--scale-lift)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        slow: 'var(--duration-slow)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        standard: 'var(--ease-standard)',
      },
    },
  },
  plugins: [],
};

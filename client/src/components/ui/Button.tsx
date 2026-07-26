import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
};

// min-h-11 = 44px (Tailwind scale) → meets the touch-target floor. Transitions
// are plain CSS (transform/color/border) — GPU-friendly, reduced-motion-safe.
const base =
  'inline-flex min-h-11 select-none items-center justify-center gap-xs rounded-control px-md text-sm font-medium ' +
  'transition-[background-color,border-color,color,box-shadow,transform] duration-fast ease-out ' +
  'active:translate-y-px disabled:pointer-events-none disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary: 'bg-signal text-signal-ink hover:brightness-110',
  ghost:
    'border border-line bg-surface-2 text-content hover:border-signal/50 hover:text-content',
  danger:
    'border border-status-rejected/40 bg-transparent text-status-rejected hover:bg-status-rejected/10',
};

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  className = '',
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      className={`${base} ${variants[variant]} ${className}`}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="size-3.5 animate-spin rounded-pill border-2 border-current border-r-transparent opacity-70"
        />
      )}
      {children}
    </button>
  );
}

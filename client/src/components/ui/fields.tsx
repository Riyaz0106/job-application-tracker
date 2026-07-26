import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

// Shared control styling. min-h-11 = 44px touch target. Focus + invalid states
// are token-driven CSS (no JS). aria-invalid drives the error border.
const control =
  'w-full min-h-11 rounded-control border border-line bg-surface-2 px-sm py-2 text-sm text-content ' +
  'placeholder:text-muted transition-[border-color,box-shadow] duration-fast ' +
  'focus:outline-none focus-visible:border-signal focus-visible:ring-2 focus-visible:ring-signal/30 ' +
  'aria-[invalid=true]:border-status-rejected disabled:opacity-50';

// Field: label + control + inline hint/error, wired for a11y (aria-describedby
// is set by the caller pointing at `${id}-error`).
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2xs">
      <label
        htmlFor={htmlFor}
        className="font-mono text-xs uppercase tracking-wide text-muted"
      >
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="text-xs text-status-rejected"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput({
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${control} ${className}`} {...rest} />;
}

export function TextArea({
  className = '',
  rows = 4,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={rows}
      className={`${control} resize-y leading-relaxed ${className}`}
      {...rest}
    />
  );
}

// Native select — most accessible + touch-native option (mobile shows the OS
// picker, 44px for free). Styled trigger with a chevron drawn via CSS token color.
export function Select({
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={`${control} cursor-pointer appearance-none pr-8 ${className}`}
        {...rest}
      >
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-sm top-1/2 -translate-y-1/2 text-muted"
      >
        ▾
      </span>
    </div>
  );
}

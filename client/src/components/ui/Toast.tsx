import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { durationMs } from '../../lib/motion';
import {
  ToastContext,
  type ToastApi,
  type ToastVariant as Variant,
} from './toastContext';

// Single toast system for the whole app. Colours come from the existing ramp:
// success = status-accepted, error = status-rejected. No new colours.
type Toast = {
  id: number;
  variant: Variant;
  message: string;
  leaving: boolean;
};

// How long a toast lingers before auto-dismissing. Errors stay longer because
// they carry an instruction the reader has to act on.
const AUTO_DISMISS_MS: Record<Variant, number> = {
  success: 4000,
  error: 7000,
};

// Toasts sit in the ~35px band between the header and the funnel panel, so the
// stack is laid out as a single non-wrapping ROW: several at once grow sideways,
// never downwards over the funnel signature. Two is the practical width limit
// before messages get cramped; a third arriving drops the oldest.
const MAX_VISIBLE = 2;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());

  // Two-step removal: mark `leaving` so the CSS leave animation can play, then
  // drop it from state once that animation has finished.
  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((list) =>
      list.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
    );
    window.setTimeout(
      () => setToasts((list) => list.filter((t) => t.id !== id)),
      durationMs('base'),
    );
  }, []);

  const push = useCallback(
    (variant: Variant, message: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, variant, message, leaving: false }]);
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS[variant]),
      );
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
    }),
    [push],
  );

  const visible = toasts.slice(-MAX_VISIBLE);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        // Top of the viewport, centred over the header band. pointer-events-none
        // on the container so toasts never block the UI underneath; each toast
        // re-enables them for its own close button.
        <div
          className="pointer-events-none fixed inset-x-0 top-sm z-toast flex flex-nowrap items-start justify-center gap-xs px-md"
          // aria-live so screen readers announce toasts as they arrive. The
          // region is always mounted (announcements only work if it pre-exists).
          role="status"
          aria-live="polite"
          aria-atomic="false"
        >
          {visible.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  const accent =
    toast.variant === 'success'
      ? 'border-status-accepted/40 text-status-accepted'
      : 'border-status-rejected/40 text-status-rejected';

  return (
    <div
      className={`pointer-events-auto flex min-w-0 flex-1 items-start gap-sm rounded-control border bg-surface-2 px-sm py-xs shadow-lift sm:max-w-sm sm:flex-none ${accent} ${
        toast.leaving ? 'toast-leave' : 'toast-enter'
      }`}
    >
      <span aria-hidden className="mt-px font-mono text-xs">
        {toast.variant === 'success' ? '✓' : '!'}
      </span>
      {/* Clamped to two lines: keeps the row short enough to clear the funnel. */}
      <p className="line-clamp-2 min-w-0 flex-1 text-sm text-content">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="-my-xs -mr-2xs flex size-11 shrink-0 items-center justify-center rounded-control text-muted transition-colors duration-fast hover:text-content"
      >
        ✕
      </button>
    </div>
  );
}

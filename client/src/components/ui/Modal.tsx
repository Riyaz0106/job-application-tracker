import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { tween } from '../../lib/motion';
import { Button } from './Button';

type Side = 'center' | 'right';

function getFocusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  const sel =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(root.querySelectorAll<HTMLElement>(sel)).filter(
    (el) => el.offsetParent !== null,
  );
}

// Accessible modal / slide-over. Framer Motion handles enter/leave (the second
// and last place motion is used); everything else is CSS. Focus is trapped while
// open, restored on close; Escape and backdrop click close; body scroll locks.
export function Modal({
  open,
  onClose,
  title,
  children,
  side = 'center',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: Side;
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    restoreFocus.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => {
      const focusable = getFocusable(panelRef.current);
      (focusable[0] ?? panelRef.current)?.focus();
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      restoreFocus.current?.focus?.();
    };
  }, [open]);

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = getFocusable(panelRef.current);
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const container =
    side === 'right'
      ? 'absolute inset-y-0 right-0 flex'
      : 'absolute inset-0 flex items-center justify-center p-md';
  const panelBox =
    side === 'right'
      ? 'h-full w-full max-w-md'
      : 'max-h-full w-full max-w-lg rounded-card';
  const panelMotion = reduce
    ? {}
    : side === 'right'
      ? { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } }
      : {
          initial: { opacity: 0, scale: 0.96, y: 8 },
          animate: { opacity: 1, scale: 1, y: 0 },
          exit: { opacity: 0, scale: 0.98, y: 8 },
        };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" onKeyDown={onKeyDown}>
          <motion.div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={onClose}
            initial={reduce ? false : { opacity: 0 }}
            animate={reduce ? {} : { opacity: 1 }}
            exit={reduce ? {} : { opacity: 0 }}
            transition={tween('fast')}
          />
          <div className={container}>
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              className={`relative z-10 flex flex-col overflow-hidden border-line bg-surface ${side === 'right' ? 'border-l' : 'border'} ${panelBox}`}
              transition={tween('base')}
              {...panelMotion}
            >
              <header className="flex items-center justify-between gap-md border-b border-line px-lg py-md">
                <h2
                  id={titleId}
                  className="font-mono text-sm uppercase tracking-wide text-content"
                >
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex size-11 items-center justify-center rounded-control text-muted transition-colors duration-fast hover:text-content"
                >
                  ✕
                </button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto px-lg py-lg">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// Confirmation dialog built on Modal — used for destructive actions.
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm leading-relaxed text-content">{message}</p>
      <div className="mt-lg flex justify-end gap-sm">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

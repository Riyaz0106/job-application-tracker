import type { ReactNode } from 'react';
import { statusColor, STATUS_LABEL, type Status } from '../../lib/status';

// Inline error banner. States what went wrong; callers phrase the "how to fix".
export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-control border border-status-rejected/40 bg-status-rejected/10 px-sm py-2 text-sm text-status-rejected"
    >
      {children}
    </div>
  );
}

// Small dot in the status color (data-driven → inline token reference).
export function StatusDot({
  status,
  className = '',
}: {
  status: Status;
  className?: string;
}) {
  return (
    <span
      className={`inline-block size-2 shrink-0 rounded-pill ${className}`}
      style={{ backgroundColor: statusColor(status) }}
      aria-hidden
    />
  );
}

// Status label with a leading dot (used in menus, detail header).
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className="inline-flex items-center gap-2xs font-mono text-xs uppercase tracking-wide text-content">
      <StatusDot status={status} />
      {STATUS_LABEL[status]}
    </span>
  );
}

// Compact match score: number in a ring that fills proportionally (signal arc on
// a line-colored track). Number + subtle ring, per the design — no radial gauge.
export function MatchRing({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <span
      className="relative inline-flex size-8 items-center justify-center"
      title={`Match score ${pct}/100`}
      aria-label={`Match score ${pct} out of 100`}
    >
      <span
        className="absolute inset-0 rounded-pill"
        style={{
          background: `conic-gradient(rgb(var(--color-signal)) ${pct}%, rgb(var(--color-border)) ${pct}%)`,
        }}
      />
      <span className="absolute inset-0.5 rounded-pill bg-surface-2" />
      <span className="relative font-mono text-xs font-medium text-content">
        {pct}
      </span>
    </span>
  );
}

// Subtle loading placeholder. animate-pulse is CSS (degrades under
// prefers-reduced-motion via the global rule).
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <span
      className={`block animate-pulse rounded-control bg-surface-2 ${className}`}
    />
  );
}

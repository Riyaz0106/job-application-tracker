// Status metadata — the single client-side source for labels, board order, and
// the (data-driven) status colors. The 8 statuses mirror the Prisma `Status`
// enum / the server's Zod enum.

export const STATUSES = [
  'DRAFTING',
  'APPLIED',
  'PHONE_SCREEN',
  'TECHNICAL',
  'PANEL',
  'OFFER',
  'REJECTED',
  'ACCEPTED',
] as const;

export type Status = (typeof STATUSES)[number];

// Column order on the board (the funnel left-to-right).
export const STATUS_ORDER: readonly Status[] = STATUSES;

export const STATUS_LABEL: Record<Status, string> = {
  DRAFTING: 'Drafting',
  APPLIED: 'Applied',
  PHONE_SCREEN: 'Phone screen',
  TECHNICAL: 'Technical',
  PANEL: 'Panel',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  ACCEPTED: 'Accepted',
};

// "Active" = still in flight (not a terminal outcome). Used by the funnel.
export const TERMINAL_STATUSES: readonly Status[] = ['REJECTED', 'ACCEPTED'];

// Derives the DEFAULT status for a new application from field completeness:
// everything that identifies a submitted application is present -> APPLIED,
// otherwise it's still a draft. Deliberately ignores salary / recruiter / notes
// / matchScore — those are enrichment, not evidence that you applied.
// This is only ever a default: an explicit choice in the form overrides it.
export function deriveDefaultStatus(fields: {
  company: string;
  role: string;
  jobDescription: string;
  appliedDate: string;
}): Status {
  const complete =
    fields.company.trim() !== '' &&
    fields.role.trim() !== '' &&
    fields.jobDescription.trim() !== '' &&
    fields.appliedDate.trim() !== '';
  return complete ? 'APPLIED' : 'DRAFTING';
}

// Data-driven colors resolve to the status tokens at runtime. Returning a
// token reference (not a hex) keeps colors centralized in index.css, and
// sidesteps Tailwind's static class scanner for these 8 dynamic values.
export function statusColor(status: Status, alpha = 1): string {
  const name = status.toLowerCase().replace(/_/g, '-'); // PHONE_SCREEN -> phone-screen
  return alpha === 1
    ? `rgb(var(--color-status-${name}))`
    : `rgb(var(--color-status-${name}) / ${alpha})`;
}
